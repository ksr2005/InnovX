"""
Crowdfunding Multi-Platform Export Service (Day 23 / Week 4 Build Path).

Provides dedicated platform-specific exports:
- Kickstarter Markdown with Prototype Policy Compliance & ASCII Reward Matrix
- Indiegogo Pitch adhering to official 'What We Need & What You Get' structure
- Crowd Supply Open-Hardware & Engineering Technical Specification
- Branded ReportLab Multi-Page PDF Exporter (generate_campaign_pdf)
- Platform Submission Checklists & Guidelines
"""
from __future__ import annotations

import io
from datetime import datetime, timezone
from typing import Any

from models.schemas import CrowdfundingCampaign


# ─── Platform Guidelines & Submission Checklists ──────────────────────────

PLATFORM_GUIDES = {
    "kickstarter": {
        "platform_id": "kickstarter",
        "platform_name": "Kickstarter",
        "tagline": "The world's leading community for creative and hardware tech projects.",
        "recommended_duration": "30 to 35 Days",
        "funding_model": "All-or-Nothing (Pledges only charged if goal is 100% reached)",
        "fee_structure": "5% Kickstarter platform fee + 3-5% payment processing fee",
        "key_rules": [
            "Hardware projects must demonstrate a functional physical prototype. 3D renders cannot substitute for a working unit.",
            "Rewards cannot offer financial returns, equity, or lottery-style prizes.",
            "Clear timeline and realistic delivery estimates are required.",
            "All-or-Nothing funding model is mandatory.",
        ],
        "checklist": [
            {
                "id": "ks-1",
                "category": "Hardware & Prototype",
                "task": "Working Physical Prototype Video",
                "description": "Uncut video demonstrating key functions of a real physical unit, in compliance with Kickstarter's hardware policy.",
                "mandatory": True,
            },
            {
                "id": "ks-2",
                "category": "Pre-Launch & Marketing",
                "task": "Pre-Launch Landing Page Published",
                "description": "Collect at least 200-500 email leads on Kickstarter's pre-launch page to ensure Day 1 momentum.",
                "mandatory": True,
            },
            {
                "id": "ks-3",
                "category": "Legal & IP Protection",
                "task": "Provisional Patent Application Filed",
                "description": "File a provisional patent (or establish priority date) before public launch to protect foreign rights (EPC Art. 54).",
                "mandatory": True,
            },
            {
                "id": "ks-4",
                "category": "Rewards & Pricing",
                "task": "Early Bird Reward Tiers Capped",
                "description": "Limit Early Bird tier to 50-100 backers with 20-30% discount to trigger early campaign surge.",
                "mandatory": True,
            },
            {
                "id": "ks-5",
                "category": "Fulfillment & Supply Chain",
                "task": "Tooling & Manufacturing Quotes Verified",
                "description": "Obtain written manufacturer quotes for injection molding/PCB tooling and component BoM with lead times.",
                "mandatory": False,
            },
            {
                "id": "ks-6",
                "category": "Media & Story",
                "task": "60-Second Video Pitch Produced",
                "description": "Concise video with product hook in the first 10 seconds, followed by technical demo and call to action.",
                "mandatory": True,
            },
        ],
    },
    "indiegogo": {
        "platform_id": "indiegogo",
        "platform_name": "Indiegogo",
        "tagline": "Flexible crowdfunding for innovative hardware, tech gadgets, and community ventures.",
        "recommended_duration": "30 to 45 Days",
        "funding_model": "Flexible Funding (Keep what you raise) OR Fixed Funding (All-or-Nothing)",
        "fee_structure": "5% Indiegogo platform fee + 3% + $0.30 per transaction",
        "key_rules": [
            "Creators can select Fixed or Flexible funding (Fixed recommended for hardware needing high tooling capital).",
            "Indiegogo InDemand allows continued sales after successful campaign close.",
            "Prototypes must be disclosed honestly with stage badge (Concept / Prototype / Production).",
            "Perks must clearly state estimated fulfillment date.",
        ],
        "checklist": [
            {
                "id": "igg-1",
                "category": "Funding Model",
                "task": "Funding Model Selected (Fixed vs. Flexible)",
                "description": "Choose Fixed Funding if manufacturing cannot proceed without full goal; Flexible if modular.",
                "mandatory": True,
            },
            {
                "id": "igg-2",
                "category": "Legal & IP Protection",
                "task": "Pre-Launch IP Shield Verification",
                "description": "Confirm US 1-year grace period requirements and file provisional patent if global rights are desired.",
                "mandatory": True,
            },
            {
                "id": "igg-3",
                "category": "Official Structure",
                "task": "'What We Need & What You Get' Pitch Drafted",
                "description": "Write campaign body using Indiegogo's standard 5-part structure to optimize conversion.",
                "mandatory": True,
            },
            {
                "id": "igg-4",
                "category": "Post-Campaign",
                "task": "InDemand Post-Campaign Transition Planned",
                "description": "Prepare InDemand setup to keep taking pre-orders seamlessly after funding closes.",
                "mandatory": False,
            },
            {
                "id": "igg-5",
                "category": "Marketing & Ads",
                "task": "Meta Pixel & Google Analytics Integrated",
                "description": "Set up tracking pixels in Indiegogo dashboard to measure ad ROI and backer attribution.",
                "mandatory": False,
            },
        ],
    },
    "crowdsupply": {
        "platform_id": "crowdsupply",
        "platform_name": "Crowd Supply",
        "tagline": "The premier platform for open-source hardware, maker tech, and professional engineering.",
        "recommended_duration": "40 to 45 Days",
        "funding_model": "All-or-Nothing + Mouser Electronics Global Distribution",
        "fee_structure": "12% Standard (includes campaign management, PR, and Mouser warehousing/fulfillment) OR 8% Custom",
        "key_rules": [
            "All hardware must have functional engineering prototypes with documentation.",
            "Strong preference for open-source hardware, schematics, and freely accessible SDKs.",
            "All orders are warehoused and shipped through Mouser Electronics' Texas logistics hub.",
            "Every project is assigned a dedicated Crowd Supply campaign manager.",
        ],
        "checklist": [
            {
                "id": "cs-1",
                "category": "Engineering Documentation",
                "task": "Schematics & Bill of Materials Ready",
                "description": "Prepare KiCad/Altium schematic files and BoM for community and Mouser review.",
                "mandatory": True,
            },
            {
                "id": "cs-2",
                "category": "Manufacturing Readiness",
                "task": "Automated Test Jig & QA Procedure Defined",
                "description": "Document how each assembled PCB will be flashed and factory-tested prior to bulk shipping.",
                "mandatory": True,
            },
            {
                "id": "cs-3",
                "category": "Fulfillment Logistics",
                "task": "Packaging & Weight Specifications Submitted",
                "description": "Provide exact unit dimensions and weight for Mouser Electronics logistics calculation.",
                "mandatory": True,
            },
            {
                "id": "cs-4",
                "category": "Licensing & Open Source",
                "task": "Hardware & Firmware License Declared",
                "description": "Specify CERN-OHL, MIT, or GPL license for schematics and open-source SDK.",
                "mandatory": True,
            },
            {
                "id": "cs-5",
                "category": "Legal & IP Protection",
                "task": "Defensive Publication or Patent Priority Established",
                "description": "For open-source projects, publish an official Defensive Publication to prevent predatory patenting.",
                "mandatory": True,
            },
        ],
    },
}


