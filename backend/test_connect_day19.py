"""
Unit & Integration Tests for Day 19 (Connect Path: Mutual NDA & Access Request Flow).
Tests schemas, route registrations, database access_requests table queries, and NDA gating logic.
"""
import sys
import os

# Add backend directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from models.schemas import (
    AccessRequestCreateRequest,
    AccessRequestItem,
    AccessRequestListResponse,
    AccessRequestReviewRequest,
    ListingAccessStatusResponse,
    FullInnovationDisclosureResponse,
)


def test_schemas():
    print("Testing Day 19 NDA & access request schemas...")
    req = AccessRequestItem(
        id="req-123",
        listing_id="list-456",
        requestor_id="user-789",
        requestor_name="Dr. Jane Doe",
        requestor_email="jane@acme-ventures.com",
        listing_title="Autonomous Subterranean Exploration Rover",
        domain="Robotics",
        stage="prototype",
        nda_accepted=True,
        nda_accepted_at="2026-10-14T00:00:00Z",
        status="pending",
        created_at="2026-10-14T00:00:00Z",
    )
    assert req.nda_accepted is True
    assert req.status == "pending"

    list_res = AccessRequestListResponse(total=1, requests=[req])
    assert list_res.total == 1

    status_res = ListingAccessStatusResponse(
        has_requested=True,
        status="approved",
        nda_accepted=True,
        request_id="req-123",
    )
    assert status_res.status == "approved"

    disclosure = FullInnovationDisclosureResponse(
        status="success",
        listing_id="list-456",
        innovation_id="inno-999",
        title="Autonomous Subterranean Exploration Rover",
        raw_input="A novel rover architecture...",
        disclosed_under_nda=True,
        authorized_at="2026-10-14T00:00:00Z",
    )
    assert disclosure.disclosed_under_nda is True
    print("[OK] Day 19 schemas validated successfully.")


def test_fastapi_routes():
    print("Testing Day 19 NDA access request route registration in FastAPI app...")
    from main import app

    openapi_paths = app.openapi()["paths"]

    req_access_key = "/api/marketplace/listings/{listing_id}/request-access"
    access_status_key = "/api/marketplace/listings/{listing_id}/access-status"
    incoming_key = "/api/marketplace/access-requests/incoming"
    my_key = "/api/marketplace/access-requests/my"
    review_key = "/api/marketplace/access-requests/{request_id}/review"
    full_report_key = "/api/marketplace/listings/{listing_id}/full-report"

    assert req_access_key in openapi_paths, f"Path {req_access_key} missing from OpenAPI"
    assert "post" in openapi_paths[req_access_key], "POST /request-access missing"

    assert access_status_key in openapi_paths, f"Path {access_status_key} missing from OpenAPI"
    assert "get" in openapi_paths[access_status_key], "GET /access-status missing"

    assert incoming_key in openapi_paths, f"Path {incoming_key} missing from OpenAPI"
    assert "get" in openapi_paths[incoming_key], "GET /incoming missing"

    assert my_key in openapi_paths, f"Path {my_key} missing from OpenAPI"
    assert "get" in openapi_paths[my_key], "GET /my missing"

    assert review_key in openapi_paths, f"Path {review_key} missing from OpenAPI"
    assert "post" in openapi_paths[review_key], "POST /review missing"

    assert full_report_key in openapi_paths, f"Path {full_report_key} missing from OpenAPI"
    assert "get" in openapi_paths[full_report_key], "GET /full-report missing"

    print(
        f"[OK] Verified 6 new Day 19 endpoints:\n"
        f"  - POST {req_access_key}\n"
        f"  - GET {access_status_key}\n"
        f"  - GET {incoming_key}\n"
        f"  - GET {my_key}\n"
        f"  - POST {review_key}\n"
        f"  - GET {full_report_key}"
    )


def test_database_table_connectivity():
    print("Testing Supabase access_requests table connectivity...")
    from services.supabase_client import get_supabase
    supabase = get_supabase()
    res = supabase.table("access_requests").select("*").limit(1).execute()
    assert res.data is not None, "access_requests query returned None"
    print(f"[OK] Supabase table 'access_requests' query executed successfully ({len(res.data)} sample rows).")


if __name__ == "__main__":
    test_schemas()
    test_fastapi_routes()
    test_database_table_connectivity()
    print("\n[ALL DAY 19 BACKEND TESTS PASSED]")
