"""
Report Generation Service — Generates comprehensive innovation reports
with 10 structured sections from analysis data.
"""
from datetime import datetime, timezone
from typing import Optional


def generate_report(
    innovation_id: str,
    raw_input: str,
    structured_idea: dict,
    feature_matrix: dict,
    scores: dict,
    assessment_summary: str,
    provenance: dict,
) -> dict:
    """
    Generate a full structured innovation report.

    Returns a dict with 10 sections, each containing a title and content.
    This structure can be rendered as HTML, PDF, or JSON.
    """
    features = feature_matrix.get("features", [])
    limitations = feature_matrix.get("limitations", [])
    search_sources = feature_matrix.get("search_sources", [])

    # Section A: Executive Summary
    executive_summary = _build_executive_summary(
        structured_idea, scores, len(features), assessment_summary
    )

    # Section B: Structured Idea
    structured_section = _build_structured_section(structured_idea)

    # Section C: Search Methodology
    methodology = _build_methodology(search_sources, feature_matrix)

    # Section D: Prior Art Found
    prior_art_section = _build_prior_art_section(features)

    # Section E: Feature Comparison Matrix
    matrix_section = _build_matrix_section(features)

    # Section F: Similarity Analysis
    similarity_section = _build_similarity_section(features)

    # Section G: Potential Differentiators
    differentiators = _build_differentiators(features)

    # Section H: Innovation Assessment
    assessment_section = _build_assessment_section(scores)

    # Section I: Search Confidence & Limitations
    confidence_section = _build_confidence_section(scores, limitations)

    # Section J: Recommended Next Steps
    next_steps = _build_next_steps(scores, features)

    report = {
        "innovation_id": innovation_id,
        "title": structured_idea.get("title", "Untitled Innovation"),
        "domain": structured_idea.get("domain", "Unknown"),
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "provenance": provenance,
        "sections": [
            {"id": "A", "title": "Executive Summary", "content": executive_summary},
            {"id": "B", "title": "Structured Innovation", "content": structured_section},
            {"id": "C", "title": "Search Methodology", "content": methodology},
            {"id": "D", "title": "Prior Art Found", "content": prior_art_section},
            {"id": "E", "title": "Feature Comparison Matrix", "content": matrix_section},
            {"id": "F", "title": "Similarity Analysis", "content": similarity_section},
            {"id": "G", "title": "Potential Differentiators", "content": differentiators},
            {"id": "H", "title": "Innovation Assessment", "content": assessment_section},
            {"id": "I", "title": "Search Confidence & Limitations", "content": confidence_section},
            {"id": "J", "title": "Recommended Next Steps", "content": next_steps},
        ],
    }

    return report


def _build_executive_summary(structured_idea: dict, scores: dict, feature_count: int, summary: str) -> dict:
    return {
        "title": structured_idea.get("title", ""),
        "domain": structured_idea.get("domain", ""),
        "features_analyzed": feature_count,
        "key_scores": {
            "prior_art_density": scores["prior_art_density"]["score"],
            "feature_novelty": scores["feature_novelty"]["score"],
            "combination_distinctiveness": scores["combination_distinctiveness"]["score"],
        },
        "ai_summary": summary,
    }


def _build_structured_section(structured_idea: dict) -> dict:
    return {
        "problem_statement": structured_idea.get("problem_statement", ""),
        "proposed_solution": structured_idea.get("proposed_solution", ""),
        "target_applications": structured_idea.get("target_applications", []),
        "technical_components": structured_idea.get("technical_components", {}),
        "key_features": [
            {
                "id": f.get("id", ""),
                "description": f.get("description", ""),
                "category": f.get("category", ""),
            }
            for f in structured_idea.get("key_features", [])
        ],
    }


def _build_methodology(search_sources: list, feature_matrix: dict) -> dict:
    return {
        "sources_searched": search_sources,
        "search_timestamp": feature_matrix.get("search_timestamp", ""),
        "method": (
            "Each extracted feature was searched independently across all sources. "
            "Results were ranked by semantic similarity using sentence-transformers "
            "(all-MiniLM-L6-v2, 384-dimensional embeddings). "
            "Evidence sentences were extracted by AI from the top-ranked abstracts."
        ),
        "embedding_model": "all-MiniLM-L6-v2 (384-dim, cosine similarity)",
        "ranking_method": "Cosine similarity between feature and abstract embeddings",
    }


def _build_prior_art_section(features: list) -> dict:
    total_results = sum(f.get("total_matches", 0) for f in features)
    all_prior_art = []

    for f in features:
        for art in f.get("prior_art", []):
            all_prior_art.append({
                "feature_id": f.get("id", ""),
                "feature_description": f.get("description", ""),
                **art,
            })

    return {
        "total_documents_found": total_results,
        "unique_documents_in_report": len(all_prior_art),
        "by_feature": [
            {
                "feature_id": f.get("id", ""),
                "feature_description": f.get("description", ""),
                "coverage": f.get("coverage", "none"),
                "documents_found": f.get("total_matches", 0),
                "top_matches": f.get("prior_art", []),
            }
            for f in features
        ],
    }