def get_platform_guides() -> dict[str, Any]:
    """Retrieve all platform guidelines and submission checklists."""
    return PLATFORM_GUIDES


# ─── Platform-Specific Exporters ──────────────────────────────────────────

def export_kickstarter_format(campaign: CrowdfundingCampaign) -> str:
    """Format campaign into Kickstarter's standard editor markdown."""
    lines = [
        f"# {campaign.title}",
        f"> **Tagline (135 chars max):** {campaign.tagline[:135]}\n",
        f"- **Platform:** Kickstarter (All-or-Nothing)",
        f"- **Funding Goal:** ${campaign.funding_goal:,} {campaign.currency}",
        f"- **Campaign Duration:** {campaign.duration_days} Days",
        f"- **Hardware Prototype Stage:** {campaign.prototype_stage}\n",
        "---",
        "## 📜 KICKSTARTER PROTOTYPE POLICY DECLARATION",
        "*In strict compliance with Kickstarter's hardware and product design guidelines: "
        "The imagery and video recordings referenced in this campaign depict a functional, physical prototype. "
        "Photorealistic 3D renders are explicitly labeled and not used to simulate finished capabilities.*",
        "\n---",
        "## 💡 PROJECT STORY: WHY WE BUILT THIS",
        campaign.origin_story,
        "\n*[INSERT: High-Resolution Photo of Functional Prototype in Real-World Use]*\n",
        "---",
        "## ⚙️ HOW IT WORKS: TECHNICAL INNOVATION",
        campaign.technical_mechanism_pitch,
        "\n*[INSERT: CAD Exploded Assembly Diagram / Internal Mechanism Breakdown]*\n",
        "---",
        "## 💰 BUDGET ALLOCATION & USE OF FUNDS",
        "Here is exactly how every dollar pledged will be deployed to manufacture and ship units on schedule:\n",
        "| Budget Category | Percentage | Allocation ($) |",
        "| :--- | :---: | :---: |",
    ]

    for item in campaign.fund_allocation_breakdown:
        cat = item.get("category", "General")
        pct = item.get("percentage", 0)
        dollar = int(campaign.funding_goal * (pct / 100.0))
        lines.append(f"| {cat} | {pct}% | ${dollar:,} {campaign.currency} |")

    lines.extend([
        "\n---",
        "## 🎁 REWARDS & PLEDGE TIERS",
        "Back our project early to secure exclusive launch discounts and limited founder production slots.\n",
        "| Tier Title | Pledge | Retail | Discount | Est. Delivery | Limit |",
        "| :--- | :---: | :---: | :---: | :---: | :---: |",
    ])

    for tier in campaign.reward_tiers:
        disc = f"{tier.discount_percentage}% OFF" if tier.discount_percentage else "Standard"
        limit = f"{tier.backer_limit} units" if tier.backer_limit else "Unlimited"
        lines.append(
            f"| **{tier.title}** | ${tier.pledge_amount} | ${tier.retail_price} | {disc} | {tier.estimated_delivery} | {limit} |"
        )

    lines.append("\n### Detailed Reward Package Inclusions:\n")
    for tier in campaign.reward_tiers:
        lines.append(f"#### {tier.title} (${tier.pledge_amount} {tier.currency})")
        lines.append(f"{tier.description}\n")
        lines.append("**What's in the box:**")
        for inc in tier.items_included:
            lines.append(f"- {inc}")
        lines.append("")

    lines.extend([
        "---",
        "## 🎬 60-SECOND CAMPAIGN VIDEO CUE SHEET",
        "Production storyboard for Kickstarter campaign video:\n",
    ])

    for scene in campaign.video_script:
        lines.append(f"### Scene {scene.scene_number} ({scene.timestamp_range})")
        lines.append(f"- **Visual Action:** {scene.visual_description}")
        lines.append(f"- **Voiceover Script:** \"{scene.voiceover_script}\"")
        lines.append(f"- **On-Screen Text:** `{scene.on_screen_text}`\n")

    lines.extend([
        "---",
        "## 📅 30-DAY LAUNCH ROADMAP & BACKER ENGAGEMENT",
    ])
    for milestone in campaign.campaign_milestones:
        lines.append(f"### {milestone.phase_name} ({milestone.days_range})")
        lines.append(f"- **Objective:** {milestone.focus_goal}")
        lines.append("- **Key Tactics:**")
        for tactic in milestone.tactics:
            lines.append(f"  * {tactic}")
        lines.append("")

    lines.extend([
        "---",
        "## ⚠️ RISKS AND CHALLENGES",
        "Manufacturing physical hardware carries inherent engineering and logistics responsibilities. "
        "Here is our proactive mitigation plan:\n",
    ])
    for risk in campaign.risks_and_challenges:
        lines.append(f"- {risk}")

    lines.extend([
        "\n---",
        "## ❓ FREQUENTLY ASKED QUESTIONS (FAQ)",
    ])
    for faq in campaign.faq_items:
        lines.append(f"**Q: {faq.question}**")
        lines.append(f"A: {faq.answer}\n")

    lines.extend([
        "---",
        "## 🛡️ INTELLECTUAL PROPERTY & STATUTORY NOTICE",
        campaign.pre_launch_ip_advisory,
    ])

    return "\n".join(lines)


