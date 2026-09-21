"""
Report Router — Serves innovation reports and PDF exports.
"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
import io

router = APIRouter()

# In-memory store for MVP (Week 2 Day 11 will add Supabase persistence)
_reports_cache: dict[str, dict] = {}


def cache_report(innovation_id: str, report: dict):
    """Store a generated report in the cache."""
    _reports_cache[innovation_id] = report


def get_cached_report(innovation_id: str) -> dict | None:
    """Retrieve a cached report."""
    return _reports_cache.get(innovation_id)


@router.get("/{innovation_id}")
async def get_report(innovation_id: str):
    """Get the full innovation report."""
    report = get_cached_report(innovation_id)
    if not report:
        raise HTTPException(
            status_code=404,
            detail=f"Report not found for innovation {innovation_id}. Run analysis first.",
        )
    return report


@router.get("/{innovation_id}/summary")
async def get_report_summary(innovation_id: str):
    """Get just the executive summary section of a report."""
    report = get_cached_report(innovation_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found.")

    sections = report.get("sections", [])
    exec_summary = next((s for s in sections if s["id"] == "A"), None)

    return {
        "innovation_id": innovation_id,
        "title": report.get("title", ""),
        "domain": report.get("domain", ""),
        "executive_summary": exec_summary,
    }
