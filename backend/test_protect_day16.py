"""
Unit & Integration Tests for Day 16 (Protect Path: Patent Readiness Package).
Tests schemas, package generation, PDF generation, and FastAPI route registration.
"""
import sys
import os
import asyncio

# Add backend directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from models.schemas import PatentPrepPackage, PatentPrepResponse
from services import patent_prep


def test_schemas():
    print("Testing patent prep schemas...")
    sample_pkg = PatentPrepPackage(
        title="Autonomous Subterranean Exploration Rover",
        technical_field="This invention relates to subterranean navigation systems.",
        suggested_cpc_classes=["G05D 1/02", "G01S 17/89"],
        background_art="Subterranean environments lack satellite GPS signals...",
        invention_summary="The present invention provides an autonomous multi-sensor rover...",
        detailed_spec_outline=["1. System Overview", "2. Sensor Integration", "3. Navigation Method"],
        embodiment_variations=["Primary: LiDAR-only", "Secondary: Acoustic-optical hybrid"],
        suggested_claim_boundaries=[
            {
                "category": "System Claim",
                "suggested_focus": "A subterranean navigation rover",
                "novel_elements": ["Multi-spectrum sensor array", "Local mesh node"],
                "potential_fallbacks": ["Acoustic transducer link"],
                "attorney_notes": "Emphasize non-GPS sensor fusion."
            }
        ],
        prior_art_gaps=[
            {
                "feature_id": "F1",
                "feature_description": "GPS-denied localization",
                "closest_prior_art_reference": "Academic SLAM algorithms",
                "key_differentiation": "Hybrid optical-inertial fallback",
                "recommended_drafting_emphasis": "Recite specific sensor update rates."
            }
        ],
        filing_checklist=patent_prep.DEFAULT_CHECKLIST,
        jurisdictions=patent_prep.JURISDICTIONS_DATA,
        mandatory_disclaimer=patent_prep.MANDATORY_LEGAL_DISCLAIMER,
        generated_at="2026-10-14T00:00:00Z",
    )
    res = PatentPrepResponse(
        status="success",
        innovation_id="test-inno-123",
        package=sample_pkg,
        message="Package generated",
    )
    assert res.innovation_id == "test-inno-123"
    assert len(res.package.suggested_claim_boundaries) == 1
    assert "LEGAL DISCLAIMER" in res.package.mandatory_disclaimer
    print("[OK] Schemas and statutory disclaimer validated successfully.")


def test_pdf_generation():
    print("Testing ReportLab PDF generation for patent prep package...")
    sample_pkg = PatentPrepPackage(
        title="Autonomous Subterranean Exploration Rover",
        technical_field="This invention relates to subterranean navigation systems.",
        suggested_cpc_classes=["G05D 1/02", "G01S 17/89"],
        background_art="Subterranean environments lack satellite GPS signals...",
        invention_summary="The present invention provides an autonomous multi-sensor rover...",
        detailed_spec_outline=["1. System Overview", "2. Sensor Integration", "3. Navigation Method"],
        embodiment_variations=["Primary: LiDAR-only", "Secondary: Acoustic-optical hybrid"],
        suggested_claim_boundaries=[
            {
                "category": "System Claim",
                "suggested_focus": "A subterranean navigation rover",
                "novel_elements": ["Multi-spectrum sensor array", "Local mesh node"],
                "potential_fallbacks": ["Acoustic transducer link"],
                "attorney_notes": "Emphasize non-GPS sensor fusion."
            }
        ],
        prior_art_gaps=[
            {
                "feature_id": "F1",
                "feature_description": "GPS-denied localization",
                "closest_prior_art_reference": "Academic SLAM algorithms",
                "key_differentiation": "Hybrid optical-inertial fallback",
                "recommended_drafting_emphasis": "Recite specific sensor update rates."
            }
        ],
        filing_checklist=patent_prep.DEFAULT_CHECKLIST,
        jurisdictions=patent_prep.JURISDICTIONS_DATA,
        mandatory_disclaimer=patent_prep.MANDATORY_LEGAL_DISCLAIMER,
        generated_at="2026-10-14T00:00:00Z",
    )
    pdf_buffer = patent_prep.generate_patent_prep_pdf(sample_pkg)
    pdf_bytes = pdf_buffer.getvalue()
    assert len(pdf_bytes) > 1000, f"PDF too small: {len(pdf_bytes)} bytes"
    assert pdf_bytes.startswith(b"%PDF"), "Invalid PDF header"
    print(f"[OK] ReportLab PDF generation succeeded: {len(pdf_bytes)} bytes generated.")


def test_fastapi_routes():
    print("Testing route registration in FastAPI app...")
    from main import app

    openapi_paths = app.openapi()["paths"]
    path_key = "/api/innovations/{innovation_id}/protect"
    pdf_key = "/api/innovations/{innovation_id}/protect/pdf"

    assert path_key in openapi_paths, f"Path {path_key} missing from OpenAPI paths"
    assert "get" in openapi_paths[path_key], "GET /protect missing"
    assert "post" in openapi_paths[path_key], "POST /protect missing"
    assert pdf_key in openapi_paths, f"Path {pdf_key} missing from OpenAPI paths"
    assert "get" in openapi_paths[pdf_key], "GET /protect/pdf missing"
    print(f"[OK] Registered endpoints verified: GET/POST {path_key} and GET {pdf_key}.")


if __name__ == "__main__":
    test_schemas()
    test_pdf_generation()
    test_fastapi_routes()
    print("\n[ALL DAY 16 BACKEND TESTS PASSED]")
