"""
Automated Test Suite for Day 25: Search Hybridization & Edge Case Hardening
Verifies:
1. Okapi BM25 lexical ranking calculation
2. Reciprocal Rank Fusion (RRF, k=60) combining semantic vector similarity & BM25
3. Edge case guardrails: short input, non-technical concept, overly broad idea, valid concept
4. Search methodology and API query audit recording
"""
import asyncio
import os
import sys

# Ensure backend root is in Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from services.similarity import compute_bm25_lexical_scores, reciprocal_rank_fusion
from services.guardrails import evaluate_submission
from models.schemas import SearchMethodology, ApiQueryAudit, FeatureSearchAudit


def test_bm25_and_rrf():
    print("[TEST] 1. Testing Okapi BM25 Lexical Ranking & Reciprocal Rank Fusion...")
    
    docs = [
        {
            "title": "Subterranean Quadruped Robotic Inspection Platform",
            "abstract": "We present an autonomous quadruped robot for inspecting underground pipelines without GPS, using acoustic and visual sensors to detect hairline cracks.",
            "source": "openalex",
            "url": "https://example.com/1",
        },
        {
            "title": "Deep Learning for Natural Language Processing in Legal Documents",
            "abstract": "Transformer models are fine-tuned on court transcripts to extract legal precedents and contractual obligations.",
            "source": "arxiv",
            "url": "https://example.com/2",
        },
        {
            "title": "Acoustic Fault Detection in Fluid Transmission Pipelines",
            "abstract": "An acoustic sensor array analyzes sound reflections inside buried fluid pipelines to localize pressure drops and fissures.",
            "source": "uspto",
            "url": "https://example.com/3",
        },
    ]

    feature = "Acoustic-visual sensor array for autonomous pipeline fault and hairline fissure detection"

    # Test BM25
    bm25_scores = compute_bm25_lexical_scores(feature, docs)
    assert len(bm25_scores) == 3, "BM25 should return scores for all 3 docs"
    assert bm25_scores[0] > bm25_scores[1], "Pipeline robot should score higher on BM25 than legal NLP"
    assert bm25_scores[2] > bm25_scores[1], "Acoustic fault detector should score higher on BM25 than legal NLP"
    print(f"  [OK] BM25 Scores: {[round(s, 4) for s in bm25_scores]}")

    # Test RRF
    fused = reciprocal_rank_fusion(docs, feature, k=60, top_k=3)
    assert len(fused) == 3, "RRF should rank all 3 docs"
    
    for doc in fused:
        assert "rrf_score" in doc, "Document must contain rrf_score"
        assert "similarity_score" in doc, "Document must contain similarity_score"
        assert "keyword_score" in doc, "Document must contain keyword_score"
        assert "rank_rrf" in doc, "Document must contain rank_rrf"
        assert "rank_semantic" in doc, "Document must contain rank_semantic"
        assert "rank_keyword" in doc, "Document must contain rank_keyword"
    
    # Verify RRF ordering is descending
    assert fused[0]["rrf_score"] >= fused[1]["rrf_score"] >= fused[2]["rrf_score"], "RRF scores must be sorted descending"
    # Legal NLP must rank lowest for pipeline fault detection
    assert fused[2]["title"] == "Deep Learning for Natural Language Processing in Legal Documents", "Irrelevant doc must rank last"
    
    print(f"  [OK] RRF Top 1: '{fused[0]['title']}' (RRF: {fused[0]['rrf_score']}, Sim: {fused[0]['similarity_score']}, BM25: {fused[0]['keyword_score']})")
    print(f"  [OK] RRF Top 2: '{fused[1]['title']}' (RRF: {fused[1]['rrf_score']}, Sim: {fused[1]['similarity_score']}, BM25: {fused[1]['keyword_score']})")


