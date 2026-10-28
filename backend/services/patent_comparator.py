"""
InnovX Claim-by-Claim Competitor Patent Comparator & Design-Around Engine.
Performs fine-grained claim alignment between a creator's invention features
and a cited competitor patent, evaluating overlap, infringement exposure,
and tactical design-around engineering recommendations.
"""
from typing import Any, Dict, List, Optional
import numpy as np


def compare_invention_against_competitor(
    creator_title: str,
    creator_features: List[Dict[str, Any]],
    competitor_title: str,
    competitor_claims_or_text: str,
) -> Dict[str, Any]:
    """
    Evaluates creator features against competitor claims to generate:
    - Overlapping claim elements
    - Distinct novelty differentiators
    - Infringement risk gauge (Low, Moderate, High)
    - Actionable design-around modifications
    """
    from services.similarity import compute_similarity

    overlaps = []
    differentiators = []
    claim_scores = []

    comp_clean = competitor_claims_or_text.lower()

    for idx, feat in enumerate(creator_features):
        feat_desc = feat.get("description", "") if isinstance(feat, dict) else str(feat)
        # Compute semantic similarity against competitor text
        sim = compute_similarity(feat_desc, competitor_claims_or_text)
        claim_scores.append(sim)

        if sim >= 0.65:
            overlaps.append({
                "feature_id": f"F{idx+1}",
                "feature_description": feat_desc,
                "similarity_score": round(sim, 3),
                "risk_level": "High" if sim >= 0.80 else "Moderate",
                "analysis": f"Substantial architectural overlap ({int(sim*100)}%) detected with competitor claim scope.",
            })
        else:
            differentiators.append({
                "feature_id": f"F{idx+1}",
                "feature_description": feat_desc,
                "similarity_score": round(sim, 3),
                "novelty_signal": "High Distinctiveness" if sim < 0.45 else "Moderate Distinction",
                "analysis": f"Competitor patent lacks equivalent mechanism ({int(sim*100)}% similarity). Prime candidate for independent claim defense.",
            })

    avg_overlap = float(np.mean(claim_scores)) if claim_scores else 0.4
    overlap_pct = int(avg_overlap * 100)

    if overlap_pct >= 70:
        risk_rating = "High Infringement Exposure"
        risk_color = "destructive"
        risk_summary = "High semantic collision with cited art. Independent apparatus claims may face 35 U.S.C. 102/103 rejections without claim narrowing."
    elif overlap_pct >= 50:
        risk_rating = "Moderate / Design-Around Required"
        risk_color = "warning"
        risk_summary = "Partial overlap identified on core mechanisms. Differentiating features provide strong basis for dependent claim circumvention."
    else:
        risk_rating = "Low Infringement Risk (High FTO)"
        risk_color = "success"
        risk_summary = "Substantial Freedom-to-Operate (FTO). The cited patent operates in an adjacent problem space with distinct architectural mechanisms."

    # Generate Tactical Design-Around Recommendations
    design_arounds = [
        f"Narrow claim 1 by introducing negative limitations regarding {differentiators[0]['feature_description'][:80] if differentiators else 'distinctive edge processing'} to explicitly exclude competitor embodiments.",
        f"Draft method claims focusing on dynamic closed-loop response rather than static component arrangement to avoid direct apparatus collision.",
        f"Incorporate specific sensor threshold parameters and physical geometry constraints to distinguish novelty under MPEP 2144.",
    ]

    return {
        "creator_title": creator_title,
        "competitor_title": competitor_title,
        "overall_overlap_percentage": overlap_pct,
        "risk_rating": risk_rating,
        "risk_color": risk_color,
        "risk_summary": risk_summary,
        "overlapping_features": overlaps,
        "differentiating_features": differentiators,
        "design_around_recommendations": design_arounds,
        "freedom_to_operate_index": max(10, 100 - overlap_pct),
    }
