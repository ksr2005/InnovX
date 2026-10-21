"""
Crowdfunding Campaign Generator Service (Day 22 / Week 4 Build Path).
Produces complete Kickstarter and Indiegogo campaign packages from structured innovation data,
including campaign pitch story, 4-tier reward system, 60-second video script,
risk mitigation strategies, and pre-launch IP disclosure advisory.
"""
import os
import re
import json
import asyncio
from datetime import datetime, timezone
from typing import Any, Optional

import google.generativeai as genai
from dotenv import load_dotenv

from models.schemas import (
    CrowdfundingCampaign,
    CampaignRewardTier,
    CampaignVideoScene,
    CampaignRoadmapMilestone,
    CampaignFaqItem,
)

load_dotenv()

# Configure Gemini
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
MODEL_NAME = os.getenv("GEMINI_MODEL", "gemini-flash-lite-latest")

PRE_LAUNCH_IP_ADVISORY = (
    "CRITICAL PRE-LAUNCH IP ADVISORY: Publicly launching a crowdfunding campaign on Kickstarter or Indiegogo "
    "constitutes an enabling public disclosure under patent law worldwide. In absolute novelty jurisdictions "
    "(such as the European Patent Office, Japan, and China), launching a public campaign permanently forfeits your "
    "ability to obtain patent protection. In the United States, launching triggers a strict 1-year grace period clock. "
    "InnovX strongly advises filing a Provisional Patent Application (Protect Path) or verifying your IP strategy "
    "before publishing live campaign materials."
)

DEFAULT_FUND_ALLOCATION = [
    {"category": "Tooling & Manufacturing Setup", "percentage": 40},
    {"category": "Component Sourcing & Bill of Materials", "percentage": 30},
    {"category": "Compliance, Certification & Testing (FCC/CE)", "percentage": 15},
    {"category": "Packaging, Fulfillment & Contingency Buffer", "percentage": 15},
]