def export_indiegogo_format(campaign: CrowdfundingCampaign) -> str:
    """Format campaign into Indiegogo's official 5-part pitch structure."""
    lines = [
        f"# {campaign.title}",
        f"**{campaign.tagline}**\n",
        f"- **Platform:** Indiegogo",
        f"- **Target Funding Goal:** ${campaign.funding_goal:,} {campaign.currency}",
        f"- **Campaign Model:** Fixed Funding (Recommended for tooling) / Flexible Funding",
        f"- **Duration:** {campaign.duration_days} Days | **Hardware Stage:** {campaign.prototype_stage}\n",
        "---",
        "## 1. SHORT SUMMARY",
        f"We are introducing {campaign.title} to revolutionize how creators and engineers solve real-world hardware challenges.",
        campaign.origin_story,
        "\nYour contribution directly enables tooling fabrication, volume component procurement, and worldwide regulatory certification.",
        "\n---",
        "## 2. WHAT WE NEED & WHAT YOU GET",
        f"### Our Funding Goal: ${campaign.funding_goal:,} {campaign.currency}",
        "Here is the transparent allocation of contributed funds:\n",
    ]

    for item in campaign.fund_allocation_breakdown:
        cat = item.get("category", "General")
        pct = item.get("percentage", 0)
        lines.append(f"- **{cat} ({pct}%):** Dedicated to direct production and quality assurance.")

    lines.append("\n### Exclusive Indiegogo Perks & Reward Tiers:\n")
    for tier in campaign.reward_tiers:
        lines.append(f"#### Perk: {tier.title} — ${tier.pledge_amount} {tier.currency}")
        if tier.discount_percentage:
            lines.append(f"*{tier.discount_percentage}% OFF retail price (${tier.retail_price})*")
        lines.append(f"{tier.description}")
        lines.append("**Included Perks:** " + ", ".join(tier.items_included))
        lines.append(f"**Estimated Delivery:** {tier.estimated_delivery}\n")

    lines.extend([
        "---",
        "## 3. THE IMPACT",
        "By backing this campaign, you are not just purchasing hardware; you are supporting an open, accessible "
        "engineering paradigm that breaks free from proprietary vendor lock-in.",
        campaign.technical_mechanism_pitch,
        "\n---",
        "## 4. RISKS & CHALLENGES",
        "We believe in radical transparency with our contributor community. Here are our anticipated manufacturing "
        "hurdles and our concrete mitigation strategies:\n",
    ])

    for risk in campaign.risks_and_challenges:
        lines.append(f"- {risk}")

    lines.extend([
        "\n---",
        "## 5. OTHER WAYS YOU CAN HELP",
        "Even if you cannot contribute financially today, you can make an immense difference by sharing this campaign "
        "with fellow makers, engineers, and tech enthusiasts using the Indiegogo share tools above!",
        "\n---",
        "## 🎬 60-SECOND PITCH VIDEO SCRIPT",
    ])

    for scene in campaign.video_script:
        lines.append(f"**[{scene.timestamp_range}] Scene {scene.scene_number}:**")
        lines.append(f"- Visual: {scene.visual_description}")
        lines.append(f"- Voiceover: \"{scene.voiceover_script}\"")
        lines.append(f"- Overlay: {scene.on_screen_text}\n")

    lines.extend([
        "---",
        "## 🛡️ STATUTORY IP ADVISORY",
        campaign.pre_launch_ip_advisory,
    ])

    return "\n".join(lines)


