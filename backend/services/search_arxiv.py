"""
arXiv Search Service — Searches preprints in CS, EE, Math, Physics via the free arXiv API.
"""
import httpx
import xml.etree.ElementTree as ET
from typing import Optional
from urllib.parse import quote

BASE_URL = "https://export.arxiv.org/api/query"


async def search_papers(
    query: str,
    max_results: int = 10,
    start: int = 0,
    sort_by: str = "relevance",
    sort_order: str = "descending",
) -> list[dict]:
    """
    Search arXiv for papers matching a query.

    Args:
        query: Search query string.
        max_results: Number of results (max 100 per request).
        start: Offset for pagination.
        sort_by: Sort field (relevance, lastUpdatedDate, submittedDate).
        sort_order: ascending or descending.

    Returns:
        List of paper dicts.
    """
    async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
        params = {
            "search_query": f"all:{query}",
            "start": start,
            "max_results": min(max_results, 100),
            "sortBy": sort_by,
            "sortOrder": sort_order,
        }

        response = await client.get(BASE_URL, params=params)
        response.raise_for_status()

    # Parse XML response
    root = ET.fromstring(response.text)
    ns = {"atom": "http://www.w3.org/2005/Atom", "arxiv": "http://arxiv.org/schemas/atom"}

    results = []
    for entry in root.findall("atom:entry", ns):
        title = _get_text(entry, "atom:title", ns).replace("\n", " ").strip()
        abstract = _get_text(entry, "atom:summary", ns).replace("\n", " ").strip()

        # Get authors
        authors = []
        for author in entry.findall("atom:author", ns):
            name = _get_text(author, "atom:name", ns)
            if name:
                authors.append(name)
        author_str = ", ".join(authors[:5])
        if len(authors) > 5:
            author_str += " et al."

        # Get the arXiv ID and URL
        arxiv_id = _get_text(entry, "atom:id", ns)
        published = _get_text(entry, "atom:published", ns)

        # Get categories
        categories = []
        for cat in entry.findall("atom:category", ns):
            term = cat.get("term")
            if term:
                categories.append(term)

        # Get PDF link
        pdf_url = None
        for link in entry.findall("atom:link", ns):
            if link.get("title") == "pdf":
                pdf_url = link.get("href")

        results.append({
            "source": "arxiv",
            "title": title,
            "authors": author_str,
            "publication_date": published[:10] if published else None,
            "abstract": abstract,
            "url": arxiv_id,
            "metadata": {
                "arxiv_id": arxiv_id,
                "categories": categories,
                "pdf_url": pdf_url,
            },
        })

    return results


async def search_for_feature(
    feature_description: str,
    search_queries: list[str],
    max_results_per_query: int = 5,
) -> list[dict]:
    """
    Search arXiv for prior art related to a specific technical feature.
    Runs multiple queries and deduplicates results.
    """
    all_results = []
    seen_titles = set()

    for query in search_queries[:3]:  # Max 3 queries per feature (arXiv is slower)
        try:
            results = await search_papers(query, max_results=max_results_per_query)
            for r in results:
                title_key = r["title"].lower().strip()
                if title_key not in seen_titles:
                    seen_titles.add(title_key)
                    all_results.append(r)
        except Exception as e:
            print(f"arXiv search error for query '{query}': {e}")
            continue

    return all_results


def _get_text(element, path: str, ns: dict) -> str:
    """Safely extract text from an XML element."""
    el = element.find(path, ns)
    return el.text.strip() if el is not None and el.text else ""
