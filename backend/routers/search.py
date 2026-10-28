"""
Search Router — Direct access to individual search sources.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from services import search_openalex, search_arxiv, search_patents

router = APIRouter()


class SearchQuery(BaseModel):
    query: str = Field(..., min_length=3, max_length=500)
    max_results: int = Field(default=10, ge=1, le=50)


@router.post("/research")
async def search_research(req: SearchQuery):
    """Search academic literature (OpenAlex + arXiv)."""
    results = []
    errors = []

    try:
        openalex = await search_openalex.search_works(req.query, per_page=req.max_results)
        results.extend(openalex)
    except Exception as e:
        errors.append(f"OpenAlex: {str(e)}")

    try:
        arxiv = await search_arxiv.search_papers(req.query, max_results=req.max_results)
        results.extend(arxiv)
    except Exception as e:
        errors.append(f"arXiv: {str(e)}")

    return {
        "total": len(results),
        "results": results,
        "errors": errors if errors else None,
    }


@router.post("/patents")
async def search_patent_db(req: SearchQuery):
    """Search USPTO patent database."""
    try:
        results = await search_patents.search_patents(req.query, per_page=req.max_results)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Patent search failed: {str(e)}")


class PatentCompareRequest(BaseModel):
    creator_title: str
    creator_features: list = []
    competitor_title: str
    competitor_claims_or_text: str


@router.post("/compare")
async def compare_patents(req: PatentCompareRequest):
    """
    Compare creator invention features claim-by-claim against a competitor patent.
    """
    from services.patent_comparator import compare_invention_against_competitor
    return compare_invention_against_competitor(
        creator_title=req.creator_title,
        creator_features=req.creator_features,
        competitor_title=req.competitor_title,
        competitor_claims_or_text=req.competitor_claims_or_text,
    )

