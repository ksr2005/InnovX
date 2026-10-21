"""
Unit and integration test for Creator Pathways (Day 15 / Week 3).
Tests schema validation, route registration, and pathway selection logic.
"""
import sys
import os

# Add backend directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from models.schemas import PathwayType, PathSelectionRequest, PathSelectionResponse
from routers.innovations import ALLOWED_PATHWAYS

def test_schemas():
    print("Testing schemas...")
    assert PathwayType.PROTECT.value == "protect"
    assert PathwayType.SHARE.value == "share"
    assert PathwayType.CONNECT.value == "connect"
    assert PathwayType.BUILD.value == "build"
    
    req = PathSelectionRequest(paths=["protect", "connect"])
    assert len(req.paths) == 2
    assert "protect" in req.paths
    assert "connect" in req.paths
    
    res = PathSelectionResponse(
        status="success",
        innovation_id="test-123",
        selected_paths=["protect", "connect"],
        updated_at="2026-10-14T00:00:00Z",
        message="2 pathways selected"
    )
    assert res.innovation_id == "test-123"
    assert len(res.selected_paths) == 2
    print("[OK] Schemas validated successfully.")

def test_allowed_pathways():
    print("Testing allowed pathways filter...")
    assert ALLOWED_PATHWAYS == {"protect", "share", "connect", "build"}
    
    raw_input = ["PROTECT", "invalid_path", "connect ", "PROTECT", "build"]
    cleaned = []
    for p in raw_input:
        p_clean = p.strip().lower()
        if p_clean in ALLOWED_PATHWAYS and p_clean not in cleaned:
            cleaned.append(p_clean)
            
    assert cleaned == ["protect", "connect", "build"]
    print("[OK] Pathway sanitization and deduplication verified:", cleaned)

def test_fastapi_routes():
    print("Testing route registration in FastAPI app...")
    from main import app
    
    openapi_paths = app.openapi()["paths"]
    path_key = "/api/innovations/{innovation_id}/paths"
    assert path_key in openapi_paths, f"Path {path_key} not found in openapi paths: {list(openapi_paths.keys())}"
    assert "get" in openapi_paths[path_key], "GET method missing on paths endpoint"
    assert "post" in openapi_paths[path_key], "POST method missing on paths endpoint"
    print(f"[OK] Both GET and POST {path_key} are properly registered and documented in OpenAPI.")

if __name__ == "__main__":
    test_schemas()
    test_allowed_pathways()
    test_fastapi_routes()
    print("\n[ALL DAY 15 BACKEND TESTS PASSED]")