async def test_guardrails():
    print("\n[TEST] 2. Testing Edge Case Guardrails...")

    # Case A: Too brief (< 50 chars)
    short_input = "A flying car."
    res_short = await evaluate_submission(short_input)
    assert res_short["status"] == "short_input", f"Expected 'short_input', got {res_short['status']}"
    assert res_short["is_valid"] is False, "Short submission must be marked invalid"
    assert len(res_short["clarifying_questions"]) >= 2, "Must return clarifying questions"
    assert res_short["suggested_template"] is not None, "Must return template"
    print(f"  [OK] Short input flagged properly: {res_short['headline']}")

    # Case B: Non-technical concept
    non_tech = "An artisanal Italian bakery and cafe in downtown Seattle serving sourdough bread and espresso with acoustic live folk music."
    res_non_tech = await evaluate_submission(non_tech)
    assert res_non_tech["status"] == "non_technical", f"Expected 'non_technical', got {res_non_tech['status']}"
    assert res_non_tech["is_valid"] is False, "Non-technical concept must be marked invalid"
    assert len(res_non_tech["clarifying_questions"]) >= 1, "Must return clarifying questions"
    print(f"  [OK] Non-technical concept flagged properly: {res_non_tech['headline']}")

    # Case C: Overly broad idea
    broad = "An AI for healthcare that uses deep learning to cure diseases and improve hospital operations."
    res_broad = await evaluate_submission(broad)
    assert res_broad["status"] in ["overly_broad", "valid"], f"Expected 'overly_broad' or 'valid', got {res_broad['status']}"
    print(f"  [OK] Broad concept evaluated: {res_broad['headline']} (status: {res_broad['status']})")

    # Case D: Valid technical concept
    valid_tech = (
        "An autonomous solar-assisted quadruped robotic inspection platform for subterranean pipeline fault detection. "
        "The system navigates unmapped pipe networks without GPS, utilizes an acoustic-visual sensor array to localize micro-fissures, "
        "features adaptive magnetic gaited climbing for curved geometry, and transmits low-bandwidth semantic delta telemetry to an external SCADA hub."
    )
    res_valid = await evaluate_submission(valid_tech)
    assert res_valid["status"] == "valid", f"Expected 'valid', got {res_valid['status']}"
    assert res_valid["is_valid"] is True, "Valid technical submission must be marked valid"
    print(f"  [OK] Valid technical submission approved: {res_valid['headline']}")


def test_search_methodology_schema():
    print("\n[TEST] 3. Testing Search Methodology Schema & Query Audit...")
    
    audit = ApiQueryAudit(
        source="openalex",
        status="ok",
        query="acoustic sensor pipeline fissure",
        results_count=14,
    )
    feature_audit = FeatureSearchAudit(
        feature_id="F1",
        feature_description="Acoustic sensor array",
        queries_run=[audit],
        total_candidates_found=14,
        total_after_fusion=10,
    )
    methodology = SearchMethodology(
        apis_queried=["OpenAlex", "arXiv", "USPTO"],
        api_health={"openalex": "ok", "arxiv": "ok", "uspto": "degraded"},
        hybrid_fusion="Reciprocal Rank Fusion (RRF, k=60)",
        total_documents_scanned=14,
        feature_audits=[feature_audit],
    )

    dump = methodology.model_dump()
    assert dump["hybrid_fusion"].startswith("Reciprocal Rank Fusion")
    assert dump["api_health"]["uspto"] == "degraded"
    assert len(dump["feature_audits"]) == 1
    assert dump["feature_audits"][0]["queries_run"][0]["query"] == "acoustic sensor pipeline fissure"
    print("  [OK] SearchMethodology schema verified and serializable")


async def main():
    print("=" * 60)
    print("InnovX Day 25 Verification Suite: Search Hybridization & Guardrails")
    print("=" * 60)
    test_bm25_and_rrf()
    await test_guardrails()
    test_search_methodology_schema()
    print("\n[ALL TESTS PASSED] Day 25 backend implementation fully verified!")


if __name__ == "__main__":
    asyncio.run(main())
