"""
Analysis Router — The main endpoint that chains the full InnovX pipeline:
Idea → Structure → Search → Rank → Evidence → Feature Matrix
"""
import asyncio
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException

from models.schemas import (
    IdeaSubmission,
    StructuredIdea,
    FeatureMatrix,
    FeatureAnalysis,
    FeatureEvidence,
    CoverageLevel,
    AnalysisResponse,
    AssessmentScores,
    ScoreDetail,
    GuardrailValidationRequest,
    GuardrailValidationResponse,
    SearchMethodology,
    FeatureSearchAudit,
    ApiQueryAudit,
)
from services import structuring
from services import search_openalex
from services import search_arxiv
from services import search_patents
from services import similarity
from services import evidence
from services import provenance
from services import scoring
from services import report_gen
from services import guardrails
from services import grant_matcher
from pydantic import BaseModel

router = APIRouter()


class GrantMatchingRequest(BaseModel):
    title: str
    domain: str
    problem_statement: str
    proposed_solution: str
    key_features: list = []


@router.post("/grants")
async def match_grants(request: GrantMatchingRequest):
    """
    Match an innovation's technical domain and problem statement to Federal SBIR/STTR topics
    and specialized deep-tech venture capital funds.
    """
    return grant_matcher.match_grants_and_capital(
        title=request.title,
        domain=request.domain,
        problem_statement=request.problem_statement,
        proposed_solution=request.proposed_solution,
        key_features=request.key_features,
    )


@router.post("/validate", response_model=GuardrailValidationResponse)
async def validate_idea(submission: GuardrailValidationRequest):
    """
    Pre-flight evaluation of submission against edge-case guardrails
    (brevity, non-technical domains, and overly broad visions).
    """
    result = await guardrails.evaluate_submission(submission.raw_text)
    return GuardrailValidationResponse(**result)


@router.post("/structure", response_model=StructuredIdea)
async def structure_idea(submission: IdeaSubmission):
    """
    Step 1: Take raw idea text and decompose into structured technical features.
    """
    guardrail_eval = await guardrails.evaluate_submission(submission.raw_text)
    if not guardrail_eval.get("is_valid"):
        raise HTTPException(
            status_code=400,
            detail={
                "status": guardrail_eval.get("status"),
                "headline": guardrail_eval.get("headline"),
                "feedback_message": guardrail_eval.get("feedback_message"),
                "clarifying_questions": guardrail_eval.get("clarifying_questions", []),
                "suggested_template": guardrail_eval.get("suggested_template"),
                "detected_domain": guardrail_eval.get("detected_domain"),
            },
        )

    try:
        structured = await structuring.structure_idea(submission.raw_text)
        return structured
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Structuring failed: {str(e)}")


