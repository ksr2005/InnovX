"""
Unit & Integration Tests for Day 18 (Connect Path: NDA-Gated Marketplace Architecture).
Tests schemas, sanitizer engine & fallback, database table connectivity, and FastAPI route registration.
"""
import sys
import os

# Add backend directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from models.schemas import (
    SanitizedListingDraft,
    SanitizeDraftResponse,
    MarketplaceListingCreateRequest,
    MarketplaceListingItem,
    MarketplaceListingListResponse,
    MarketplaceListingUpdateRequest,
)
from services import marketplace_sanitizer


def test_schemas():
    print("Testing marketplace schemas...")
    draft = SanitizedListingDraft(
        public_title="Autonomous Subterranean Exploration Rover",
        public_description="An industrial IoT rover platform designed for GPS-denied environments.",
        domain="Robotics",
        target_market=["Mining", "Subterranean Infrastructure", "Search & Rescue"],
        commercial_value_prop="Enables autonomous zero-infrastructure 3D SLAM mapping in underground tunnels.",
        suggested_stage="prototype",
        suggested_availability=["license", "co_development"],
        withheld_confidential_elements=[
            "Proprietary sensor fusion Kalman filter matrices",
            "Hardware PCB schematic for high-pressure casing",
        ],
        sanitization_notice=marketplace_sanitizer.SANITIZATION_NOTICE,
    )
    res = SanitizeDraftResponse(
        status="success",
        innovation_id="test-inno-789",
        draft=draft,
        message="AI-sanitized public summary drafted successfully.",
    )
    assert res.innovation_id == "test-inno-789"
    assert len(res.draft.target_market) == 3
    assert len(res.draft.withheld_confidential_elements) == 2
    assert "CONFIDENTIALITY SHIELD ACTIVE" in res.draft.sanitization_notice

    # Test listing item
    item = MarketplaceListingItem(
        id="list-123",
        innovation_id="test-inno-789",
        creator_id="creator-456",
        public_title=draft.public_title,
        public_description=draft.public_description,
        domain="Robotics",
        stage="prototype",
        available_for=["license", "co_development"],
        preferred_terms="Non-exclusive license; $50k upfront + 3% royalty",
        status="active",
        created_at="2026-10-14T00:00:00Z",
    )
    assert item.status == "active"
    assert item.stage == "prototype"

    list_res = MarketplaceListingListResponse(total=1, listings=[item])
    assert list_res.total == 1
    print("[OK] Schemas and validation models passed.")


def test_sanitizer_fallback():
    print("Testing marketplace sanitizer fallback...")
    fallback_draft = marketplace_sanitizer.create_fallback_sanitized_draft(
        title="Novel Quantum Resistance Mesh Keying",
        domain="Cryptography",
        problem_statement="Legacy public-key algorithms are vulnerable to Shor's algorithm.",
        proposed_solution="Lattice-based post-quantum key exchange for low-latency networks.",
    )
    assert "Cryptography" in fallback_draft.domain
    assert len(fallback_draft.withheld_confidential_elements) >= 2
    assert "CONFIDENTIALITY SHIELD ACTIVE" in fallback_draft.sanitization_notice
    print(f"[OK] Fallback sanitizer generated safe draft: '{fallback_draft.public_title}'")


def test_fastapi_routes():
    print("Testing marketplace route registration in FastAPI app...")
    from main import app

    openapi_paths = app.openapi()["paths"]
    sanitize_key = "/api/marketplace/sanitize/{innovation_id}"
    listings_key = "/api/marketplace/listings"
    my_key = "/api/marketplace/listings/my"
    item_key = "/api/marketplace/listings/{listing_id}"

    assert sanitize_key in openapi_paths, f"Path {sanitize_key} missing from OpenAPI paths"
    assert "post" in openapi_paths[sanitize_key], "POST /sanitize missing"

    assert listings_key in openapi_paths, f"Path {listings_key} missing from OpenAPI paths"
    assert "get" in openapi_paths[listings_key], "GET /listings missing"
    assert "post" in openapi_paths[listings_key], "POST /listings missing"

    assert my_key in openapi_paths, f"Path {my_key} missing from OpenAPI paths"
    assert "get" in openapi_paths[my_key], "GET /listings/my missing"

    assert item_key in openapi_paths, f"Path {item_key} missing from OpenAPI paths"
    assert "get" in openapi_paths[item_key], "GET /listings/{id} missing"
    assert "patch" in openapi_paths[item_key], "PATCH /listings/{id} missing"
    assert "delete" in openapi_paths[item_key], "DELETE /listings/{id} missing"

    print(f"[OK] Registered endpoints verified: POST {sanitize_key}, GET/POST {listings_key}, GET {my_key}, GET/PATCH/DELETE {item_key}.")


def test_database_table_connectivity():
    print("Testing Supabase marketplace_listings table connectivity...")
    from services.supabase_client import get_supabase
    supabase = get_supabase()
    res = supabase.table("marketplace_listings").select("*").limit(1).execute()
    assert res.data is not None, "marketplace_listings query returned None"
    print(f"[OK] Supabase table 'marketplace_listings' successfully connected (returned {len(res.data)} sample rows).")


if __name__ == "__main__":
    test_schemas()
    test_sanitizer_fallback()
    test_fastapi_routes()
    test_database_table_connectivity()
    print("\n[ALL DAY 18 BACKEND TESTS PASSED]")
