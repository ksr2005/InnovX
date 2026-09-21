"""
Report Router — Placeholder for Week 2 report generation.
"""
from fastapi import APIRouter

router = APIRouter()


@router.get("/{innovation_id}")
async def get_report(innovation_id: str):
    """Get the full innovation report. (Week 2)"""
    return {
        "message": "Report generation will be implemented in Week 2",
        "innovation_id": innovation_id,
    }
