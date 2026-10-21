"""
Unit and integration tests for Crowdfunding Campaign Generator (Day 22 / Week 4 Build Path).
Tests:
1. Campaign schema validation and defaults
2. Fallback and deterministic generation
3. 60-second video scene structure
4. 4-tier reward pricing and discount calculations
5. Pre-launch IP disclosure advisory compliance
6. FastAPI route registration for all /api/campaigns endpoints
"""
import sys
import os
import asyncio

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from models.schemas import (
    CrowdfundingCampaign,
    CampaignRewardTier,
    CampaignVideoScene,
    CampaignRoadmapMilestone,
    CampaignFaqItem,
    CampaignResponse,
    CampaignUpdateRequest,
)
from services import campaign_gen


def test_1_campaign_schemas():
    print("\n--- [TEST 1] Campaign Schema Validation ---")
    mock_tier = CampaignRewardTier(
        tier_id="tier_early_bird",
        title="Super Early Bird",
        pledge_amount=79,
        currency="USD",
        retail_price=109,
        discount_percentage=28,
        description="Exclusive early backer package.",
        estimated_delivery="4 months",
        items_included=["Core Device", "USB Cable"],
        backer_limit=100,
        is_featured=True,
    )
    assert mock_tier.pledge_amount == 79
    assert mock_tier.discount_percentage == 28

    mock_scene = CampaignVideoScene(
        scene_number=1,
        timestamp_range="0:00 - 0:10",
        visual_description="Frustrated engineer troubleshooting manual setup.",
        voiceover_script="Manual calibration takes hours.",
        on_screen_text="Stop Wasting Time.",
    )
    assert mock_scene.scene_number == 1
    assert "0:00" in mock_scene.timestamp_range
    print("[OK] Campaign reward tier and video scene schemas validated.")


def test_2_campaign_deterministic_generation():
    print("\n--- [TEST 2] Deterministic Campaign Generation ---")
    sample_inno = {
        "id": "11111111-2222-3333-4444-555555555555",
        "title": "Miniature Pen-Plotter Robot for Automated Image Drawing",
        "raw_input": "A desktop robot that draws vector images using standard pens.",
        "structured_data": {
            "domain": "Robotics & Maker Tech",
            "problem_statement": "Manual technical drawing and sketching is time-consuming and prone to human error.",
            "proposed_solution": "A compact dual-stepper CoreXY pen plotter with sub-millimeter precision.",
            "key_features": [
                {"id": "F1", "description": "CoreXY gantry mechanism with minimal inertia"},
                {"id": "F2", "description": "Universal servo-driven pen lift mechanism"},
                {"id": "F3", "description": "G-code streaming via WebUSB browser interface"},
            ],
        },
    }

    campaign = campaign_gen._build_fallback_campaign(sample_inno)
    assert campaign.funding_goal == 15000
    assert len(campaign.reward_tiers) == 4
    assert len(campaign.video_script) == 4
    assert len(campaign.campaign_milestones) == 4
    assert len(campaign.risks_and_challenges) >= 3
    assert "CRITICAL PRE-LAUNCH IP ADVISORY" in campaign.pre_launch_ip_advisory

    # Check tier pricing logic: Early bird must be lower than retail
    early_bird = next(t for t in campaign.reward_tiers if t.tier_id == "tier_early_bird")
    assert early_bird.pledge_amount < early_bird.retail_price
    assert early_bird.discount_percentage > 0

    print(f"[OK] Campaign generated: '{campaign.title}' with {len(campaign.reward_tiers)} reward tiers and 60s video script.")


def test_3_fastapi_campaign_routes():
    print("\n--- [TEST 3] FastAPI Route Registration ---")
    from main import app

    openapi_paths = app.openapi()["paths"]
    expected_endpoints = [
        ("/api/campaigns/generate/{innovation_id}", "post"),
        ("/api/campaigns/{innovation_id}", "get"),
        ("/api/campaigns/{innovation_id}", "put"),
        ("/api/campaigns/{innovation_id}/export", "post"),
    ]

    for path, method in expected_endpoints:
        assert path in openapi_paths, f"Endpoint {path} missing in FastAPI routes!"
        assert method in openapi_paths[path], f"Method {method.upper()} on {path} missing!"
        print(f"  [OK] {method.upper()} {path} registered and documented.")


if __name__ == "__main__":
    print("=" * 70)
    print("INNOVX DAY 22 CROWDFUNDING CAMPAIGN GENERATOR TEST SUITE")
    print("=" * 70)

    test_1_campaign_schemas()
    test_2_campaign_deterministic_generation()
    test_3_fastapi_campaign_routes()

    print("\n" + "=" * 70)
    print("[ALL DAY 22 CAMPAIGN GENERATOR TESTS PASSED - 100% SUCCESS]")
    print("=" * 70)
