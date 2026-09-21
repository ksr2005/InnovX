"""
OpenAlex Search Service — Searches 250M+ academic works via the free OpenAlex API.
No API key required. Just set a polite email in the user-agent for higher rate limits.
"""
import httpx
from typing import Optional

BASE_URL = "https://api.openalex.org"
# Set your email for the "polite pool" (100K req/day instead of 10K)
CONTACT_EMAIL = "innovx@example.com"


async def search_works(
    query: str,
    per_page: int = 10,
    page: int = 1,
    sort: str = "relevance_score:desc",
) -> list[dict]:
    """
    Search OpenAlex for academic works matching a query.

    Args:
        query: Search query string.
        per_page: Number of results per page (max 200).
        page: Page number.
        sort: Sort order.

    Returns:
        List of work dicts with title, authors, abstract, etc.
    """
    async with httpx.AsyncClient(timeout=30.0) as client:
        params = {
            "search": query,
            "per_page": min(per_page, 200),
            "page": page,
            "sort": sort,
            "mailto": CONTACT_EMAIL,
        }

        response = await client.get(f"{BASE_URL}/works", params=params)
        response.raise_for_status()
        data = response.json()

    results = []
    for work in data.get("results", []):
        # Reconstruct abstract from inverted index
        abstract = _reconstruct_abstract(work.get("abstract_inverted_index"))

        # Extract author names
        authors = ", ".join(
            authorship.get("author", {}).get("display_name", "Unknown")
            for authorship in work.get("authorships", [])[:5]  # Max 5 authors
        )
        if len(work.get("authorships", [])) > 5:
            authors += " et al."

        results.append({
            "source": "openalex",
            "title": work.get("title", "Untitled"),
            "authors": authors,
            "publication_date": work.get("publication_date"),
            "abstract": abstract,
            "url": work.get("doi") or work.get("id"),
            "metadata": {
                "openalex_id": work.get("id"),
                "doi": work.get("doi"),
                "cited_by_count": work.get("cited_by_count", 0),
                "publication_year": work.get("publication_year"),
                "type": work.get("type"),
                "venue": (work.get("primary_location") or {}).get("source", {}).get("display_name") if (work.get("primary_location") or {}).get("source") else None,
            },
        })

    return results


async def search_for_feature(
    feature_description: str,
    search_queries: list[str],
    max_results_per_query: int = 5,
) -> list[dict]:
    """
    Search OpenAlex for prior art related to a specific technical feature.
    Runs multiple queries and deduplicates results.
    """
    all_results = []
    seen_titles = set()

    for query in search_queries[:4]:  # Max 4 queries per feature
        try:
            results = await search_works(query, per_page=max_results_per_query)
            for r in results:
                title_key = r["title"].lower().strip()
                if title_key not in seen_titles:
                    seen_titles.add(title_key)
                    all_results.append(r)
        except Exception as e:
            print(f"OpenAlex search error for query '{query}': {e}")
            continue

    return all_results


def _reconstruct_abstract(inverted_index: Optional[dict]) -> Optional[str]:
    """
    Reconstruct abstract text from OpenAlex's inverted index format.

    OpenAlex stores abstracts as {word: [positions]} to save space.
    We need to reconstruct the original text.
    """
    if not inverted_index:
        return None

    # Find the total length
    max_pos = 0
    for positions in inverted_index.values():
        if positions:
            max_pos = max(max_pos, max(positions))

    # Reconstruct
    words = [""] * (max_pos + 1)
    for word, positions in inverted_index.items():
        for pos in positions:
            words[pos] = word

    abstract = " ".join(words).strip()
    return abstract if abstract else None
