"""
Report Router — Serves innovation reports, summaries, and PDF exports.
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
    """Retrieve a cached report, falling back to Supabase if not in memory."""
    if innovation_id in _reports_cache:
        return _reports_cache[innovation_id]

    try:
        from services.supabase_client import get_supabase
        from services import report_gen

        supabase = get_supabase()
        inno_res = supabase.table("innovations").select("*").eq("id", innovation_id).execute()
        if not inno_res.data:
            return None

        inno = inno_res.data[0]
        assess_res = supabase.table("assessments").select("*").eq("innovation_id", innovation_id).execute()
        assessment = assess_res.data[0] if assess_res.data else {}

        prov_res = supabase.table("provenance_records").select("*").eq("innovation_id", innovation_id).order("version", desc=True).limit(1).execute()
        prov = prov_res.data[0] if prov_res.data else {
            "innovation_id": innovation_id,
            "version": 1,
            "document_hash": "hash_restored_from_db",
            "previous_hash": None,
            "created_at": inno.get("created_at"),
        }

        structured = inno.get("structured_data") or {
            "title": inno.get("title", "Untitled Innovation"),
            "problem_statement": "Recorded technical innovation.",
            "proposed_solution": inno.get("raw_input", ""),
            "domain": "Technology",
            "key_features": [],
            "target_applications": [],
            "technical_components": {"hardware": [], "software": [], "methods": []},
        }

        scores_dict = {
            "prior_art_density": {"score": assessment.get("prior_art_density", 50.0), "explanation": "Database record", "references": []},
            "feature_novelty": {"score": assessment.get("feature_novelty", 50.0), "explanation": "Database record", "references": []},
            "combination_distinctiveness": {"score": assessment.get("combination_distinctiveness", 50.0), "explanation": "Database record", "references": []},
            "research_freshness": {"score": assessment.get("research_freshness", 50.0), "explanation": "Database record", "references": []},
            "evidence_strength": {"score": assessment.get("evidence_strength", 50.0), "explanation": "Database record", "references": []},
            "search_confidence": {"score": assessment.get("search_confidence", 50.0), "explanation": "Database record", "references": []},
        }

        matrix_dict = {
            "innovation_id": innovation_id,
            "title": inno.get("title", ""),
            "domain": structured.get("domain", "Technology"),
            "features": [],
            "search_sources": ["openalex", "arxiv", "uspto"],
            "search_timestamp": str(inno.get("created_at")),
            "limitations": ["Loaded from Supabase database record."],
        }

        reconstructed_report = report_gen.generate_report(
            innovation_id=innovation_id,
            raw_input=inno.get("raw_input", ""),
            structured_idea=structured,
            feature_matrix=matrix_dict,
            scores=scores_dict,
            assessment_summary=assessment.get("summary_text", "Innovation record archived in portfolio."),
            provenance=prov,
        )

        _reports_cache[innovation_id] = reconstructed_report
        return reconstructed_report
    except Exception as e:
        print(f"[REPORT] Error restoring report from Supabase: {e}")
        return None


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


@router.get("/{innovation_id}/pdf")
async def get_report_pdf(innovation_id: str):
    """
    Generate and download a PDF version of the innovation report.

    Returns a streaming PDF file with Content-Disposition attachment header.
    """
    report = get_cached_report(innovation_id)
    if not report:
        raise HTTPException(
            status_code=404,
            detail=f"Report not found for innovation {innovation_id}. Run analysis first.",
        )

    try:
        from services.pdf_export import generate_pdf

        pdf_bytes = generate_pdf(report)
        pdf_stream = io.BytesIO(pdf_bytes)

        filename = f"InnovX_Report_{innovation_id}.pdf"

        return StreamingResponse(
            pdf_stream,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "Content-Length": str(len(pdf_bytes)),
            },
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"PDF generation failed: {str(e)}",
        )