def _build_fallback_campaign(inno: dict) -> CrowdfundingCampaign:
    """Generate a high-quality deterministic campaign package if LLM is unavailable."""
    title = inno.get("title", "Hardware Innovation")
    struct = inno.get("structured_data") or {}
    problem = struct.get("problem_statement") or inno.get("raw_input", "Technical challenge requiring modern engineering.")
    solution = struct.get("proposed_solution") or "A novel technical architecture designed for reliability and performance."
    domain = struct.get("domain") or "Hardware & Automation"
    features = struct.get("key_features") or []

    feature_bullets = "\n".join([f"- **{f.get('id', 'F')}:** {f.get('description', '')}" for f in features[:4]]) or "- High-efficiency precision control mechanism\n- Modular open architecture\n- Low-power embedded processing"

    reward_tiers = [
        CampaignRewardTier(
            tier_id="tier_early_bird",
            title="Early Bird Backer Edition",
            pledge_amount=79,
            currency="USD",
            retail_price=109,
            discount_percentage=28,
            description=f"Be among the first 100 creators to back {title}. Includes the complete early production hardware unit, pre-flashed firmware, and exclusive founder community badge.",
            estimated_delivery="4 months after campaign close",
            items_included=[f"{title} Base Unit", "USB-C High-Speed Cable", "Founder Backer Certificate", "Early Access Firmware Updates"],
            backer_limit=100,
            is_featured=True,
        ),
        CampaignRewardTier(
            tier_id="tier_standard",
            title="Standard Backer Edition",
            pledge_amount=99,
            currency="USD",
            retail_price=119,
            discount_percentage=17,
            description=f"The complete retail package of {title}. Ready to unbox and deploy immediately with step-by-step documentation and full accessory kit.",
            estimated_delivery="5 months after campaign close",
            items_included=[f"{title} Hardware Unit", "Complete Accessory Kit", "Quick-Start User Manual", "1-Year Hardware Warranty"],
            backer_limit=500,
            is_featured=False,
        ),
        CampaignRewardTier(
            tier_id="tier_developer_kit",
            title="Developer & Maker Pro Kit",
            pledge_amount=169,
            currency="USD",
            retail_price=219,
            discount_percentage=23,
            description="Designed for engineers, hackers, and researchers. Includes full development headers, extended sensor peripherals, open SDK access, and custom acrylic test fixture.",
            estimated_delivery="4 months after campaign close",
            items_included=[f"{title} Developer Edition", "Debug Bridge & Sensor Expansion Pack", "Full SDK & API Documentation", "Direct Engineering Slack Access"],
            backer_limit=250,
            is_featured=False,
        ),
        CampaignRewardTier(
            tier_id="tier_founding_partner",
            title="Founding Collector & Lab Tier",
            pledge_amount=499,
            currency="USD",
            retail_price=699,
            discount_percentage=29,
            description="Exclusive tier for institutional labs and lead backers. Includes 2 complete units, engraved founder serial numbering, and a 1-on-1 technical roadmap session with the inventors.",
            estimated_delivery="3 months after campaign close",
            items_included=["2x Special Edition Units with Custom Laser Engraving", "1-Hour Technical Consultation with Engineering Team", "Permanent VIP Founder Credit on Official Site", "Beta Tester Access to Future Hardware Revisions"],
            backer_limit=25,
            is_featured=False,
        ),
    ]

    video_script = [
        CampaignVideoScene(
            scene_number=1,
            timestamp_range="0:00 - 0:10",
            visual_description="Close-up macro shot of the existing cumbersome equipment failing or causing creator frustration, transitioning to the sleek silhouette of the prototype.",
            voiceover_script=f"Every creator knows the frustration of {problem[:90]}... Until now.",
            on_screen_text=f"The Old Way is Broken. Meet {title}.",
        ),
        CampaignVideoScene(
            scene_number=2,
            timestamp_range="0:10 - 0:25",
            visual_description="Smooth tabletop pan showing the working prototype in action. Precision movements executing with speed and zero jitter.",
            voiceover_script=f"We built {title} from the ground up: an intelligent {domain.lower()} solution that {solution[:110]}.",
            on_screen_text="Precision Engineering. Field-Tested Reliability.",
        ),
        CampaignVideoScene(
            scene_number=3,
            timestamp_range="0:25 - 0:45",
            visual_description="Fast-paced demo montage highlighting key hardware features, modular assembly, and the intuitive software interface.",
            voiceover_script="With our custom architecture, you get unmatched repeatability, plug-and-play setup in under 5 minutes, and full developer extensibility.",
            on_screen_text="5-Minute Setup • Open Architecture • Production Ready",
        ),
        CampaignVideoScene(
            scene_number=4,
            timestamp_range="0:45 - 1:00",
            visual_description="Engineering team in the workshop assembling final validation units, smiling and holding the product. Cut to clear CTA screen.",
            voiceover_script="Our functional prototypes are complete and validated. With your backing, we can fund injection mold tooling and bring this to the world. Back us today on Kickstarter!",
            on_screen_text=f"Back {title} Today • Early Bird Tiers Live Now",
        ),
    ]

    risks = [
        "Component Sourcing & Lead Times: Global semiconductor and mechanical component supply chains can experience unexpected lead times. We have already pre-qualified 2 alternate suppliers for all critical ICs.",
        "Tooling & Manufacturing Calibration: Transitioning from CNC/3D printed functional prototypes to high-volume injection tooling can introduce minor dimensional adjustments. We have partnered with an ISO 9001 certified manufacturing partner with a 10-year track record.",
        "Regulatory Certifications: FCC, CE, and RoHS compliance testing will occur in parallel with preliminary tooling to avoid delivery schedule slippage.",
        "Delivery Schedule Buffer: We have added a conservative 45-day contingency window into our reward delivery schedule to ensure all early backers receive units on time.",
    ]

    milestones = [
        CampaignRoadmapMilestone(
            phase_name="Launch & Superbacker Surge",
            days_range="Days 1 - 7",
            focus_goal="Hit 100% of funding goal within 72 hours via early bird backer momentum.",
            tactics=[
                "Deploy VIP launch notification to VIP email list & tech community",
                "Release launch day video demonstration across YouTube & Reddit",
                "Achieve Kickstarter 'Project We Love' staff curation status",
            ],
        ),
        CampaignRoadmapMilestone(
            phase_name="Mid-Campaign Expansion & Tech Press",
            days_range="Days 8 - 14",
            focus_goal="Drive mainstream tech journalism coverage and reveal first stretch goal.",
            tactics=[
                "Distribute functional review sample units to hardware journalists",
                "Announce $30,000 Stretch Goal: Extended wireless connectivity option",
                "Host live streaming Q&A showing real-time benchmark performance",
            ],
        ),
        CampaignRoadmapMilestone(
            phase_name="Community Engagement & Developer Spotlight",
            days_range="Days 15 - 21",
            focus_goal="Convert fence-sitters with deep-dive technical tutorials and backer involvement.",
            tactics=[
                "Publish open-source API documentation and sample Python/C++ code",
                "Backer voting poll on custom anodized enclosure color options",
                "Highlight community maker adaptations and custom use-cases",
            ],
        ),
        CampaignRoadmapMilestone(
            phase_name="The Final 48-Hour Countdown",
            days_range="Days 22 - 30",
            focus_goal="Capitalize on Kickstarter's 48-hour reminder notifications to secure final surge.",
            tactics=[
                "Deploy urgent 'Last Chance for Early Bird Pricing' banner update",
                "Announce tooling order timeline and locked manufacturing schedule",
                "Host live campaign closing countdown with founding engineering team",
            ],
        ),
    ]

    faq = [
        CampaignFaqItem(
            question="When will my unit ship, and how will shipping fees be collected?",
            answer="Early Bird units will ship 4 months after campaign close. Shipping fees will be calculated and collected via our post-campaign pledge manager (PledgeBox/BackerKit) based on exact destination weights.",
        ),
        CampaignFaqItem(
            question="Is the software and firmware open source?",
            answer="Yes! Core control firmware and API client libraries will be released under an open permissive license (MIT/Apache 2.0) upon initial batch delivery.",
        ),
        CampaignFaqItem(
            question="Does the device come with a warranty?",
            answer="All backer units include a 1-year comprehensive manufacturer warranty covering all electronic and mechanical defects under normal operational use.",
        ),
        CampaignFaqItem(
            question="Can I upgrade or change my reward tier later?",
            answer="Yes, you can adjust your pledge tier or add extra accessories at any time before the live campaign concludes directly on Kickstarter.",
        ),
    ]

    now_iso = datetime.now(timezone.utc).isoformat()

    return CrowdfundingCampaign(
        id=None,
        innovation_id=inno.get("id", "temp-id"),
        platform="kickstarter",
        title=f"{title}: Next-Gen {domain} Innovation",
        tagline=f"Empowering makers and engineers with precision {solution[:75]}",
        funding_goal=15000,
        currency="USD",
        duration_days=30,
        origin_story=f"As engineers and researchers working in {domain}, we repeatedly faced a critical bottleneck: {problem}. Existing solutions were either closed, fragile, or prohibitively expensive. We spent 14 months prototyping, failing, and iterating until we created {title}—a robust, production-grade system engineered for performance.",
        technical_mechanism_pitch=f"At the heart of {title} lies our proprietary architecture:\n\n{feature_bullets}\n\nBy unifying high-speed hardware control with intuitive software integration, {title} reduces task latency by up to 65% while maintaining micron-level repeatability.",
        prototype_stage="Functional Bench Prototype with Proven Hardware Benchmarks",
        fund_allocation_breakdown=DEFAULT_FUND_ALLOCATION,
        reward_tiers=reward_tiers,
        video_script=video_script,
        risks_and_challenges=risks,
        campaign_milestones=milestones,
        faq_items=faq,
        pre_launch_ip_advisory=PRE_LAUNCH_IP_ADVISORY,
        created_at=now_iso,
        updated_at=now_iso,
    )