async def run_analysis_pipeline(raw_text: str, custom_innovation_id: str | None = None) -> dict:
    """
    Execute the full 10-step InnovX discovery & assessment pipeline.
    Reused by both initial discovery (/api/analyze) and version re-analysis (/api/innovations/{id}/reanalyze).
    """
    # Step 0: Guardrail Evaluation
    guardrail_eval = await guardrails.evaluate_submission(raw_text)
    if not guardrail_eval.get("is_valid"):
        raise HTTPException(
            status_code=400,
            detail={
                "status": guardrail_eval.get("status"),
                "headline": guardrail_eval.get("headline"),
                "feedback_message": guardrail_eval.get("feedback_message"),
                "clarifying_questions": guardrail_eval.get("clarifying_questions", []),
                "suggested_template": guardrail_eval.get("suggested_template"),
                "detected_domain": guardrail_eval.get("detected_domain"),
            },
        )

    innovation_id = custom_innovation_id or str(uuid.uuid4())

    # Step 1: Structure the idea
    structured = await structuring.structure_idea(raw_text)

    # Step 2: Search all sources for each feature with API health & query auditing
    api_health = {"openalex": "ok", "arxiv": "ok", "uspto": "ok"}
    feature_audits = []
    total_documents_scanned = 0
    feature_analyses = []

    for feature in structured.key_features:
        all_docs = []
        queries_run = []
        primary_query = feature.search_queries[0] if feature.search_queries else feature.description

        # Step 2: Concurrently query OpenAlex, arXiv, and USPTO for this feature (3x speedup)
        async def _query_openalex():
            try:
                res = await search_openalex.search_for_feature(
                    feature.description, feature.search_queries
                )
                return "openalex", res, None
            except Exception as e:
                return "openalex", [], str(e)

        async def _query_arxiv():
            try:
                res = await search_arxiv.search_for_feature(
                    feature.description, feature.search_queries
                )
                return "arxiv", res, None
            except Exception as e:
                return "arxiv", [], str(e)

        async def _query_uspto():
            try:
                res = await search_patents.search_for_feature(
                    feature.description, feature.search_queries
                )
                return "uspto", res, None
            except Exception as e:
                return "uspto", [], str(e)

        search_responses = await asyncio.gather(
            _query_openalex(),
            _query_arxiv(),
            _query_uspto(),
        )

        for src, res_list, err in search_responses:
            if err:
                print(f"[WARN] {src} search failed for {feature.id}: {err}")
                api_health[src] = "degraded"
                queries_run.append(
                    ApiQueryAudit(
                        source=src,
                        status="degraded",
                        query=primary_query,
                        results_count=0,
                        error_message=err,
                    )
                )
            else:
                all_docs.extend(res_list)
                queries_run.append(
                    ApiQueryAudit(
                        source=src,
                        status="ok",
                        query=primary_query,
                        results_count=len(res_list),
                    )
                )

        total_documents_scanned += len(all_docs)


        # Step 3: Hybrid Ranking with Reciprocal Rank Fusion (RRF, k=60)
        ranked_docs = similarity.reciprocal_rank_fusion(
            documents=all_docs,
            feature_text=feature.description,
            k=60,
            text_key="abstract",
            top_k=10,
        )

        # Step 4: Extract evidence for top 3 results
        if ranked_docs:
            ranked_docs = await evidence.extract_evidence_batch(
                feature.description,
                ranked_docs,
                top_k=3,
            )

        # Step 5: Build feature analysis with RRF ranks and similarity
        prior_art = []
        for doc in ranked_docs[:5]:
            prior_art.append(
                FeatureEvidence(
                    title=doc.get("title", "Untitled"),
                    source=doc.get("source", "openalex"),
                    similarity=round(doc.get("similarity_score", 0.0), 3),
                    evidence_sentence=doc.get("evidence_sentence"),
                    url=doc.get("url"),
                    rrf_score=doc.get("rrf_score"),
                    keyword_score=doc.get("keyword_score"),
                    rank_rrf=doc.get("rank_rrf"),
                    rank_semantic=doc.get("rank_semantic"),
                    rank_keyword=doc.get("rank_keyword"),
                )
            )

        coverage = _determine_coverage(ranked_docs)

        feature_analyses.append(
            FeatureAnalysis(
                id=feature.id,
                description=feature.description,
                prior_art=prior_art,
                coverage=coverage,
                total_matches=len(all_docs),
            )
        )

        feature_audits.append(
            FeatureSearchAudit(
                feature_id=feature.id,
                feature_description=feature.description,
                queries_run=queries_run,
                total_candidates_found=len(all_docs),
                total_after_fusion=len(ranked_docs),
            )
        )

    # Step 6: Build Search Methodology audit trail & Feature Matrix
    methodology = SearchMethodology(
        apis_queried=["OpenAlex (250M+ Academic Works)", "arXiv (Preprints)", "USPTO (US Patents)"],
        api_health=api_health,
        hybrid_fusion="Reciprocal Rank Fusion (RRF, k=60) combining Okapi BM25 and all-MiniLM-L6-v2 embeddings",
        total_documents_scanned=total_documents_scanned,
        feature_audits=feature_audits,
        timestamp=datetime.now(timezone.utc),
    )

    matrix = FeatureMatrix(
        innovation_id=innovation_id,
        title=structured.title,
        domain=structured.domain,
        features=feature_analyses,
        search_sources=["OpenAlex (250M+ academic works)", "arXiv (preprints)", "USPTO (US patents)"],
        search_timestamp=datetime.now(timezone.utc),
        methodology=methodology,
    )

    # Step 7: Create provenance record
    provenance_record = provenance.create_provenance_record(
        innovation_id=innovation_id,
        version=1,
        innovation_data={
            "raw_input": raw_text,
            "structured": structured.model_dump(),
        },
    )

    # Step 8: Compute assessment scores
    features_data = [fa.model_dump() for fa in feature_analyses]
    raw_scores = scoring.compute_all_scores(
        features_data,
        matrix.search_sources,
    )

    assessment_scores = AssessmentScores(
        prior_art_density=ScoreDetail(**raw_scores["prior_art_density"]),
        feature_novelty=ScoreDetail(**raw_scores["feature_novelty"]),
        combination_distinctiveness=ScoreDetail(**raw_scores["combination_distinctiveness"]),
        research_freshness=ScoreDetail(**raw_scores["research_freshness"]),
        evidence_strength=ScoreDetail(**raw_scores["evidence_strength"]),
        search_confidence=ScoreDetail(**raw_scores["search_confidence"]),
    )

    # Step 9: Generate AI assessment summary
    assessment_summary = await scoring.generate_assessment_summary(
        structured.model_dump(),
        raw_scores,
        features_data,
    )

    # Step 10: Generate full report
    report = report_gen.generate_report(
        innovation_id=innovation_id,
        raw_input=raw_text,
        structured_idea=structured.model_dump(),
        feature_matrix=matrix.model_dump(),
        scores=raw_scores,
        assessment_summary=assessment_summary,
        provenance=provenance_record.model_dump(),
    )

    # Cache report for retrieval
    from routers.report import cache_report
    cache_report(innovation_id, report)

    return {
        "innovation_id": innovation_id,
        "structured_idea": structured,
        "feature_matrix": matrix,
        "raw_scores": raw_scores,
        "assessment_scores": assessment_scores,
        "assessment_summary": assessment_summary,
        "report": report,
        "provenance_record": provenance_record,
        "methodology": methodology,
        "guardrail_result": GuardrailValidationResponse(**guardrail_eval),
    }


