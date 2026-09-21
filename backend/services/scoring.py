"""
Innovation Assessment Engine — Computes multi-dimensional scoring metrics for an innovation
based on its feature matrix and prior-art analysis.

Produces 6 evidence-backed scores, each with an explanation and supporting references.
No gamified labels. Just honest numbers with rationale.
"""
import asyncio
import json
import os
from datetime import datetime, timezone

import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
MODEL_NAME = os.getenv("GEMINI_MODEL", "gemini-flash-lite-latest")


def compute_prior_art_density(features: list[dict]) -> dict:
    """
    Prior Art Density (0-100): How much existing work covers the idea's features.
    High = lots of prior art exists. Low = little was found.
    """
    if not features:
        return {"score": 0, "explanation": "No features to analyze.", "references": []}

    total_matches = 0
    high_coverage_count = 0
    references = []

    for f in features:
        matches = f.get("total_matches", 0)
        total_matches += matches
        coverage = f.get("coverage", "none")
        if coverage == "high":
            high_coverage_count += 1
            # Track the top match as reference
            if f.get("prior_art"):
                top = f["prior_art"][0]
                references.append(f"{top.get('title', 'Unknown')} ({top.get('source', 'unknown')}, {top.get('similarity', 0):.0%} match)")

    density = min(100, (total_matches / max(len(features), 1)) * 5)
    # Adjust by coverage distribution
    coverage_ratio = high_coverage_count / max(len(features), 1)
    density = density * 0.6 + coverage_ratio * 100 * 0.4

    explanation = (
        f"Found {total_matches} total prior-art documents across {len(features)} features. "
        f"{high_coverage_count}/{len(features)} features have HIGH coverage. "
    )
    if density > 70:
        explanation += "Significant existing work covers most aspects of this idea."
    elif density > 40:
        explanation += "Moderate prior art exists, with some features well-covered and others less so."
    else:
        explanation += "Limited prior art was found, suggesting relatively unexplored territory."

    return {"score": round(density, 1), "explanation": explanation, "references": references[:5]}


def compute_feature_novelty(features: list[dict]) -> dict:
    """
    Feature Novelty (0-100): Percentage of features with low or no prior-art coverage.
    High = more novel features. Low = most features are well-documented.
    """
    if not features:
        return {"score": 0, "explanation": "No features to analyze.", "references": []}

    novel_features = []
    covered_features = []

    for f in features:
        coverage = f.get("coverage", "none")
        if coverage in ("none", "low"):
            novel_features.append(f.get("description", "Unknown"))
        else:
            covered_features.append(f.get("description", "Unknown"))

    novelty = (len(novel_features) / len(features)) * 100

    explanation = (
        f"{len(novel_features)}/{len(features)} features show low or no prior-art coverage. "
    )
    if novel_features:
        explanation += f"Potentially novel features: {'; '.join(novel_features[:3])}."
    if covered_features:
        explanation += f" Well-covered features: {'; '.join(covered_features[:3])}."

    return {
        "score": round(novelty, 1),
        "explanation": explanation,
        "references": [f"Novel: {f}" for f in novel_features[:5]],
    }


def compute_combination_distinctiveness(features: list[dict]) -> dict:
    """
    Combination Distinctiveness (0-100): Does this specific combination of features
    appear together in any single document?

    This is the key insight: individual features may exist, but the specific combination
    might be unique.
    """
    if not features:
        return {"score": 0, "explanation": "No features to analyze.", "references": []}

    # Check if any single document appears across multiple features
    doc_feature_count: dict[str, list[str]] = {}

    for f in features:
        for art in f.get("prior_art", []):
            title = art.get("title", "").lower().strip()
            if title:
                if title not in doc_feature_count:
                    doc_feature_count[title] = []
                doc_feature_count[title].append(f.get("id", "?"))

    # Find documents that cover the most features
    max_overlap = 0
    overlap_doc = ""
    for title, feature_ids in doc_feature_count.items():
        unique_features = len(set(feature_ids))
        if unique_features > max_overlap:
            max_overlap = unique_features
            overlap_doc = title

    # Distinctiveness is inverse of overlap
    overlap_ratio = max_overlap / max(len(features), 1)
    distinctiveness = (1 - overlap_ratio) * 100

    explanation = ""
    if max_overlap <= 1:
        explanation = (
            "No single document was found covering more than one feature of this idea. "
            "The specific combination appears to be distinctive."
        )
    elif max_overlap < len(features) * 0.5:
        explanation = (
            f"The closest single document covers {max_overlap}/{len(features)} features "
            f"(\"{overlap_doc[:80]}...\"). The full combination has partial overlap but "
            f"no single source replicates it entirely."
        )
    else:
        explanation = (
            f"A single document covers {max_overlap}/{len(features)} features "
            f"(\"{overlap_doc[:80]}...\"). The combination has significant overlap with existing work."
        )

    references = []
    if overlap_doc:
        references.append(f"Highest-overlap document: \"{overlap_doc[:100]}\" ({max_overlap} features)")

    return {"score": round(distinctiveness, 1), "explanation": explanation, "references": references}


