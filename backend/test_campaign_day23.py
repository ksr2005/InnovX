"""
Automated Verification Test Suite for Day 23:
Crowdfunding Multi-Platform Export & Platform Guides.
Verifies:
1. Platform guidelines & submission checklists for Kickstarter, Indiegogo, and Crowd Supply.
2. Platform-specific markdown formatting (Kickstarter, Indiegogo, Crowd Supply).
3. ReportLab branded PDF generation (generate_campaign_pdf) returning valid bytes.
4. FastAPI endpoints registered (/guides, /{id}/export, /{id}/pdf).
"""
import io
import asyncio
from models.schemas import (
    CrowdfundingCampaign,
    CampaignRewardTier,
    CampaignVideoScene,
    CampaignRoadmapMilestone,
    CampaignFaqItem,
)
from services import campaign_export
from main import app


def test_platform_guides():
    print("--- [TEST 1] Platform Guides & Checklists ---")
    guides = campaign_export.get_platform_guides()
    assert "kickstarter" in guides, "Kickstarter guide missing"
    assert "indiegogo" in guides, "Indiegogo guide missing"
    assert "crowdsupply" in guides, "Crowd Supply guide missing"

    ks = guides["kickstarter"]
    assert len(ks["checklist"]) >= 5, "Kickstarter checklist too small"
    assert any(c["id"] == "ks-3" for c in ks["checklist"]), "Pre-launch patent checklist missing"

    cs = guides["crowdsupply"]
    assert "Mouser" in cs["tagline"] or "Mouser" in cs["funding_model"], "Mouser logistics missing from Crowd Supply"
    print("[OK] All 3 platform guides and checklists validated successfully.")


def test_platform_exports():
    print("\n--- [TEST 2] Multi-Platform Markdown Formatters ---")
    mock_campaign = CrowdfundingCampaign(
        innovation_id="test-inno-23",
        platform="kickstarter",
        title="Compact CNC Laser Diode Cutter",
        tagline="Sub-millimeter precision bench laser cutter for prototyping labs.",
        funding_goal=25000,
        currency="USD",
        duration_days=30,
        origin_story="Engineers spent hours waiting for external PCB fab. We built an in-house desktop solution.",
        technical_mechanism_pitch="Integrated 450nm diode with dual-axis optical stabilization.",
        prototype_stage="Functional Working Prototype",
        fund_allocation_breakdown=[
            {"category": "Tooling", "percentage": 45},
            {"category": "Components", "percentage": 30},
            {"category": "Testing", "percentage": 15},
            {"category": "Buffer", "percentage": 10},
        ],
        reward_tiers=[
            CampaignRewardTier(
                tier_id="tier_1",
                title="Super Early Bird",
                pledge_amount=199,
                retail_price=299,
                discount_percentage=33,
                description="First 50 makers get the complete unit.",
                estimated_delivery="4 Months",
                items_included=["Laser Diode Unit", "Safety Goggles", "USB Cable"],
                backer_limit=50,
            )
        ],
        video_script=[
            CampaignVideoScene(
                scene_number=1,
                timestamp_range="0:00 - 0:10",
                visual_description="Close-up of laser etching steel plate.",
                voiceover_script="Prototyping shouldn't take weeks. It should take minutes.",
                on_screen_text="Instant Lab Prototyping",
            )
        ],
        risks_and_challenges=["Laser diode supply chain lead times of 8 weeks."],
        campaign_milestones=[
            CampaignRoadmapMilestone(
                phase_name="Launch Surge",
                days_range="Days 1 - 7",
                focus_goal="Reach 100% funding goal",
                tactics=["Email newsletter blast", "Reddit maker post"],
            )
        ],
        faq_items=[
            CampaignFaqItem(question="Is it eye-safe?", answer="Includes Class 1 certified interlock hood.")
        ],
        pre_launch_ip_advisory="Advisory: US 1-year grace period vs EPC Art 54 absolute novelty.",
    )

    # 1. Kickstarter
    ks_md = campaign_export.export_kickstarter_format(mock_campaign)
    assert "KICKSTARTER PROTOTYPE POLICY DECLARATION" in ks_md, "Kickstarter policy notice missing"
    assert "Super Early Bird" in ks_md, "Reward tier missing from Kickstarter export"
    print(f"[OK] Kickstarter markdown verified ({len(ks_md.split())} words).")

    # 2. Indiegogo
    igg_md = campaign_export.export_indiegogo_format(mock_campaign)
    assert "1. SHORT SUMMARY" in igg_md, "Indiegogo Short Summary missing"
    assert "2. WHAT WE NEED & WHAT YOU GET" in igg_md, "Indiegogo What We Need missing"
    print(f"[OK] Indiegogo pitch verified ({len(igg_md.split())} words).")

    # 3. Crowd Supply
    cs_md = campaign_export.export_crowdsupply_format(mock_campaign)
    assert "MOUSER ELECTRONICS" in cs_md, "Mouser Electronics distribution section missing"
    assert "OPEN SOURCE HARDWARE" in cs_md, "Crowd Supply OSHW section missing"
    print(f"[OK] Crowd Supply specification verified ({len(cs_md.split())} words).")