async def generate_crowdfunding_campaign(
    inno: dict,
    platform: str = "kickstarter",
) -> CrowdfundingCampaign:
    """
    Generate an AI-powered crowdfunding campaign draft via Google Gemini.
    Strictly follows Windows async safety (asyncio.to_thread).
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("[WARN] GEMINI_API_KEY not configured, using fallback campaign.")
        return _build_fallback_campaign(inno)

    title = inno.get("title", "Hardware Innovation")
    struct = inno.get("structured_data") or {}
    problem = struct.get("problem_statement") or inno.get("raw_input", "")
    solution = struct.get("proposed_solution") or ""
    domain = struct.get("domain") or "Technology"
    features = struct.get("key_features") or []

    prompt = f"""You are an elite crowdfunding campaign strategist specializing in top 1% hardware and technology campaigns on Kickstarter and Indiegogo.
Formulate a complete, ready-to-launch crowdfunding campaign package for the following technical innovation:

Project Title: {title}
Domain: {domain}
Core Problem Addressed: {problem}
Proposed Solution: {solution}
Decomposed Features:
{json.dumps(features, indent=2)}

Platform Focus: {platform.upper()}

Generate a comprehensive JSON response adhering strictly to this schema:
{{
  "title": "A punchy, memorable project title (max 60 chars)",
  "tagline": "An irresistible hook summarizing the primary value proposition (max 120 chars)",
  "funding_goal": 15000,
  "currency": "USD",
  "duration_days": 30,
  "origin_story": "Authentic, compelling narrative explaining why the inventors started this, the technical problem they faced, and how they built functional prototypes.",
  "technical_mechanism_pitch": "Enthusiastic yet deeply credible breakdown of the core technical features and how they solve the problem for users.",
  "prototype_stage": "Working Prototype | Bench MVP | Ready for Tooling",
  "fund_allocation_breakdown": [
    {{"category": "Tooling & Molds", "percentage": 40}},
    {{"category": "Component Sourcing", "percentage": 30}},
    {{"category": "Certification (FCC/CE)", "percentage": 15}},
    {{"category": "Fulfillment & Buffer", "percentage": 15}}
  ],
  "reward_tiers": [
    {{
      "tier_id": "tier_early_bird",
      "title": "Early Bird Edition",
      "pledge_amount": 79,
      "retail_price": 109,
      "discount_percentage": 28,
      "description": "Compelling pledge tier description",
      "estimated_delivery": "4 months after close",
      "items_included": ["Item 1", "Item 2"],
      "backer_limit": 100,
      "is_featured": true
    }},
    {{
      "tier_id": "tier_standard",
      "title": "Standard Backer Edition",
      "pledge_amount": 99,
      "retail_price": 119,
      "discount_percentage": 17,
      "description": "Standard retail package description",
      "estimated_delivery": "5 months after close",
      "items_included": ["Full Kit", "Manual"],
      "backer_limit": 500,
      "is_featured": false
    }},
    {{
      "tier_id": "tier_dev_kit",
      "title": "Developer / Maker Pro Kit",
      "pledge_amount": 169,
      "retail_price": 219,
      "discount_percentage": 23,
      "description": "Hacker / engineer edition description",
      "estimated_delivery": "4 months after close",
      "items_included": ["Dev Board", "SDK Access"],
      "backer_limit": 250,
      "is_featured": false
    }},
    {{
      "tier_id": "tier_vip",
      "title": "Founding Collector & Lab Tier",
      "pledge_amount": 499,
      "retail_price": 699,
      "discount_percentage": 29,
      "description": "High-value enterprise / collector tier",
      "estimated_delivery": "3 months after close",
      "items_included": ["2x Units", "1-on-1 Engineering Consultation"],
      "backer_limit": 25,
      "is_featured": false
    }}
  ],
  "video_script": [
    {{
      "scene_number": 1,
      "timestamp_range": "0:00 - 0:10",
      "visual_description": "Hook visual description showing old painful way vs new prototype",
      "voiceover_script": "Engaging narrator hook text",
      "on_screen_text": "Punchy graphic text overlay"
    }},
    {{
      "scene_number": 2,
      "timestamp_range": "0:10 - 0:25",
      "visual_description": "Live prototype operation in action",
      "voiceover_script": "Explanation of core breakthrough",
      "on_screen_text": "Key spec callout"
    }},
    {{
      "scene_number": 3,
      "timestamp_range": "0:25 - 0:45",
      "visual_description": "Feature montage showcasing utility and build quality",
      "voiceover_script": "Why backers will love using this device",
      "on_screen_text": "Features list"
    }},
    {{
      "scene_number": 4,
      "timestamp_range": "0:45 - 1:00",
      "visual_description": "Inventors in workshop asking for support with call-to-action",
      "voiceover_script": "We are ready for tooling, back us today on Kickstarter!",
      "on_screen_text": "Back Now • Early Bird Rewards Available"
    }}
  ],
  "risks_and_challenges": [
    "Supply chain mitigation description",
    "Manufacturing tooling timeline buffer",
    "Firmware reliability testing",
    "Regulatory certifications (FCC/CE/RoHS)"
  ],
  "campaign_milestones": [
    {{
      "phase_name": "Superbacker Momentum",
      "days_range": "Days 1 - 7",
      "focus_goal": "Reach 100% funding in first 72 hours",
      "tactics": ["Tactic 1", "Tactic 2", "Tactic 3"]
    }},
    {{
      "phase_name": "Mid-Campaign Stretch Goals",
      "days_range": "Days 8 - 14",
      "focus_goal": "Unlock stretch goal and drive press",
      "tactics": ["Tactic 1", "Tactic 2"]
    }},
    {{
      "phase_name": "Live Demos & AMA",
      "days_range": "Days 15 - 21",
      "focus_goal": "Deepen technical community trust",
      "tactics": ["Tactic 1", "Tactic 2"]
    }},
    {{
      "phase_name": "Final 48-Hour Countdown",
      "days_range": "Days 22 - 30",
      "focus_goal": "Capture final surge of backers",
      "tactics": ["Tactic 1", "Tactic 2"]
    }}
  ],
  "faq_items": [
    {{"question": "When does this ship?", "answer": "Clear shipping timeline breakdown"}},
    {{"question": "Is software open source?", "answer": "Clear open-source / licensing answer"}},
    {{"question": "Is there a warranty?", "answer": "1-year warranty coverage details"}},
    {{"question": "Can I upgrade later?", "answer": "Pledge manager explanation"}}
  ]
}}

