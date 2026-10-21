"""
Patent Preparation Service — Day 16 / Week 3 (Protect Path).

Generates AI-powered provisional patent preparation packages:
- Section checklists & drafting guidelines
- Suggested claim boundary areas & novel points (clearly disclaimed)
- Prior-art differentiation gap analysis
- Jurisdiction filing fee calculator (USPTO micro/small, India IPO, EPO, WIPO)
- Branded PDF generation using ReportLab
"""
from __future__ import annotations

import io
import json
import os
import re
import asyncio
from datetime import datetime, timezone
from typing import Any, Optional

import google.generativeai as genai
from dotenv import load_dotenv

from models.schemas import (
    PatentPrepPackage,
    FeeTier,
    JurisdictionFeeInfo,
    ClaimBoundaryItem,
    PriorArtGapItem,
    ChecklistItem,
)

load_dotenv()

# Configure Gemini
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
MODEL_NAME = os.getenv("GEMINI_MODEL", "gemini-flash-lite-latest")

MANDATORY_LEGAL_DISCLAIMER = (
    "LEGAL DISCLAIMER: This Patent Readiness & Filing Preparation Package is an automated AI-assisted analytical drafting aid "
    "provided for educational, informational, and preparatory purposes only. It does NOT constitute legal advice, patent prosecution, "
    "or formal attorney-client representation. InnovX does not file patent applications on behalf of users. "
    "Patent laws and filing requirements vary by jurisdiction. You should consult a qualified, registered patent attorney "
    "or patent agent licensed in your jurisdiction prior to filing any formal legal documentation with a patent office."
)

JURISDICTIONS_DATA = {
    "uspto": JurisdictionFeeInfo(
        office_name="United States Patent and Trademark Office (USPTO)",
        currency="USD",
        portal_name="USPTO Patent Center",
        portal_url="https://patentcenter.uspto.gov/",
        timeline_months=12,
        fees=[
            FeeTier(
                name="Micro Entity",
                amount="$80",
                qualification="Gross income <$223,840, fewer than 4 prior patent filings, or university affiliation",
                filing_route="Provisional Application (Electronic / Patent Center)",
            ),
            FeeTier(
                name="Small Entity",
                amount="$160",
                qualification="Independent inventor, business with <500 employees, or 501(c)(3) non-profit",
                filing_route="Provisional Application (Electronic / Patent Center)",
            ),
            FeeTier(
                name="Large Entity / Undiscounted",
                amount="$320",
                qualification="Standard corporate entity (>500 employees or assigned to large company)",
                filing_route="Provisional Application (Electronic / Patent Center)",
            ),
        ],
    ),
    "india_ipo": JurisdictionFeeInfo(
        office_name="Indian Patent Office (IPO / CGPDTM)",
        currency="INR",
        portal_name="IPO Comprehensive e-Filing Portal",
        portal_url="https://ipindiaonline.gov.in/epatentfiling/goForLogin/doLogin",
        timeline_months=12,
        fees=[
            FeeTier(
                name="Natural Person / Startup / MSME",
                amount="₹1,600 (~$20 USD)",
                qualification="Individual inventors, DPIIT-recognized startups, or registered small enterprises",
                filing_route="Provisional Specification (Form 1 + Form 2)",
            ),
            FeeTier(
                name="Others (Large Companies)",
                amount="₹8,000 (~$100 USD)",
                qualification="Standard non-MSME corporate bodies",
                filing_route="Provisional Specification (Form 1 + Form 2)",
            ),
        ],
    ),
    "epo": JurisdictionFeeInfo(
        office_name="European Patent Office (EPO)",
        currency="EUR",
        portal_name="EPO Online Services (MyEPO)",
        portal_url="https://www.epo.org/en/applying/myepo-services",
        timeline_months=12,
        fees=[
            FeeTier(
                name="European Search / Application Route",
                amount="€135 (e-filing) + Search €1,520",
                qualification="Direct EP application (Note: EPO does not have provisional filings; US/India provisional serves as Paris priority)",
                filing_route="Paris Convention 12-Month Priority Transfer",
            ),
        ],
    ),
    "wipo_pct": JurisdictionFeeInfo(
        office_name="World Intellectual Property Organization (WIPO / PCT)",
        currency="USD",
        portal_name="WIPO ePCT Portal",
        portal_url="https://pct.wipo.int/",
        timeline_months=12,
        fees=[
            FeeTier(
                name="International Phase (PCT)",
                amount="~$1,400 + Search Fee",
                qualification="Filed within 12 months of provisional priority date to preserve worldwide rights across 157 countries",
                filing_route="PCT Request Form via Receiving Office (RO)",
            ),
        ],
    ),
}