def compute_research_freshness(features: list[dict]) -> dict:
    """
    Research Freshness (0-100): Average recency of the closest matching papers.
    High = closest prior art is very recent (active research area).
    Low = closest prior art is old (established/dormant field).
    """
    if not features:
        return {"score": 0, "explanation": "No features to analyze.", "references": []}

    current_year = datetime.now().year
    years = []
    recent_refs = []

    for f in features:
        for art in f.get("prior_art", []):
            date_str = art.get("publication_date") or art.get("metadata", {}).get("publication_date")
            if date_str:
                try:
                    year = int(str(date_str)[:4])
                    if 1950 < year <= current_year:
                        years.append(year)
                        if year >= current_year - 2:
                            recent_refs.append(f"{art.get('title', 'Unknown')[:60]} ({year})")
                except (ValueError, TypeError):
                    continue

    if not years:
        return {
            "score": 50,
            "explanation": "Could not determine publication dates for prior art. Score is neutral.",
            "references": [],
        }

    avg_age = current_year - (sum(years) / len(years))
    # Freshness: 0-2 years old = 100, 10+ years = 0
    freshness = max(0, min(100, 100 - (avg_age * 10)))

    explanation = (
        f"Average age of closest prior art: {avg_age:.1f} years. "
        f"{'This is a very active research area with recent publications.' if freshness > 70 else ''}"
        f"{'Research activity is moderate.' if 30 <= freshness <= 70 else ''}"
        f"{'Most related work is older, suggesting a mature or dormant field.' if freshness < 30 else ''}"
    )

    return {"score": round(freshness, 1), "explanation": explanation, "references": recent_refs[:5]}


def compute_evidence_strength(features: list[dict]) -> dict:
    """
    Evidence Strength (0-100): Quality and reliability of the sources found.
    Patents > peer-reviewed papers > preprints > other.
    """
    if not features:
        return {"score": 0, "explanation": "No features to analyze.", "references": []}

    source_weights = {"uspto": 1.0, "openalex": 0.8, "arxiv": 0.6}
    total_weighted = 0
    total_count = 0
    source_counts = {"openalex": 0, "arxiv": 0, "uspto": 0}
    evidence_refs = []

    for f in features:
        for art in f.get("prior_art", []):
            source = art.get("source", "openalex")
            sim = art.get("similarity", 0)
            weight = source_weights.get(source, 0.5)
            total_weighted += sim * weight
            total_count += 1
            source_counts[source] = source_counts.get(source, 0) + 1

            # Track documents with actual evidence sentences
            if art.get("evidence_sentence"):
                evidence_refs.append(
                    f"{art['title'][:50]} - \"{art['evidence_sentence'][:60]}...\""
                )

    if total_count == 0:
        return {"score": 0, "explanation": "No prior-art documents found.", "references": []}

    strength = (total_weighted / total_count) * 100

    explanation = (
        f"Sources: {source_counts.get('openalex', 0)} papers, "
        f"{source_counts.get('arxiv', 0)} preprints, "
        f"{source_counts.get('uspto', 0)} patents. "
        f"{len(evidence_refs)} documents had extractable evidence sentences. "
    )
    if strength > 60:
        explanation += "Strong evidence from high-quality sources."
    elif strength > 30:
        explanation += "Moderate evidence with mixed source quality."
    else:
        explanation += "Weak evidence; results are mostly low-similarity matches."

    return {"score": round(strength, 1), "explanation": explanation, "references": evidence_refs[:5]}


