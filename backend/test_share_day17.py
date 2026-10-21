"""
Unit & Integration Tests for Day 17 (Share Path: Defensive Publication Generator).
Tests schemas, publication generation, markdown formatting, PDF generation, and FastAPI route registration.
"""
import sys
import os

# Add backend directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from models.schemas import DefensivePublication, DefensivePubResponse
from services import defensive_pub


def create_sample_pub() -> DefensivePublication:
    return DefensivePublication(
        title="Decentralized Byzantine Fault Tolerant Sensor Consensus Architecture",
        technical_field="This disclosure relates to distributed embedded consensus mechanisms in high-latency IoT networks.",
        cpc_classes=["H04L 9/32", "G06F 21/64", "H04W 4/70"],
        abstract="A low-overhead, ring-topology gossip protocol operating on microcontrollers with constrained memory.",
        background="Existing Byzantine consensus algorithms incur quadratic message complexity O(n^2)...",
        detailed_description=[
            "1. Node Initialization: Nodes authenticate via Ed25519 public keys.",
            "2. Round-Robin Dissemination: Heartbeat payloads propagate across neighboring ring clusters.",
            "3. Convergence Proof: State stabilization occurs within 3 delta rounds.",
        ],
        embodiment_variants=[
            "Variant A: Dual-radio fallback using Sub-1GHz RF when 2.4GHz is jammed.",
            "Variant B: Battery-less energy harvesting deployment with intermittent flash state persistence.",
        ],
        advantages=[
            "Reduces message overhead from O(n^2) to O(n log n).",
            "Operates within 32KB RAM memory budget.",
            "Provides mathematical guarantee of convergence under 33% faulty nodes.",
        ],
        publication_hash="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        timestamp="2026-10-14T00:00:00Z",
        forfeiture_warning=defensive_pub.DEFENSIVE_FORFEITURE_WARNING,
        submission_portals=defensive_pub.DEFAULT_SUBMISSION_PORTALS,
    )


def test_schemas():
    print("Testing defensive publication schemas...")
    sample_pub = create_sample_pub()
    res = DefensivePubResponse(
        status="success",
        innovation_id="test-inno-456",
        publication=sample_pub,
        message="Defensive publication generated successfully",
    )
    assert res.innovation_id == "test-inno-456"
    assert len(res.publication.embodiment_variants) == 2
    assert len(res.publication.cpc_classes) == 3
    assert "STATUTORY NOTICE" in res.publication.forfeiture_warning
    assert len(res.publication.submission_portals) >= 4
    print("[OK] Schemas, statutory warning, and registries validated successfully.")


def test_markdown_export():
    print("Testing markdown disclosure export...")
    sample_pub = create_sample_pub()
    md = defensive_pub.format_publication_as_markdown(sample_pub)
    assert f"# {sample_pub.title}" in md
    assert "Defensive Prior Art Technical Disclosure" in md
    assert "Statutory Legal Notice" in md
    assert "Variant A: Dual-radio fallback" in md
    assert "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" in md
    assert "TDCommons" in md
    print(f"[OK] Markdown disclosure export validated ({len(md)} chars).")


def test_pdf_generation():
    print("Testing ReportLab PDF generation for defensive publication...")
    sample_pub = create_sample_pub()
    pdf_buffer = defensive_pub.generate_defensive_pub_pdf(sample_pub)
    pdf_bytes = pdf_buffer.getvalue()
    assert len(pdf_bytes) > 1000, f"PDF too small: {len(pdf_bytes)} bytes"
    assert pdf_bytes.startswith(b"%PDF"), "Invalid PDF header"
    print(f"[OK] ReportLab PDF generation succeeded: {len(pdf_bytes)} bytes generated.")


def test_fastapi_routes():
    print("Testing route registration in FastAPI app...")
    from main import app

    openapi_paths = app.openapi()["paths"]
    path_key = "/api/innovations/{innovation_id}/publish"
    pdf_key = "/api/innovations/{innovation_id}/publish/pdf"
    text_key = "/api/innovations/{innovation_id}/publish/text"

    assert path_key in openapi_paths, f"Path {path_key} missing from OpenAPI paths"
    assert "get" in openapi_paths[path_key], "GET /publish missing"
    assert "post" in openapi_paths[path_key], "POST /publish missing"
    assert pdf_key in openapi_paths, f"Path {pdf_key} missing from OpenAPI paths"
    assert "get" in openapi_paths[pdf_key], "GET /publish/pdf missing"
    assert text_key in openapi_paths, f"Path {text_key} missing from OpenAPI paths"
    assert "get" in openapi_paths[text_key], "GET /publish/text missing"
    print(f"[OK] Registered endpoints verified: GET/POST {path_key}, GET {pdf_key}, and GET {text_key}.")


if __name__ == "__main__":
    test_schemas()
    test_markdown_export()
    test_pdf_generation()
    test_fastapi_routes()
    print("\n[ALL DAY 17 BACKEND TESTS PASSED]")