DEFAULT_CHECKLIST = [
    ChecklistItem(
        item_id="chk-1",
        title="Provisional Cover Sheet (Form PTO/SB/16)",
        required_for="Provisional (USPTO)",
        description="Completed inventor names, residence, citizenship, title, and applicant correspondence address.",
        completed=False,
    ),
    ChecklistItem(
        item_id="chk-2",
        title="Written Description (Specification)",
        required_for="Provisional (USPTO)",
        description="Comprehensive technical narrative satisfying 35 U.S.C. 112(a) enablement. Anyone skilled in the art must be able to make and use the invention.",
        completed=False,
    ),
    ChecklistItem(
        item_id="chk-3",
        title="Informal Drawings / Schematics",
        required_for="Provisional (USPTO)",
        description="Black-and-white system architectures, flowcharts, or block diagrams numbered sequentially (Fig. 1, Fig. 2). Drawings cannot be added later without losing priority date.",
        completed=False,
    ),
    ChecklistItem(
        item_id="chk-4",
        title="Best Mode & Alternative Embodiments",
        required_for="Best Practice",
        description="Explicit disclosure of the best known implementation AND secondary alternative protocols/materials to prevent competitor design-arounds.",
        completed=False,
    ),
    ChecklistItem(
        item_id="chk-5",
        title="Statutory Micro/Small Entity Certification",
        required_for="Fee Reduction",
        description="Form PTO/SB/15A verifying qualification for the 80% micro-entity or 60% small-entity discount.",
        completed=False,
    ),
    ChecklistItem(
        item_id="chk-6",
        title="12-Month Calendar Deadline Setup",
        required_for="Statutory Bar Watch",
        description="Set calendar reminder for exactly 10 months and 12 months from filing date for mandatory non-provisional conversion.",
        completed=False,
    ),
]


PATENT_PROMPT_TEMPLATE = """You are an elite registered patent attorney and technical drafting specialist assisting an inventor on InnovX.

Your objective is to generate an educational, thorough, and highly actionable "Provisional Patent Application Preparation Package" for the following invention:

INVENTION TITLE: {title}
DOMAIN: {domain}
RAW DESCRIPTION: {raw_input}
PROBLEM STATEMENT: {problem_statement}
PROPOSED SOLUTION: {proposed_solution}
KEY FEATURES: {features_json}
PRIOR ART SUMMARY: {prior_art_summary}

CRITICAL RULES:
1. Frame this strictly as guidance and educational preparation material for discussion with a registered patent attorney.
2. Emphasize "enablement" and "written description" — advise the creator on how to describe not just their specific prototype, but the broad principles and alternative embodiments so competitors cannot design around them.
3. Propose 3-5 distinct "Suggested Claim Boundary Categories" (e.g., System Claim, Method/Algorithmic Execution Claim, Component Combination Claim). Label them clearly as suggested focus areas, NOT formal legal claims.
4. Highlight 2-4 Prior Art Gaps: directly contrast the invention's key features with existing academic or patent approaches.
5. Provide a realistic CPC / IPC classification suggestion.

You MUST reply with ONLY a valid JSON object matching this structure:
{{
  "technical_field": "Precise technical field sentence (e.g. 'This invention relates to...', 1-2 sentences)",
  "suggested_cpc_classes": ["CPC code + brief description", "CPC code 2..."],
  "background_art": "Objective description of the problem and state of the art without making invalidating admissions (2-3 paragraphs)",
  "invention_summary": "High-level summary of the novel mechanisms and advantages (2-3 paragraphs)",
  "detailed_spec_outline": [
    "Section 1: Architectural Overview & System Topology...",
    "Section 2: Data Acquisition & Sensor Fusion Subsystem...",
    "Section 3: Algorithmic Processing & Decision Logic...",
    "Section 4: Hardware Interfaces & Fail-Safe Telemetry..."
  ],
  "embodiment_variations": [
    "Primary Embodiment: Describe optimal reference architecture...",
    "Alternative Embodiment A: Edge-compute implementation...",
    "Alternative Embodiment B: Distributed multi-node fallback...",
    "Anticipated Variants: Explain interchangeable modules to deter design-arounds..."
  ],
  "suggested_claim_boundaries": [
    {{
      "category": "System / Apparatus Focus",
      "suggested_focus": "Structural combination of...",
      "novel_elements": ["Element 1", "Element 2", "Element 3"],
      "potential_fallbacks": ["Fallback parameter A", "Fallback architecture B"],
      "attorney_notes": "Advise patent counsel to emphasize the synergistic interaction between..."
    }},
    {{
      "category": "Method / Algorithmic Protocol",
      "suggested_focus": "Sequential execution steps of...",
      "novel_elements": ["Step 1", "Step 2", "Step 3"],
      "potential_fallbacks": ["Narrower step constraint A", "Alternate data pipeline B"],
      "attorney_notes": "Ensure method claims cover both local embedded execution and cloud/server coordination."
    }}
  ],
  "prior_art_gaps": [
    {{
      "feature_id": "F1",
      "feature_description": "Description of feature",
      "closest_prior_art_reference": "Closest existing approach or standard",
      "key_differentiation": "Specific point where the present invention breaks from prior art",
      "recommended_drafting_emphasis": "Draft with emphasis on the specific telemetry constraint..."
    }}
  ]
}}
"""