@router.post("", response_model=AnalysisResponse)
async def full_analysis(submission: IdeaSubmission):
    """
    Full analysis pipeline: Structure → Search → Rank → Evidence → Matrix → Provenance
    This is the core endpoint of InnovX.
    """
    try:
        res = await run_analysis_pipeline(submission.raw_text)
        return AnalysisResponse(
            innovation_id=res["innovation_id"],
            structured_idea=res["structured_idea"],
            feature_matrix=res["feature_matrix"],
            scores=res["assessment_scores"],
            assessment_summary=res["assessment_summary"],
            report=res["report"],
            provenance=res["provenance_record"],
            methodology=res.get("methodology"),
            guardrail_result=res.get("guardrail_result"),
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis pipeline failed: {str(e)}")




def _determine_coverage(ranked_docs: list[dict]) -> CoverageLevel:
    """Determine coverage level based on similarity scores of retrieved documents."""
    if not ranked_docs:
        return CoverageLevel.NONE

    top_score = ranked_docs[0].get("similarity_score", 0.0)

    # Count docs above thresholds
    high_matches = sum(1 for d in ranked_docs if d.get("similarity_score", 0) >= 0.6)

    if top_score >= 0.75 or high_matches >= 3:
        return CoverageLevel.HIGH
    elif top_score >= 0.55 or high_matches >= 1:
        return CoverageLevel.MEDIUM
    elif top_score >= 0.35:
        return CoverageLevel.LOW
    else:
        return CoverageLevel.NONE