def test_pdf_generation():
    print("\n--- [TEST 3] ReportLab PDF Generation ---")
    mock_campaign = CrowdfundingCampaign(
        innovation_id="test-inno-23",
        platform="kickstarter",
        title="Compact CNC Laser Diode Cutter",
        tagline="Sub-millimeter precision bench laser cutter for prototyping labs.",
        funding_goal=25000,
        currency="USD",
        duration_days=30,
        origin_story="Engineers spent hours waiting for external PCB fab. We built an in-house desktop solution.",
        technical_mechanism_pitch="Integrated 450nm diode with dual-axis optical stabilization.",
        prototype_stage="Functional Working Prototype",
        fund_allocation_breakdown=[
            {"category": "Tooling", "percentage": 45},
            {"category": "Components", "percentage": 30},
            {"category": "Testing", "percentage": 15},
            {"category": "Buffer", "percentage": 10},
        ],
        reward_tiers=[
            CampaignRewardTier(
                tier_id="tier_1",
                title="Super Early Bird",
                pledge_amount=199,
                retail_price=299,
                discount_percentage=33,
                description="First 50 makers get the complete unit.",
                estimated_delivery="4 Months",
                items_included=["Laser Diode Unit", "Safety Goggles", "USB Cable"],
                backer_limit=50,
            )
        ],
        video_script=[
            CampaignVideoScene(
                scene_number=1,
                timestamp_range="0:00 - 0:10",
                visual_description="Close-up of laser etching steel plate.",
                voiceover_script="Prototyping shouldn't take weeks. It should take minutes.",
                on_screen_text="Instant Lab Prototyping",
            )
        ],
        risks_and_challenges=["Laser diode supply chain lead times of 8 weeks."],
        campaign_milestones=[
            CampaignRoadmapMilestone(
                phase_name="Launch Surge",
                days_range="Days 1 - 7",
                focus_goal="Reach 100% funding goal",
                tactics=["Email newsletter blast", "Reddit maker post"],
            )
        ],
        faq_items=[
            CampaignFaqItem(question="Is it eye-safe?", answer="Includes Class 1 certified interlock hood.")
        ],
        pre_launch_ip_advisory="Advisory: US 1-year grace period vs EPC Art 54 absolute novelty.",
    )

    pdf_buf = campaign_export.generate_campaign_pdf(mock_campaign)
    assert isinstance(pdf_buf, io.BytesIO), "generate_campaign_pdf did not return BytesIO"
    pdf_bytes = pdf_buf.getvalue()
    assert len(pdf_bytes) > 2000, f"Generated PDF unexpectedly small: {len(pdf_bytes)} bytes"
    assert pdf_bytes.startswith(b"%PDF"), "PDF magic header missing"
    print(f"[OK] ReportLab branded PDF generated successfully ({len(pdf_bytes):,} bytes).")


def test_routes_registered():
    print("\n--- [TEST 4] FastAPI Routes Registered ---")
    openapi_paths = app.openapi()["paths"]
    
    expected_endpoints = [
        ("/api/campaigns/guides", "get"),
        ("/api/campaigns/{innovation_id}/export", "post"),
        ("/api/campaigns/{innovation_id}/pdf", "get"),
    ]

    for path, method in expected_endpoints:
        assert path in openapi_paths, f"Endpoint {path} missing in FastAPI openapi paths!"
        assert method in openapi_paths[path], f"Method {method.upper()} on {path} missing!"
        print(f"  [OK] {method.upper()} {path} registered and documented.")

    print("[OK] All Day 23 FastAPI endpoints verified in application router.")


if __name__ == "__main__":
    print("=" * 70)
    print("INNOVX DAY 23 MULTI-PLATFORM EXPORT TEST SUITE")
    print("=" * 70)
    test_platform_guides()
    test_platform_exports()
    test_pdf_generation()
    test_routes_registered()
    print("\n" + "=" * 70)
    print("[ALL DAY 23 MULTI-PLATFORM EXPORT TESTS PASSED - 100% SUCCESS]")
    print("=" * 70)