async def generate_patent_prep_package(
    innovation: dict[str, Any],
    prior_art_summary: Optional[str] = None,
) -> PatentPrepPackage:
    """
    Generate complete AI-assisted provisional patent application guidance package.
    """
    title = innovation.get("title", "Technical Innovation")
    raw_input = innovation.get("raw_input", "")
    structured_data = innovation.get("structured_data") or {}
    domain = structured_data.get("domain", "Technology")
    problem = structured_data.get("problem_statement", "")
    solution = structured_data.get("proposed_solution", "")
    key_features = structured_data.get("key_features", [])

    features_json = json.dumps(
        [
            {"id": f.get("id"), "description": f.get("description"), "category": f.get("category")}
            for f in key_features
        ],
        indent=2,
    )

    prior_art_text = prior_art_summary or "Multi-source prior art search across OpenAlex academic papers and USPTO patents."

    prompt = PATENT_PROMPT_TEMPLATE.format(
        title=title,
        domain=domain,
        raw_input=raw_input[:2000],
        problem_statement=problem,
        proposed_solution=solution,
        features_json=features_json,
        prior_art_summary=prior_art_text[:1000],
    )

    model = genai.GenerativeModel(
        MODEL_NAME,
        generation_config=genai.GenerationConfig(
            response_mime_type="application/json",
            temperature=0.25,
        ),
    )

    now_iso = datetime.now(timezone.utc).isoformat()

    try:
        response = await asyncio.to_thread(model.generate_content, prompt)
        res_text = response.text.strip()
        parsed = json.loads(res_text)
    except Exception as e:
        # Resilient heuristic fallback if Gemini or network encounters an issue
        print(f"[WARN] Gemini patent prep generation fallback: {str(e)}")
        parsed = _generate_heuristic_fallback(title, domain, problem, solution, key_features)

    # Format claim boundary items
    claim_items = []
    for c in parsed.get("suggested_claim_boundaries", []):
        claim_items.append(
            ClaimBoundaryItem(
                category=c.get("category", "General Technical Architecture"),
                suggested_focus=c.get("suggested_focus", "Key structural mechanisms"),
                novel_elements=c.get("novel_elements", ["Novel element A", "Novel element B"]),
                potential_fallbacks=c.get("potential_fallbacks", ["Fallback limitation"]),
                attorney_notes=c.get("attorney_notes", "Discuss independent vs dependent claim strategy."),
            )
        )

    # Format prior art gaps
    gap_items = []
    for g in parsed.get("prior_art_gaps", []):
        gap_items.append(
            PriorArtGapItem(
                feature_id=g.get("feature_id", "F1"),
                feature_description=g.get("feature_description", "Core technical mechanism"),
                closest_prior_art_reference=g.get("closest_prior_art_reference", "Existing academic / patent literature"),
                key_differentiation=g.get("key_differentiation", "Distinguished by novel implementation structure"),
                recommended_drafting_emphasis=g.get("recommended_drafting_emphasis", "Emphasize unique integration parameters."),
            )
        )

    return PatentPrepPackage(
        title=title,
        technical_field=parsed.get(
            "technical_field",
            f"This disclosure relates generally to the technical field of {domain}, and more specifically to automated, evidence-linked mechanisms."
        ),
        suggested_cpc_classes=parsed.get(
            "suggested_cpc_classes",
            [f"G06F (Computing; Data Processing Systems)", f"H04L (Transmission of Digital Information)"]
        ),
        background_art=parsed.get(
            "background_art",
            f"Contemporary solutions in {domain} face notable limitations in scalability, reliability, and computational efficiency. "
            f"Conventional systems frequently fail to address the specific problem: {problem}."
        ),
        invention_summary=parsed.get(
            "invention_summary",
            f"The present invention overcomes deficiencies in the prior art through a novel combination of technical elements. {solution}"
        ),
        detailed_spec_outline=parsed.get(
            "detailed_spec_outline",
            [
                "1. Structural System Architecture & Hardware Interconnects",
                "2. Algorithmic Processing & State Machine Operations",
                "3. Communication Protocols, Data Serialization & Storage",
                "4. Operational Methods & Error-Recovery Mechanisms",
            ]
        ),
        embodiment_variations=parsed.get(
            "embodiment_variations",
            [
                "Primary Embodiment: Core implementation incorporating reference components.",
                "Alternative Embodiment 1: Low-power edge-deployed configuration.",
                "Alternative Embodiment 2: High-throughput centralized distributed configuration.",
                "Design-Around Prevention: Disclose interchangeable alternative sensor types and communication protocols.",
            ]
        ),
        suggested_claim_boundaries=claim_items,
        prior_art_gaps=gap_items,
        filing_checklist=DEFAULT_CHECKLIST,
        jurisdictions=JURISDICTIONS_DATA,
        mandatory_disclaimer=MANDATORY_LEGAL_DISCLAIMER,
        generated_at=now_iso,
    )


