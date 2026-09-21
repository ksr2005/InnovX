"""
USPTO PatentsView Search Service — Searches US patent data via the free PatentsView API.
"""
import httpx
from typing import Optional

BASE_URL = "https://api.patentsview.org/patents/query"


async def search_patents(
    query: str,
    per_page: int = 10,
    page: int = 1,
) -> list[dict]:
    """
    Search USPTO patents matching a text query.

    Args:
        query: Search query string.
        per_page: Number of results per page (max 100).
        page: Page number (1-indexed).

    Returns:
        List of patent dicts.
    """
    # PatentsView uses a JSON query format
    # Search across patent title and abstract
    request_body = {
        "q": {
            "_or": [
                {"_text_any": {"patent_title": query}},
                {"_text_any": {"patent_abstract": query}},
            ]
        },
        "f": [
            "patent_number",
            "patent_title",
            "patent_abstract",
            "patent_date",
            "patent_type",
            "patent_num_claims",
        ],
        "o": {
            "page": page,
            "per_page": min(per_page, 100),
        },
        "s": [{"patent_date": "desc"}],
    }

    async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
        response = await client.post(
            BASE_URL,
            json=request_body,
            headers={"Content-Type": "application/json"},
        )
        response.raise_for_status()
        if "application/json" not in response.headers.get("content-type", ""):
            return []
        data = response.json()

    results = []
    for patent in data.get("patents", []):
        patent_number = patent.get("patent_number", "")
        results.append({
            "source": "uspto",
            "title": patent.get("patent_title", "Untitled"),
            "authors": None,  # PatentsView basic query doesn't include inventors
            "publication_date": patent.get("patent_date"),
            "abstract": patent.get("patent_abstract"),
            "url": f"https://patents.google.com/patent/US{patent_number}" if patent_number else None,
            "metadata": {
                "patent_number": patent_number,
                "patent_type": patent.get("patent_type"),
                "num_claims": patent.get("patent_num_claims"),
            },
        })

    return results


async def search_for_feature(
    feature_description: str,
    search_queries: list[str],
    max_results_per_query: int = 5,
) -> list[dict]:
    """
    Search USPTO for prior art related to a specific technical feature.
    Runs multiple queries and deduplicates results.
    """
    all_results = []
    seen_titles = set()

    for query in search_queries[:3]:  # Max 3 queries per feature
        try:
            results = await search_patents(query, per_page=max_results_per_query)
            for r in results:
                title_key = r["title"].lower().strip()
                if title_key not in seen_titles:
                    seen_titles.add(title_key)
                    all_results.append(r)
        except Exception as e:
            print(f"USPTO search error for query '{query}': {e}")
            continue

    return all_results