def _build_matrix_section(features: list) -> dict:
    rows = []
    for f in features:
        top_match = f["prior_art"][0] if f.get("prior_art") else None
        rows.append({
            "feature_id": f.get("id", ""),
            "feature": f.get("description", ""),
            "coverage": f.get("coverage", "none"),
            "top_match_title": top_match.get("title", "None") if top_match else "None",
            "top_match_similarity": top_match.get("similarity", 0) if top_match else 0,
            "top_match_source": top_match.get("source", "") if top_match else "",
            "evidence": top_match.get("evidence_sentence") if top_match else None,
        })
    return {"matrix": rows}


def _build_similarity_section(features: list) -> dict:
    overlaps = []
    gaps = []

    for f in features:
        coverage = f.get("coverage", "none")
        if coverage in ("high", "medium"):
            top = f["prior_art"][0] if f.get("prior_art") else {}
            overlaps.append({
                "feature": f.get("description", ""),
                "coverage": coverage,
                "closest_match": top.get("title", "Unknown"),
                "similarity": top.get("similarity", 0),
            })
        else:
            gaps.append({
                "feature": f.get("description", ""),
                "coverage": coverage,
            })

    return {
        "overlaps": overlaps,
        "gaps": gaps,
        "overlap_count": len(overlaps),
        "gap_count": len(gaps),
    }


def _build_differentiators(features: list) -> dict:
    """Identify features that appear to have the least prior-art coverage."""
    differentiators = []

    for f in features:
        coverage = f.get("coverage", "none")
        if coverage in ("none", "low"):
            differentiators.append({
                "feature_id": f.get("id", ""),
                "description": f.get("description", ""),
                "coverage": coverage,
                "explanation": (
                    f"This feature has {'no' if coverage == 'none' else 'minimal'} "
                    f"prior art in the indexed sources. It may represent a novel contribution, "
                    f"though unpublished or non-indexed work may exist."
                ),
            })

    return {
        "count": len(differentiators),
        "features": differentiators,
        "disclaimer": (
            "Potential differentiators are based on the absence of evidence in indexed sources. "
            "This does not guarantee novelty — unpublished research, trade secrets, and non-English "
            "publications are not covered by this analysis."
        ),
    }


def _build_assessment_section(scores: dict) -> dict:
    return {
        "scores": {
            name: {
                "value": data["score"],
                "explanation": data["explanation"],
                "references": data.get("references", []),
            }
            for name, data in scores.items()
        },
    }


def _build_confidence_section(scores: dict, limitations: list) -> dict:
    search_conf = scores.get("search_confidence", {})
    return {
        "confidence_score": search_conf.get("score", 0),
        "explanation": search_conf.get("explanation", ""),
        "limitations": limitations,
        "not_covered": [
            "Private or unpublished research",
            "Paywalled journal full-text content",
            "Non-English language publications",
            "Chinese, Japanese, Korean patent databases",
            "Corporate trade secrets and internal R&D",
            "GitHub repositories and open-source projects (planned for future)",
            "Technical standards (IETF, 3GPP, IEEE) full-text",
        ],
    }


def _build_next_steps(scores: dict, features: list) -> dict:
    novelty = scores.get("feature_novelty", {}).get("score", 50)
    density = scores.get("prior_art_density", {}).get("score", 50)
    distinctiveness = scores.get("combination_distinctiveness", {}).get("score", 50)

    steps = []

    if novelty > 60 and distinctiveness > 60:
        steps.append({
            "action": "Consider Patent Protection",
            "reason": (
                f"Feature novelty ({novelty:.0f}/100) and combination distinctiveness "
                f"({distinctiveness:.0f}/100) suggest potentially patentable elements. "
                f"Consult a patent attorney for a professional patentability assessment."
            ),
            "urgency": "high",
        })

    if density > 50:
        steps.append({
            "action": "Conduct Deep-Dive Literature Review",
            "reason": (
                f"Prior art density is {density:.0f}/100. Review the specific documents "
                f"cited in this report to understand exactly how existing work relates "
                f"to your innovation."
            ),
            "urgency": "medium",
        })

    steps.append({
        "action": "Refine and Document Your Innovation",
        "reason": (
            "Use this report to identify your unique differentiators. "
            "Strengthen your innovation description by explicitly addressing "
            "how your approach differs from the prior art identified."
        ),
        "urgency": "medium",
    })

    if novelty > 40:
        steps.append({
            "action": "Explore Commercialization Paths",
            "reason": (
                "Your innovation has features with limited prior art. Consider: "
                "licensing to industry partners, filing a provisional patent ($80 USPTO), "
                "publishing a defensive disclosure, or funding development through crowdfunding."
            ),
            "urgency": "low",
        })

    steps.append({
        "action": "Set Up Prior-Art Monitoring",
        "reason": (
            "New research is published daily. Set up monitoring alerts "
            "to track new publications related to your innovation's key features."
        ),
        "urgency": "low",
    })

    return {
        "steps": steps,
        "disclaimer": (
            "These recommendations are based on automated analysis of indexed sources. "
            "They do not constitute legal, business, or investment advice. "
            "Consult qualified professionals before making IP or business decisions."
        ),
    }