def _generate_heuristic_fallback(
    title: str, domain: str, problem: str, solution: str, key_features: list[dict]
) -> dict:
    """Heuristic fallback generation when LLM is unavailable."""
    claims = [
        {
            "category": "System & Structural Architecture",
            "suggested_focus": f"A system for {domain.lower()} comprising integrated computing and processing components.",
            "novel_elements": [f.get("description", "Feature") for f in key_features[:3]] or ["Integrated processing module", "Secure telemetry bus"],
            "potential_fallbacks": ["Specific data protocol constraints", "Hardware modular failover"],
            "attorney_notes": "Advise counsel to draft independent claims covering structural physical embodiment and dependent claims on parameters.",
        },
        {
            "category": "Method & Algorithmic Execution",
            "suggested_focus": f"A computer-implemented method for executing {domain.lower()} workflows.",
            "novel_elements": ["Receiving telemetry inputs", "Executing transformation pipeline", "Transmitting authenticated result"],
            "potential_fallbacks": ["Local cache constraint", "Low-latency priority routing"],
            "attorney_notes": "Ensure method claims satisfy patent-eligibility standards under 35 U.S.C. 101 / Alice guidelines.",
        },
    ]

    gaps = []
    for i, f in enumerate(key_features[:3], 1):
        gaps.append(
            {
                "feature_id": f.get("id", f"F{i}"),
                "feature_description": f.get("description", "Core feature"),
                "closest_prior_art_reference": "Standard academic literature & baseline patents",
                "key_differentiation": f"Novel configuration tailored to {domain}",
                "recommended_drafting_emphasis": "Draft with specific architectural dependencies rather than abstract function.",
            }
        )

    return {
        "technical_field": f"This disclosure relates generally to {domain}, and more specifically to automated processing methods and systems.",
        "suggested_cpc_classes": ["G06F 17/00", "H04L 67/00"],
        "background_art": f"In the field of {domain}, existing techniques frequently suffer from lack of integration and operational friction. {problem}",
        "invention_summary": f"The present invention provides a robust, non-obvious solution. {solution}",
        "detailed_spec_outline": [
            "1. System Environment & Component Interconnects",
            "2. Operational Logic & Data Ingestion Flow",
            "3. Exception Handling & Telemetry Fallbacks",
            "4. Alternative Implementation Variants",
        ],
        "embodiment_variations": [
            "Primary Embodiment: Baseline deployment configuration.",
            "Secondary Embodiment: Modular hybrid distributed setup.",
            "Design-Around Precaution: Include disclosure of alternate communication protocols and processing topologies.",
        ],
        "suggested_claim_boundaries": claims,
        "prior_art_gaps": gaps,
    }