Return ONLY valid raw JSON without markdown code fences or backticks.
"""

    try:
        model = genai.GenerativeModel(MODEL_NAME)
        # Windows safety: run in thread to avoid gRPC deadlock
        response = await asyncio.to_thread(model.generate_content, prompt)
        text = response.text.strip()

        # Clean markdown codeblocks if returned
        if text.startswith("```json"):
            text = text[7:]
        if text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
        text = text.strip()

        data = json.loads(text)

        # Parse reward tiers
        tiers = [CampaignRewardTier(**t) for t in data.get("reward_tiers", [])]
        scenes = [CampaignVideoScene(**s) for s in data.get("video_script", [])]
        milestones = [CampaignRoadmapMilestone(**m) for m in data.get("campaign_milestones", [])]
        faq = [CampaignFaqItem(**f) for f in data.get("faq_items", [])]

        now_iso = datetime.now(timezone.utc).isoformat()

        return CrowdfundingCampaign(
            id=None,
            innovation_id=inno.get("id", "temp-id"),
            platform=platform.lower(),
            title=data.get("title", f"{title}: Next-Gen Hardware Innovation"),
            tagline=data.get("tagline", "Precision engineering for modern makers."),
            funding_goal=int(data.get("funding_goal", 15000)),
            currency=data.get("currency", "USD"),
            duration_days=int(data.get("duration_days", 30)),
            origin_story=data.get("origin_story", "We developed this system to overcome real-world prototyping hurdles."),
            technical_mechanism_pitch=data.get("technical_mechanism_pitch", "Engineered for high accuracy and rapid deployment."),
            prototype_stage=data.get("prototype_stage", "Functional Bench Prototype"),
            fund_allocation_breakdown=data.get("fund_allocation_breakdown", DEFAULT_FUND_ALLOCATION),
            reward_tiers=tiers if tiers else _build_fallback_campaign(inno).reward_tiers,
            video_script=scenes if scenes else _build_fallback_campaign(inno).video_script,
            risks_and_challenges=data.get("risks_and_challenges") or _build_fallback_campaign(inno).risks_and_challenges,
            campaign_milestones=milestones if milestones else _build_fallback_campaign(inno).campaign_milestones,
            faq_items=faq if faq else _build_fallback_campaign(inno).faq_items,
            pre_launch_ip_advisory=PRE_LAUNCH_IP_ADVISORY,
            created_at=now_iso,
            updated_at=now_iso,
        )
    except Exception as e:
        print(f"[WARN] Gemini campaign generation error ({e}), using robust fallback.")
        return _build_fallback_campaign(inno)
