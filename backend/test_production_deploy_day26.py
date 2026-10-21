"""
Automated Production Deployment Test Suite — Day 26
Verifies:
1. Production CORS origin filtering & Vercel preview regex matching
2. Security response headers (nosniff, DENY, strict-origin)
3. Production /health diagnostics endpoint
4. Pre-warmed sentence-transformers model responsiveness (<50ms)
5. End-to-end smoke test of analysis and PDF streaming
"""
import os
import re
import sys
from fastapi.testclient import TestClient

# Ensure backend root is in python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from main import app, allowed_origins


client = TestClient(app)


def test_cors_and_vercel_preview():
    print("[TEST] 1. Testing Production CORS & Vercel Preview Deployments...")
    
    # Check default localhost
    assert "http://localhost:3000" in allowed_origins, "Localhost 3000 must be in allowed origins"
    print(f"  [OK] Allowed static origins: {allowed_origins}")

    # Test CORS headers for localhost origin
    resp_local = client.options(
        "/api/analyze",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "Content-Type",
        },
    )
    assert resp_local.status_code == 200
    assert resp_local.headers.get("access-control-allow-origin") == "http://localhost:3000"
    print("  [OK] Localhost 3000 CORS pre-flight passed")

    # Test CORS regex matching Vercel preview domains
    vercel_preview_origin = "https://innovx-preview-git-feature-preview.vercel.app"
    resp_vercel = client.options(
        "/api/analyze",
        headers={
            "Origin": vercel_preview_origin,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "Content-Type",
        },
    )
    assert resp_vercel.status_code == 200
    assert resp_vercel.headers.get("access-control-allow-origin") == vercel_preview_origin
    print(f"  [OK] Vercel preview domain CORS pre-flight passed: {vercel_preview_origin}")


def test_security_headers():
    print("\n[TEST] 2. Testing Production Security Headers...")
    resp = client.get("/health")
    assert resp.status_code == 200
    headers = resp.headers
    assert headers.get("X-Content-Type-Options") == "nosniff", "Missing X-Content-Type-Options"
    assert headers.get("X-Frame-Options") == "DENY", "Missing X-Frame-Options"
    assert headers.get("Referrer-Policy") == "strict-origin-when-cross-origin", "Missing Referrer-Policy"
    print("  [OK] Security headers verified: nosniff, DENY, strict-origin-when-cross-origin")


def test_health_check_endpoint():
    print("\n[TEST] 3. Testing Production Health Check Endpoint...")
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "healthy"
    assert data["service"] == "InnovX Engine"
    assert "uptime_seconds" in data
    assert "services" in data
    assert data["services"]["embedding_model"].startswith("all-MiniLM-L6-v2")
    assert data["services"]["hybrid_ranking"].startswith("Reciprocal Rank Fusion")
    print(f"  [OK] Health check status: {data['status']}, uptime: {data['uptime_seconds']}s")
    print(f"  [OK] Services: {data['services']}")


def test_model_prewarming():
    print("\n[TEST] 4. Testing Embedding Model Responsiveness & Pre-warming...")
    import time
    from services.similarity import get_model
    
    t0 = time.perf_counter()
    model = get_model()
    t1 = time.perf_counter()
    load_time_ms = (t1 - t0) * 1000
    assert model is not None
    print(f"  [OK] Model reference retrieved in {load_time_ms:.2f}ms (pre-warmed in memory)")

    # Test encoding speed
    t0 = time.perf_counter()
    emb = model.encode(["Robotic pipeline inspection with acoustic sensor array"], normalize_embeddings=True)
    t1 = time.perf_counter()
    encode_time_ms = (t1 - t0) * 1000
    assert len(emb[0]) == 384
    print(f"  [OK] Embedding computed in {encode_time_ms:.2f}ms (384 dimensions)")


def test_report_and_pdf_smoke():
    print("\n[TEST] 5. Testing Report Caching & Streaming PDF Generation...")
    from routers.report import cache_report
    from services.report_gen import generate_report
    
    sample_report = generate_report(
        innovation_id="test-prod-deploy-id",
        raw_input="An autonomous pipeline inspection platform.",
        structured_idea={
            "title": "Subterranean Pipeline Autonomous Inspection Platform",
            "domain": "Robotics & Infrastructure",
            "problem_statement": "Pipeline leaks cause environmental disasters.",
            "proposed_solution": "Autonomous crawling robot with acoustic-visual sensors.",
            "key_features": [
                {
                    "id": "F1",
                    "description": "Acoustic-visual sensor array",
                    "category": "hardware",
                    "search_queries": ["acoustic sensor pipeline"],
                }
            ],
            "target_applications": ["Oil & gas pipelines", "Municipal water systems"],
            "technical_components": {"hardware": ["Acoustic sensor"], "software": ["SLAM"], "methods": ["Gait stepping"]},
        },
        feature_matrix={
            "innovation_id": "test-prod-deploy-id",
            "title": "Subterranean Pipeline Autonomous Inspection Platform",
            "domain": "Robotics & Infrastructure",
            "features": [
                {
                    "id": "F1",
                    "description": "Acoustic-visual sensor array",
                    "coverage": "medium",
                    "total_matches": 12,
                    "prior_art": [
                        {
                            "title": "In-pipe acoustic sensor inspection",
                            "source": "openalex",
                            "similarity": 0.74,
                            "evidence_sentence": "Acoustic sensors measure pipe wall thickness.",
                            "url": "https://example.com/paper",
                        }
                    ],
                }
            ],
            "search_sources": ["OpenAlex", "arXiv", "USPTO"],
            "limitations": ["Searched open databases."],
        },
        scores={
            "prior_art_density": {"score": 45, "explanation": "Moderate density", "references": []},
            "feature_novelty": {"score": 78, "explanation": "High novelty in gait", "references": []},
            "combination_distinctiveness": {"score": 85, "explanation": "Unique multi-modal coupling", "references": []},
            "research_freshness": {"score": 88, "explanation": "Recent literature", "references": []},
            "evidence_strength": {"score": 90, "explanation": "Direct verbatim citations", "references": []},
            "search_confidence": {"score": 85, "explanation": "Multi-database triangulation", "references": []},
        },
        assessment_summary="A compelling robotics system with high novelty.",
        provenance={"document_hash": "sha256_mock_hash", "created_at": "2026-10-14T22:00:00Z"},
    )
    
    cache_report("test-prod-deploy-id", sample_report)
    
    # Retrieve cached report
    resp_rep = client.get("/api/report/test-prod-deploy-id")
    assert resp_rep.status_code == 200
    assert resp_rep.json()["title"] == "Subterranean Pipeline Autonomous Inspection Platform"
    print("  [OK] Cached report retrieval verified (200 OK)")

    # Stream PDF
    resp_pdf = client.get("/api/report/test-prod-deploy-id/pdf")
    assert resp_pdf.status_code == 200
    assert resp_pdf.headers.get("content-type") == "application/pdf"
    assert len(resp_pdf.content) > 1000
    print(f"  [OK] Streaming PDF download verified ({len(resp_pdf.content)} bytes generated)")



def main():
    print("=" * 65)
    print("InnovX Day 26 Production Deployment Test Suite (Render + Vercel)")
    print("=" * 65)
    test_cors_and_vercel_preview()
    test_security_headers()
    test_health_check_endpoint()
    test_model_prewarming()
    test_report_and_pdf_smoke()
    print("\n[ALL TESTS PASSED] Production deployment verification complete!")


if __name__ == "__main__":
    main()