def generate_patent_prep_pdf(package: PatentPrepPackage) -> io.BytesIO:
    """
    Generate a high-quality multi-page branded PDF for the Provisional Patent Preparation Package.
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

    # Custom styles
    brand_emerald = colors.HexColor("#10B981")
    brand_dark = colors.HexColor("#0F172A")
    brand_amber = colors.HexColor("#D97706")
    brand_slate = colors.HexColor("#334155")
    brand_muted = colors.HexColor("#64748B")
    brand_bg_light = colors.HexColor("#F8FAFC")

    title_style = ParagraphStyle(
        "DocTitle",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=20,
        leading=24,
        textColor=brand_dark,
        alignment=TA_LEFT,
        spaceAfter=6,
    )

    subtitle_style = ParagraphStyle(
        "DocSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=11,
        leading=15,
        textColor=brand_muted,
        spaceAfter=14,
    )

    h1_style = ParagraphStyle(
        "SectionH1",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=13,
        leading=17,
        textColor=brand_emerald,
        spaceBefore=14,
        spaceAfter=6,
    )

    h2_style = ParagraphStyle(
        "SectionH2",
        parent=styles["Heading3"],
        fontName="Helvetica-Bold",
        fontSize=11,
        leading=14,
        textColor=brand_dark,
        spaceBefore=8,
        spaceAfter=4,
    )

    body_style = ParagraphStyle(
        "BodyDark",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9.5,
        leading=13.5,
        textColor=brand_slate,
        alignment=TA_LEFT,
        spaceAfter=6,
    )

    disclaimer_style = ParagraphStyle(
        "DisclaimerText",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#B45309"),
        alignment=TA_JUSTIFY,
    )

    story = []

    # 1. Header Banner
    story.append(Paragraph("INNOVX PATENT READINESS &amp; FILING PREPARATION PACKAGE", title_style))
    story.append(Paragraph(f"<b>Invention:</b> {package.title} &nbsp;|&nbsp; <b>Generated:</b> {package.generated_at[:10]}", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=brand_emerald, spaceAfter=10))

    # 2. Prominent Legal Disclaimer Box
    disclaimer_table = Table(
        [[Paragraph(f"<b>⚠️ MANDATORY STATUTORY NOTICE:</b><br/>{package.mandatory_disclaimer}", disclaimer_style)]],
        colWidths=[522],
    )
    disclaimer_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#FEF3C7")),
        ("BOX", (0, 0), (-1, -1), 1, brand_amber),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
    ]))
    story.append(disclaimer_table)
    story.append(Spacer(1, 12))

    # 3. Technical Field & Suggested Classes
    story.append(Paragraph("1. Technical Field &amp; Suggested Classifications", h1_style))
    story.append(Paragraph(f"<b>Technical Field:</b> {package.technical_field}", body_style))
    story.append(Paragraph("<b>Suggested CPC / IPC Classifications:</b>", h2_style))
    for cpc in package.suggested_cpc_classes:
        story.append(Paragraph(f"• <b>{cpc}</b>", body_style))
    story.append(Spacer(1, 10))

    # 4. Background & Invention Summary
    story.append(Paragraph("2. Background of the Invention &amp; Problem Articulation", h1_style))
    story.append(Paragraph(package.background_art, body_style))
    story.append(Spacer(1, 6))

    story.append(Paragraph("3. Summary of the Invention", h1_style))
    story.append(Paragraph(package.invention_summary, body_style))
    story.append(Spacer(1, 10))

    # 5. Detailed Specification Outline
    story.append(Paragraph("4. Recommended Specification Outline (Enablement Requirement)", h1_style))
    story.append(Paragraph(
        "<i>Under 35 U.S.C. 112(a), the provisional specification must describe the invention with sufficient specificity "
        "that a person having ordinary skill in the art (PHOSITA) could make and practice it without undue experimentation.</i>",
        body_style
    ))
    for item in package.detailed_spec_outline:
        story.append(Paragraph(f"<b>[§]</b> {item}", body_style))
    story.append(Spacer(1, 10))

    # 6. Embodiment & Variation Strategy (Design-Around Prevention)
    story.append(Paragraph("5. Embodiment Variations (Design-Around Deterrence)", h1_style))
    story.append(Paragraph(
        "<i>Crucial drafting tactic: disclosing secondary embodiments prevents competitors from making minor component substitutions to bypass your claims.</i>",
        body_style
    ))
    for var in package.embodiment_variations:
        story.append(Paragraph(f"• {var}", body_style))
    story.append(Spacer(1, 12))

    # 7. Suggested Claim Boundaries
    story.append(KeepTogether([
        Paragraph("6. Suggested Claim Boundary Areas (For Discussion with Patent Counsel)", h1_style),
        Paragraph(
            "<b>NOTICE:</b> Provisional applications do not legally require formal claims at filing, but including well-defined claim boundaries "
            "locks in explicit legal subject matter for priority purposes when converting to non-provisional.",
            body_style
        ),
    ]))

    for idx, cb in enumerate(package.suggested_claim_boundaries, 1):
        claim_content = [
            Paragraph(f"<b>Claim Boundary #{idx}: {cb.category}</b>", h2_style),
            Paragraph(f"<b>Target Focus:</b> {cb.suggested_focus}", body_style),
            Paragraph(f"<b>Novel Elements to Recite:</b> {', '.join(cb.novel_elements)}", body_style),
            Paragraph(f"<b>Dependent Fallback Positions:</b> {', '.join(cb.potential_fallbacks)}", body_style),
            Paragraph(f"<b>Attorney Drafting Tip:</b> <i>{cb.attorney_notes}</i>", body_style),
        ]
        c_table = Table([[claim_content]], colWidths=[522])
        c_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), brand_bg_light),
            ("BOX", (0, 0), (-1, -1), 0.75, colors.HexColor("#CBD5E1")),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ]))
        story.append(c_table)
        story.append(Spacer(1, 6))

    story.append(Spacer(1, 10))

    # 8. Prior Art Gaps & Differentiation
    if package.prior_art_gaps:
        story.append(KeepTogether([
            Paragraph("7. Prior Art Differentiation Matrix", h1_style),
            Paragraph("Points of departure between this invention and existing academic papers or patents:", body_style),
        ]))
        gap_rows = [["Feature ID & Description", "Closest Prior Art", "Key Differentiation", "Drafting Guidance"]]
        for g in package.prior_art_gaps:
            gap_rows.append([
                Paragraph(f"<b>{g.feature_id}:</b> {g.feature_description}", body_style),
                Paragraph(g.closest_prior_art_reference, body_style),
                Paragraph(g.key_differentiation, body_style),
                Paragraph(g.recommended_drafting_emphasis, body_style),
            ])
        gap_table = Table(gap_rows, colWidths=[130, 120, 132, 140])
        gap_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), brand_dark),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ]))
        story.append(gap_table)
        story.append(Spacer(1, 12))

    # 9. Jurisdiction Fee Calculator
    story.append(KeepTogether([
        Paragraph("8. Official Filing Fee Breakdown by Jurisdiction", h1_style),
        Paragraph("Direct government statutory filing fees (attorney drafting fees not included):", body_style),
    ]))

    fee_rows = [["Patent Office", "Entity Category", "Official Fee", "Filing Route / Portal"]]
    for jur_key, jur in package.jurisdictions.items():
        for fee in jur.fees:
            fee_rows.append([
                Paragraph(f"<b>{jur.office_name.split('(')[0].strip()}</b>", body_style),
                Paragraph(f"<b>{fee.name}</b><br/><font size=7 color='#64748B'>{fee.qualification}</font>", body_style),
                Paragraph(f"<b>{fee.amount}</b>", body_style),
                Paragraph(f"{fee.filing_route}<br/><font size=7 color='#10B981'>{jur.portal_name}</font>", body_style),
            ])

    fee_table = Table(fee_rows, colWidths=[130, 172, 80, 140])
    fee_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), brand_emerald),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(fee_table)
    story.append(Spacer(1, 12))

    # 10. Step-by-Step Filing Checklist
    story.append(KeepTogether([
        Paragraph("9. Step-by-Step Provisional Filing Checklist", h1_style),
    ]))
    chk_rows = [["Status", "Document / Action Item", "Jurisdiction / Rule", "Execution Instructions"]]
    for chk in package.filing_checklist:
        chk_rows.append([
            Paragraph("☐ PENDING", body_style),
            Paragraph(f"<b>{chk.title}</b>", body_style),
            Paragraph(chk.required_for, body_style),
            Paragraph(chk.description, body_style),
        ])
    chk_table = Table(chk_rows, colWidths=[60, 150, 110, 202])
    chk_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), brand_dark),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(chk_table)

    doc.build(story)
    buffer.seek(0)
    return buffer