def compute_search_confidence(features: list[dict], sources_searched: list[str]) -> dict:
    """
    Search Confidence (0-100): How thorough was our search?
    Reflects coverage of available databases and result quality.
    """
    # Base confidence from number of sources searched
    source_confidence = min(len(sources_searched) / 3, 1.0) * 40  # Max 40 from sources

    # Result quality confidence
    features_with_results = sum(1 for f in features if f.get("total_matches", 0) > 0)
    result_confidence = (features_with_results / max(len(features), 1)) * 40  # Max 40

    # Evidence confidence
    features_with_evidence = sum(
        1 for f in features
        if any(art.get("evidence_sentence") for art in f.get("prior_art", []))
    )
    evidence_confidence = (features_with_evidence / max(len(features), 1)) * 20  # Max 20

    confidence = source_confidence + result_confidence + evidence_confidence

    explanation = (
        f"Searched {len(sources_searched)} source(s). "
        f"{features_with_results}/{len(features)} features returned results. "
        f"{features_with_evidence}/{len(features)} features have sentence-level evidence. "
    )

    limitations = [
        "Does not cover: private/unpublished research, paywalled journal full-texts.",
        "Does not cover: non-English publications, Chinese/Japanese/Korean patent databases.",
        "Does not cover: corporate trade secrets or internal R&D.",
        "Results represent an evidence-based assessment, not a legal determination.",
    ]

    return {
        "score": round(confidence, 1),
        "explanation": explanation,
        "references": limitations,
    }


async def generate_assessment_summary(
    structured_idea: dict,
    scores: dict,
    features: list[dict],
) -> str:
    """
    Use Gemini to generate a 3-paragraph natural-language assessment summary.
    """
    model = genai.GenerativeModel(
        MODEL_NAME,
        generation_config=genai.GenerationConfig(temperature=0.3),
    )

    prompt = f"""You are an innovation analyst for InnovX. Write a concise, honest, 3-paragraph assessment summary.

INNOVATION: {structured_idea.get('title', 'Unknown')}
DOMAIN: {structured_idea.get('domain', 'Unknown')}
PROBLEM: {structured_idea.get('problem_statement', 'Unknown')}

SCORES:
- Prior Art Density: {scores['prior_art_density']['score']}/100 — {scores['prior_art_density']['explanation']}
- Feature Novelty: {scores['feature_novelty']['score']}/100 — {scores['feature_novelty']['explanation']}
- Combination Distinctiveness: {scores['combination_distinctiveness']['score']}/100 — {scores['combination_distinctiveness']['explanation']}
- Research Freshness: {scores['research_freshness']['score']}/100 — {scores['research_freshness']['explanation']}
- Evidence Strength: {scores['evidence_strength']['score']}/100 — {scores['evidence_strength']['explanation']}
- Search Confidence: {scores['search_confidence']['score']}/100 — {scores['search_confidence']['explanation']}

FEATURES ANALYZED: {len(features)}

RULES:
1. Paragraph 1: Overall assessment — what the scores tell us about the innovation's landscape.
2. Paragraph 2: Key strengths — which features appear novel and why.
3. Paragraph 3: Key risks — where prior art is dense and what this means for the creator.
4. Be honest. If the idea has significant prior art, say so. If it appears novel, explain why cautiously.
5. NEVER claim the idea is patentable or not patentable. You are not a patent attorney.
6. Always note that this is based on indexed sources only and may not reflect unpublished work.
7. Maximum 250 words total."""

    try:
        response = await asyncio.to_thread(model.generate_content, prompt)
        return response.text
    except Exception as e:
        return (
            f"Assessment summary generation failed: {str(e)}. "
            f"Please review the individual scores and evidence above for your analysis."
        )


def compute_all_scores(
    features_data: list[dict],
    sources_searched: list[str],
) -> dict:
    """
    Compute all 6 assessment metrics from feature analysis data.

    Args:
        features_data: List of feature dicts with prior_art, coverage, total_matches.
        sources_searched: List of source names that were searched.

    Returns:
        Dict with all 6 scores, each containing score, explanation, references.
    """
    return {
        "prior_art_density": compute_prior_art_density(features_data),
        "feature_novelty": compute_feature_novelty(features_data),
        "combination_distinctiveness": compute_combination_distinctiveness(features_data),
        "research_freshness": compute_research_freshness(features_data),
        "evidence_strength": compute_evidence_strength(features_data),
        "search_confidence": compute_search_confidence(features_data, sources_searched),
    }