def export_crowdsupply_format(campaign: CrowdfundingCampaign) -> str:
    """Format campaign into Crowd Supply open-source hardware & engineering format."""
    lines = [
        f"# {campaign.title}: Technical & Manufacturing Specification",
        f"**{campaign.tagline}**\n",
        f"- **Platform:** Crowd Supply (Open-Source Hardware & Mouser Distribution)",
        f"- **Funding Target:** ${campaign.funding_goal:,} {campaign.currency}",
        f"- **Fulfillment Partner:** Mouser Electronics (Mansfield, Texas Logistics Facility)",
        f"- **Hardware Verification Stage:** {campaign.prototype_stage}\n",
        "---",
        "## 📐 TECHNICAL SPECIFICATIONS & SYSTEM ARCHITECTURE",
        campaign.technical_mechanism_pitch,
        "\n### Key Hardware Characteristics:",
        "- **Embedded Processing:** Ultra-low latency controller with dedicated peripheral headers.",
        "- **Power Delivery:** Standard USB-C 5V/3A with integrated overcurrent & ESD protection.",
        "- **Form Factor:** Compact footprint designed for laboratory benches and modular integration.",
        "- **Firmware & Toolchain:** 100% open-source toolchain compatible with standard compiler frameworks.",
        "\n---",
        "## 🔓 OPEN SOURCE HARDWARE (OSHW) & LICENSING",
        "We believe hardware belongs to the community. In accordance with OSHWA guidelines, full schematics, "
        "KiCad PCB layout files, bill of materials, and firmware repositories will be published under permissive open licenses.",
        "\n---",
        "## 🏭 MANUFACTURING, QUALITY ASSURANCE & PILOT TEST RUNS",
        campaign.origin_story,
        "\n### Quality Control Testing Plan:",
        "- **Visual & AOI Inspection:** Automated optical inspection for all SMT component placements.",
        "- **Automated Bed-of-Nails Test Jig:** 100% automated voltage rail, GPIO continuity, and firmware self-test before packaging.",
        "- **Burn-in Stress Testing:** 48-hour continuous thermal and load cycle testing on initial pilot batches.",
        "\n---",
        "## 📦 FULFILLMENT & LOGISTICS VIA MOUSER ELECTRONICS",
        "Every backer reward will be bulk shipped to Mouser Electronics' state-of-the-art climate-controlled "
        "warehouse in Mansfield, Texas. Mouser handles professional protective packaging, international customs declarations, "
        "and worldwide express dispatch with tracking.",
        "\n---",
        "## 🎁 PLEDGE TIERS & DEVELOPER BUNDLES\n",
    ]

    for tier in campaign.reward_tiers:
        lines.append(f"### {tier.title} (${tier.pledge_amount} {tier.currency})")
        lines.append(f"{tier.description}")
        lines.append(f"**Estimated Mouser Dispatch:** {tier.estimated_delivery}")
        lines.append("**BOM / Inclusions:** " + ", ".join(tier.items_included) + "\n")

    lines.extend([
        "---",
        "## 🎬 VIDEO CUE SHEET & DEMO BENCHMARK",
    ])
    for scene in campaign.video_script:
        lines.append(f"- **[{scene.timestamp_range}] Scene {scene.scene_number}:** {scene.visual_description} (VO: \"{scene.voiceover_script}\")")

    lines.extend([
        "\n---",
        "## ⚠️ ENGINEERING RISKS & MITIGATION",
    ])
    for risk in campaign.risks_and_challenges:
        lines.append(f"- {risk}")

    lines.extend([
        "\n---",
        "## 🛡️ INTELLECTUAL PROPERTY & DEFENSIVE PUBLICATION NOTICE",
        campaign.pre_launch_ip_advisory,
    ])

    return "\n".join(lines)


