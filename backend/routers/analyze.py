"""
Analysis Router — The main endpoint that chains the full InnovX pipeline:
Idea → Structure → Search → Rank → Evidence → Feature Matrix
"""
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

router = APIRouter()


@router.post("/structure", response_model=StructuredIdea)
async def structure_idea(submission: IdeaSubmission):
    """
    Step 1: Take raw idea text and decompose into structured technical features.
    """
    try:
        structured = await structuring.structure_idea(submission.raw_text)
        return structured
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Structuring failed: {str(e)}")


@router.post("", response_model=AnalysisResponse)
async def full_analysis(submission: IdeaSubmission):
    """
    Full analysis pipeline: Structure → Search → Rank → Evidence → Matrix → Provenance

    This is the core endpoint of InnovX.
    """
    innovation_id = str(uuid.uuid4())[:8].upper()

    # Step 1: Structure the idea
    try:
        structured = await structuring.structure_idea(submission.raw_text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Structuring failed: {str(e)}")

    # Step 2: Search all sources for each feature
    feature_analyses = []

    for feature in structured.key_features:
        # Search all three sources in parallel-ish (sequential for simplicity in MVP)
        all_docs = []

        # OpenAlex
        try:
            openalex_results = await search_openalex.search_for_feature(
                feature.description, feature.search_queries
            )
            all_docs.extend(openalex_results)
        except Exception as e:
            print(f"OpenAlex search failed for {feature.id}: {e}")

        # arXiv
        try:
            arxiv_results = await search_arxiv.search_for_feature(
                feature.description, feature.search_queries
            )
            all_docs.extend(arxiv_results)
        except Exception as e:
            print(f"arXiv search failed for {feature.id}: {e}")

        # USPTO
        try:
            patent_results = await search_patents.search_for_feature(
                feature.description, feature.search_queries
            )
            all_docs.extend(patent_results)
        except Exception as e:
            print(f"USPTO search failed for {feature.id}: {e}")

        # Step 3: Rank by semantic similarity
        ranked_docs = similarity.rank_documents_for_feature(
            feature.description,
            all_docs,
            text_key="abstract",
            top_k=10,
        )

        # Step 4: Extract evidence for top 3 results (save API calls)
        if ranked_docs:
            ranked_docs = await evidence.extract_evidence_batch(
                feature.description,
                ranked_docs,
                top_k=3,
            )

        # Step 5: Build feature analysis
        prior_art = []
        for doc in ranked_docs[:5]:  # Top 5 per feature in the matrix
            prior_art.append(
                FeatureEvidence(
                    title=doc.get("title", "Untitled"),
                    source=doc.get("source", "openalex"),
                    similarity=round(doc.get("similarity_score", 0.0), 3),
                    evidence_sentence=doc.get("evidence_sentence"),
                    url=doc.get("url"),
                )
            )

        # Determine coverage level based on top similarity scores
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

    # Step 6: Build the feature matrix
    matrix = FeatureMatrix(
        innovation_id=innovation_id,
        title=structured.title,
        domain=structured.domain,
        features=feature_analyses,
        search_sources=["OpenAlex (250M+ academic works)", "arXiv (preprints)", "USPTO (US patents)"],
        search_timestamp=datetime.now(timezone.utc),
    )

    # Step 7: Create provenance record
    provenance_record = provenance.create_provenance_record(
        innovation_id=innovation_id,
        version=1,
        innovation_data={
            "raw_input": submission.raw_text,
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
        raw_input=submission.raw_text,
        structured_idea=structured.model_dump(),
        feature_matrix=matrix.model_dump(),
        scores=raw_scores,
        assessment_summary=assessment_summary,
        provenance=provenance_record.model_dump(),
    )

    # Cache report for retrieval via GET /api/report/{id}
    from routers.report import cache_report
    cache_report(innovation_id, report)

    return AnalysisResponse(
        innovation_id=innovation_id,
        structured_idea=structured,
        feature_matrix=matrix,
        scores=assessment_scores,
        assessment_summary=assessment_summary,
        report=report,
        provenance=provenance_record,
    )


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