# ─── ReportLab Multi-Page Branded PDF Generator ───────────────────────────

def generate_campaign_pdf(campaign: CrowdfundingCampaign) -> io.BytesIO:
    """
    Generate a high-quality multi-page branded PDF for the Crowdfunding Campaign.
    Uses pure-Python ReportLab with zero system dependencies.
    """
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT, TA_JUSTIFY
    from reportlab.platypus import (
        SimpleDocTemplate,
        Paragraph,
        Spacer,
        Table,
        TableStyle,
        PageBreak,
        HRFlowable,
        KeepTogether,
    )

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=36,
        rightMargin=36,
        topMargin=40,
        bottomMargin=40,
    )

    styles = getSampleStyleSheet()

    # Brand Colors (InnovX Emerald / Slate / Dark Palette)
    brand_emerald = colors.HexColor("#10B981")
    brand_dark = colors.HexColor("#0F172A")
    brand_indigo = colors.HexColor("#6366F1")
    brand_amber = colors.HexColor("#D97706")
    brand_slate = colors.HexColor("#334155")
    brand_muted = colors.HexColor("#64748B")
    brand_bg_light = colors.HexColor("#F8FAFC")
    brand_bg_card = colors.HexColor("#F1F5F9")
    brand_border = colors.HexColor("#E2E8F0")

    # Typography Styles
    title_style = ParagraphStyle(
        "DocTitle",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=18,
        leading=22,
        textColor=brand_dark,
        alignment=TA_LEFT,
        spaceAfter=4,
    )
    tagline_style = ParagraphStyle(
        "DocTagline",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=10,
        leading=14,
        textColor=brand_indigo,
        spaceAfter=10,
    )
    h1_style = ParagraphStyle(
        "H1",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=12,
        leading=15,
        textColor=brand_dark,
        spaceBefore=12,
        spaceAfter=5,
    )
    h2_style = ParagraphStyle(
        "H2",
        parent=styles["Heading3"],
        fontName="Helvetica-Bold",
        fontSize=9,
        leading=13,
        textColor=brand_slate,
        spaceBefore=6,
        spaceAfter=3,
    )
    body_style = ParagraphStyle(
        "Body",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=12,
        textColor=brand_slate,
        alignment=TA_LEFT,
        spaceAfter=5,
    )
    bullet_style = ParagraphStyle(
        "Bullet",
        parent=body_style,
        leftIndent=10,
        firstLineIndent=-6,
        spaceAfter=3,
    )
    table_header_style = ParagraphStyle(
        "TableHeader",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=10,
        textColor=colors.white,
        alignment=TA_CENTER,
    )
    table_cell_style = ParagraphStyle(
        "TableCell",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=7.5,
        leading=10,
        textColor=brand_dark,
    )
    table_cell_bold = ParagraphStyle(
        "TableCellBold",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=7.5,
        leading=10,
        textColor=brand_dark,
    )
    advisory_box_style = ParagraphStyle(
        "AdvisoryBox",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=7.5,
        leading=10.5,
        textColor=colors.HexColor("#991B1B"),
        alignment=TA_JUSTIFY,
    )

    story: list[Any] = []

    # ── HEADER BANNER ──────────────────────────────────────────────
    header_data = [
        [
            Paragraph("<b>INNOVX BUILD PATH &bull; CROWDFUNDING SPECIFICATION</b>", ParagraphStyle(
                "HeaderLeft", fontName="Helvetica-Bold", fontSize=8, textColor=brand_emerald, leading=10
            )),
            Paragraph(f"Export Date: {datetime.now(timezone.utc).strftime('%B %d, %Y')}", ParagraphStyle(
                "HeaderRight", fontName="Helvetica", fontSize=8, textColor=brand_muted, alignment=TA_RIGHT, leading=10
            )),
        ]
    ]
    header_table = Table(header_data, colWidths=[340, 180])
    header_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 4))
    story.append(HRFlowable(width="100%", thickness=1.5, color=brand_emerald, spaceBefore=2, spaceAfter=8))

    # Title & Tagline
    story.append(Paragraph(campaign.title, title_style))
    story.append(Paragraph(campaign.tagline, tagline_style))

    # Meta KPI Grid
    kpi_data = [
        [
            Paragraph("<b>Platform Target</b>", table_cell_bold),
            Paragraph("<b>Funding Goal</b>", table_cell_bold),
            Paragraph("<b>Duration</b>", table_cell_bold),
            Paragraph("<b>Hardware Stage</b>", table_cell_bold),
        ],
        [
            Paragraph(campaign.platform.upper(), ParagraphStyle("KpiV1", fontName="Helvetica-Bold", fontSize=9, textColor=brand_indigo)),
            Paragraph(f"${campaign.funding_goal:,} {campaign.currency}", ParagraphStyle("KpiV2", fontName="Helvetica-Bold", fontSize=9, textColor=brand_emerald)),
            Paragraph(f"{campaign.duration_days} Days", ParagraphStyle("KpiV3", fontName="Helvetica-Bold", fontSize=9, textColor=brand_dark)),
            Paragraph(campaign.prototype_stage, ParagraphStyle("KpiV4", fontName="Helvetica", fontSize=8, textColor=brand_slate)),
        ]
    ]
    kpi_table = Table(kpi_data, colWidths=[130, 130, 100, 160])
    kpi_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), brand_bg_light),
        ("BACKGROUND", (0, 1), (-1, 1), brand_bg_card),
        ("GRID", (0, 0), (-1, -1), 0.5, brand_border),
        ("PADDING", (0, 0), (-1, -1), 5),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    story.append(kpi_table)
    story.append(Spacer(1, 8))

    # ── PRE-LAUNCH IP ADVISORY CALLOUT ─────────────────────────────
    adv_data = [[
        Paragraph(
            "<b>STATUTORY PRE-LAUNCH IP ADVISORY:</b> "
            "Publicly launching a crowdfunding campaign constitutes an enabling public disclosure under patent laws worldwide. "
            "In absolute novelty jurisdictions (European Patent Office, China, Japan), launching permanently forfeits patent rights "
            "unless an application is filed beforehand. In the US, a strict 1-year clock begins on launch day. "
            "Ensure you have filed your Provisional Patent Application or executed your defensive disclosure strategy prior to launch.",
            advisory_box_style
        )
    ]]
    adv_table = Table(adv_data, colWidths=[520])
    adv_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#FEF2F2")),
        ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#F87171")),
        ("PADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(adv_table)
    story.append(Spacer(1, 8))

    # ── SECTION 1: STORY & TECHNICAL MECHANISM ─────────────────────
    story.append(Paragraph("1. Project Story & Technical Mechanism", h1_style))
    story.append(HRFlowable(width="100%", thickness=0.5, color=brand_border, spaceBefore=0, spaceAfter=5))
    story.append(Paragraph("<b>Origin Story & The Problem We Solve:</b>", h2_style))
    story.append(Paragraph(campaign.origin_story, body_style))
    story.append(Spacer(1, 3))
    story.append(Paragraph("<b>Technical Mechanism & Key Innovation:</b>", h2_style))
    story.append(Paragraph(campaign.technical_mechanism_pitch, body_style))
    story.append(Spacer(1, 6))

    # ── SECTION 2: FUND ALLOCATION ─────────────────────────────────
    story.append(Paragraph("2. Budget & Fund Allocation", h1_style))
    story.append(HRFlowable(width="100%", thickness=0.5, color=brand_border, spaceBefore=0, spaceAfter=5))

    alloc_rows = [[
        Paragraph("<b>Budget Category</b>", table_header_style),
        Paragraph("<b>Percentage</b>", table_header_style),
        Paragraph("<b>Target Capital Allocation</b>", table_header_style),
    ]]
    for item in campaign.fund_allocation_breakdown:
        cat = item.get("category", "")
        pct = item.get("percentage", 0)
        dollar = int(campaign.funding_goal * (pct / 100.0))
        alloc_rows.append([
            Paragraph(cat, table_cell_bold),
            Paragraph(f"{pct}%", table_cell_style),
            Paragraph(f"${dollar:,} {campaign.currency}", table_cell_style),
        ])

    alloc_table = Table(alloc_rows, colWidths=[260, 100, 160])
    alloc_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), brand_slate),
        ("GRID", (0, 0), (-1, -1), 0.5, brand_border),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, brand_bg_light]),
        ("PADDING", (0, 0), (-1, -1), 4),
        ("ALIGN", (1, 0), (2, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    story.append(alloc_table)
    story.append(Spacer(1, 8))

    # ── SECTION 3: REWARD TIERS ────────────────────────────────────
    story.append(Paragraph("3. Structured Backer Reward Tiers", h1_style))
    story.append(HRFlowable(width="100%", thickness=0.5, color=brand_border, spaceBefore=0, spaceAfter=5))

    tier_rows = [[
        Paragraph("<b>Tier</b>", table_header_style),
        Paragraph("<b>Pledge</b>", table_header_style),
        Paragraph("<b>Retail</b>", table_header_style),
        Paragraph("<b>Savings</b>", table_header_style),
        Paragraph("<b>Est. Delivery</b>", table_header_style),
        Paragraph("<b>Limit</b>", table_header_style),
    ]]

    for tier in campaign.reward_tiers:
        disc = f"{tier.discount_percentage}%" if tier.discount_percentage else "-"
        limit = str(tier.backer_limit) if tier.backer_limit else "None"
        tier_rows.append([
            Paragraph(f"<b>{tier.title}</b>", table_cell_style),
            Paragraph(f"${tier.pledge_amount}", table_cell_bold),
            Paragraph(f"${tier.retail_price}", table_cell_style),
            Paragraph(disc, table_cell_style),
            Paragraph(tier.estimated_delivery, table_cell_style),
            Paragraph(limit, table_cell_style),
        ])

    tier_table = Table(tier_rows, colWidths=[150, 60, 60, 60, 130, 60])
    tier_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), brand_indigo),
        ("GRID", (0, 0), (-1, -1), 0.5, brand_border),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, brand_bg_light]),
        ("PADDING", (0, 0), (-1, -1), 4),
        ("ALIGN", (1, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    story.append(tier_table)
    story.append(Spacer(1, 10))

    # ── SECTION 4: 60-SECOND VIDEO STORYBOARD ──────────────────────
    story.append(Paragraph("4. 60-Second Video Pitch Storyboard", h1_style))
    story.append(HRFlowable(width="100%", thickness=0.5, color=brand_border, spaceBefore=0, spaceAfter=5))

    video_rows = [[
        Paragraph("<b>Scene</b>", table_header_style),
        Paragraph("<b>Timing</b>", table_header_style),
        Paragraph("<b>Visual Action & On-Screen Text</b>", table_header_style),
        Paragraph("<b>Voiceover Script</b>", table_header_style),
    ]]

    for scene in campaign.video_script:
        visual_combined = f"<b>Action:</b> {scene.visual_description}<br/><b>Text:</b> <i>{scene.on_screen_text}</i>"
        video_rows.append([
            Paragraph(f"#{scene.scene_number}", table_cell_bold),
            Paragraph(scene.timestamp_range, table_cell_style),
            Paragraph(visual_combined, table_cell_style),
            Paragraph(f'"{scene.voiceover_script}"', table_cell_style),
        ])

    video_table = Table(video_rows, colWidths=[40, 65, 205, 210])
    video_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), brand_slate),
        ("GRID", (0, 0), (-1, -1), 0.5, brand_border),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, brand_bg_light]),
        ("PADDING", (0, 0), (-1, -1), 4),
        ("ALIGN", (0, 0), (1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    story.append(video_table)
    story.append(Spacer(1, 10))

    # ── SECTION 5: 30-DAY LAUNCH ROADMAP ───────────────────────────
    story.append(Paragraph("5. 30-Day Campaign Launch Roadmap", h1_style))
    story.append(HRFlowable(width="100%", thickness=0.5, color=brand_border, spaceBefore=0, spaceAfter=5))

    roadmap_rows = [[
        Paragraph("<b>Phase</b>", table_header_style),
        Paragraph("<b>Timeline</b>", table_header_style),
        Paragraph("<b>Core Goal</b>", table_header_style),
        Paragraph("<b>Tactics & Actions</b>", table_header_style),
    ]]

    for m in campaign.campaign_milestones:
        tactics_str = "<br/>".join([f"&bull; {t}" for t in m.tactics])
        roadmap_rows.append([
            Paragraph(f"<b>{m.phase_name}</b>", table_cell_style),
            Paragraph(m.days_range, table_cell_style),
            Paragraph(m.focus_goal, table_cell_style),
            Paragraph(tactics_str, table_cell_style),
        ])

    roadmap_table = Table(roadmap_rows, colWidths=[120, 75, 145, 180])
    roadmap_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), brand_dark),
        ("GRID", (0, 0), (-1, -1), 0.5, brand_border),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, brand_bg_light]),
        ("PADDING", (0, 0), (-1, -1), 4),
        ("ALIGN", (1, 0), (1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    story.append(roadmap_table)
    story.append(Spacer(1, 10))

    # ── SECTION 6: RISKS AND MITIGATION ────────────────────────────
    story.append(Paragraph("6. Risks, Challenges & Supply Chain Mitigations", h1_style))
    story.append(HRFlowable(width="100%", thickness=0.5, color=brand_border, spaceBefore=0, spaceAfter=5))
    for risk in campaign.risks_and_challenges:
        story.append(Paragraph(f"&bull; {risk}", bullet_style))
    story.append(Spacer(1, 10))

    # ── FOOTER / DISCLAIMER ────────────────────────────────────────
    disclaimer_style = ParagraphStyle(
        "Disclaimer",
        parent=styles["Normal"],
        fontName="Helvetica-Oblique",
        fontSize=7,
        leading=9,
        textColor=brand_muted,
        alignment=TA_CENTER,
    )
    story.append(HRFlowable(width="100%", thickness=0.5, color=brand_border, spaceBefore=8, spaceAfter=6))
    story.append(Paragraph(
        "Generated automatically by InnovX Build Path Engine &bull; Confidential Planning Document &bull; "
        "Not affiliated with or endorsed by Kickstarter, PBC, Indiegogo, Inc., or Crowd Supply.",
        disclaimer_style,
    ))

    doc.build(story)
    buffer.seek(0)
    return buffer
