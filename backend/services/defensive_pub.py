"""
Defensive Publication Service — Day 17 / Week 3 (Share Path).

Generates formal technical disclosures formatted for IP.com, Google TDCommons,
and IBM Technical Disclosure Bulletin standards to establish immediate,
permanent, and unassailable prior art.
"""
from __future__ import annotations

import io
import json
import os
import hashlib
import asyncio
from datetime import datetime, timezone
from typing import Any, Optional

import google.generativeai as genai
from dotenv import load_dotenv

from models.schemas import (
    DefensivePublication,
    SubmissionPortalInfo,
)

load_dotenv()

# Configure Gemini
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
MODEL_NAME = os.getenv("GEMINI_MODEL", "gemini-flash-lite-latest")

DEFENSIVE_FORFEITURE_WARNING = (
    "DEFENSIVE PUBLICATION STATUTORY NOTICE: This technical disclosure is published intentionally to establish "
    "defensive prior art under 35 U.S.C. § 102(a)(1), Article 54 EPC, and international patent statutes. "
    "Publication of this document constitutes an immediate, permanent, and irrevocable public disclosure. "
    "In absolute novelty jurisdictions (including the European Patent Office, China, Japan, and the United Kingdom), "
    "neither the author nor any third party may subsequently obtain a valid patent monopoly covering the subject "
    "matter disclosed herein. This disclosure is dedicated to securing unrestricted freedom to operate (FTO) for the public domain."
)

DEFAULT_SUBMISSION_PORTALS = [
    SubmissionPortalInfo(
        name="IP.com Prior Art Database",
        portal_url="https://ip.com/prior-art-database/",
        cost_info="~$150 – $220 per disclosure",
        indexing_speed="Immediate (within 24 hours)",
        description="The primary defensive publication registry indexed directly by USPTO, EPO, JPO, and WIPO patent examiners worldwide.",
    ),
    SubmissionPortalInfo(
        name="Google Technical Disclosure Commons (TDCommons)",
        portal_url="https://www.tdcommons.org/",
        cost_info="Free (Open Access)",
        indexing_speed="1 – 3 business days",
        description="Public repository hosted on Elsevier's Digital Commons platform. Widely crawled by patent offices and academic search engines.",
    ),
    SubmissionPortalInfo(
        name="Research Disclosure",
        portal_url="https://www.researchdisclosure.com/",
        cost_info="~$180 per article",
        indexing_speed="Monthly print & daily online",
        description="The world's longest-running defensive publishing service (est. 1960). Over 90% of leading patent offices subscribe.",
    ),
    SubmissionPortalInfo(
        name="arXiv.org Open Access",
        portal_url="https://arxiv.org/submit",
        cost_info="Free",
        indexing_speed="24 hours (moderated)",
        description="Standard scientific preprint repository for computer science, robotics, physics, and electrical engineering.",
    ),
]

DISCLOSURE_PROMPT_TEMPLATE = """You are an expert intellectual property attorney and technical author specializing in defensive technical publications in the style of the IBM Technical Disclosure Bulletin and the IP.com Prior Art Database.

Your objective is to generate an exhaustive, highly technical defensive disclosure document for the following invention:

INVENTION TITLE: {title}
DOMAIN: {domain}
RAW DESCRIPTION: {raw_input}
PROBLEM STATEMENT: {problem_statement}
PROPOSED SOLUTION: {proposed_solution}
KEY FEATURES: {features_json}

PURPOSE OF THIS DOCUMENT:
The creator has chosen the SHARE pathway. This document will be published publicly to create immediate prior art against competitors and establish unassailable Freedom-to-Operate (FTO).

CRITICAL DRAFTING REQUIREMENTS:
1. The title should be in formal disclosure format (e.g., "METHOD, APPARATUS, AND SYSTEM FOR...").
2. Provide a rigorous, highly specific Abstract (75-150 words).
3. The Background should describe the state of the art and articulate the exact limitations of conventional methods.
4. The Detailed Description must be granular, enabling, and technical. Describe architectural components, data pipelines, signal protocols, message framing, hardware configurations, and step-by-step algorithms.
5. Provide 3-5 Embodiment Variants: you MUST disclose alternate configurations, sensor substitutions, and hybrid topologies so competitors cannot patent trivial modifications or design-arounds.
6. Provide 3-5 concrete Technical Advantages highlighting why this technical solution is superior.
7. Suggest realistic CPC / IPC classification symbols.

You MUST respond with ONLY a valid JSON object matching this structure:
{{
  "title": "METHOD, SYSTEM, AND APPARATUS FOR...",
  "technical_field": "This disclosure relates to the field of...",
  "cpc_classes": ["CPC code 1", "CPC code 2"],
  "abstract": "Concise technical summary of the disclosure...",
  "background": "Detailed background explaining the technical context and deficiencies in prior art...",
  "detailed_description": [
    "1. Architectural System Overview: Describe the primary computing and physical environment...",
    "2. Data Processing and Signal Ingestion: Detail the input telemetry and parsing logic...",
    "3. Execution Protocol and Operational Logic: Walk through the algorithmic steps...",
    "4. Telemetry Serialization and Interface Specifications: Specify data formatting and bus interfaces..."
  ],
  "embodiment_variants": [
    "Variant A: Distributed multi-node topology incorporating...",
    "Variant B: Edge-compute low-power microcontroller deployment...",
    "Variant C: Alternative sensor / interface substitution utilizing...",
    "Variant D: Asynchronous cloud synchronization fallback..."
  ],
  "advantages": [
    "Advantage 1: Substantially reduces computational overhead by...",
    "Advantage 2: Eliminates dependency on external infrastructure by...",
    "Advantage 3: Enhances fault-tolerance during hardware disconnects..."
  ]
}}
"""


async def generate_defensive_publication(
    innovation: dict[str, Any],
) -> DefensivePublication:
    """
    Generate a formal defensive disclosure document adhering to IP.com / IBM TDB standards.
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

    prompt = DISCLOSURE_PROMPT_TEMPLATE.format(
        title=title,
        domain=domain,
        raw_input=raw_input[:2000],
        problem_statement=problem,
        proposed_solution=solution,
        features_json=features_json,
    )

    model = genai.GenerativeModel(
        MODEL_NAME,
        generation_config=genai.GenerationConfig(
            response_mime_type="application/json",
            temperature=0.2,
        ),
    )

    now_iso = datetime.now(timezone.utc).isoformat()

    try:
        response = await asyncio.to_thread(model.generate_content, prompt)
        res_text = response.text.strip()
        parsed = json.loads(res_text)
    except Exception as e:
        print(f"[WARN] Gemini defensive publication fallback: {str(e)}")
        parsed = _generate_heuristic_defensive_fallback(title, domain, problem, solution, key_features)

    # Compute SHA-256 hash of publication payload
    canonical_text = json.dumps(parsed, sort_keys=True) + now_iso
    pub_hash = hashlib.sha256(canonical_text.encode("utf-8")).hexdigest()

    return DefensivePublication(
        title=parsed.get("title", f"METHOD AND SYSTEM FOR {title.upper()}"),
        technical_field=parsed.get(
            "technical_field",
            f"This disclosure relates generally to {domain}, and more particularly to methods, architectures, and computer-readable media for implementing technical workflows."
        ),
        cpc_classes=parsed.get("cpc_classes", ["G06F 16/00", "H04L 67/00"]),
        abstract=parsed.get(
            "abstract",
            f"A method and system for {title.lower()} is disclosed. The disclosed apparatus integrates novel computing and telemetry mechanisms to address {problem} without relying on conventional limitations."
        ),
        background=parsed.get(
            "background",
            f"In the field of {domain}, conventional implementations encounter significant technical hurdles regarding latency, scalability, and operational reliability. Specifically, current solutions fail to adequately resolve: {problem}. The techniques disclosed herein overcome these challenges."
        ),
        detailed_description=parsed.get(
            "detailed_description",
            [
                f"1. Structural System Topology: The system comprises one or more processing units interconnected via a high-speed communication bus.",
                f"2. Data Processing Pipeline: Input signals are parsed, normalized, and transformed according to deterministic validation rules.",
                f"3. Operational Method Execution: Sequential processing executes asynchronously to handle data transformations and fault states.",
                f"4. Telemetry and Persistence: Processed outputs are serialized into verifiable immutable payloads.",
            ]
        ),
        embodiment_variants=parsed.get(
            "embodiment_variants",
            [
                "Variant 1: Centralized multi-threaded architecture optimized for high-throughput enterprise servers.",
                "Variant 2: Embedded edge deployment operating within constrained-memory microcontrollers.",
                "Variant 3: Distributed peer-to-peer topology with redundant consensus synchronization.",
                "Variant 4: Modular sensory interface allowing plug-and-play interchangeable transducer hardware.",
            ]
        ),
        advantages=parsed.get(
            "advantages",
            [
                "Substantially reduces computational resource consumption and algorithmic execution latency.",
                "Guarantees operational continuity under intermittent network or hardware connectivity.",
                "Prevents proprietary lock-in by disclosing full operational protocol specifications to the public domain.",
            ]
        ),
        publication_hash=pub_hash,
        timestamp=now_iso,
        forfeiture_warning=DEFENSIVE_FORFEITURE_WARNING,
        submission_portals=DEFAULT_SUBMISSION_PORTALS,
    )


def _generate_heuristic_defensive_fallback(
    title: str, domain: str, problem: str, solution: str, key_features: list[dict]
) -> dict:
    """Heuristic fallback for defensive disclosure generation."""
    feature_descs = [f.get("description", "Feature") for f in key_features[:4]] or ["Automated processing mechanism"]
    
    desc_steps = []
    for i, fd in enumerate(feature_descs, 1):
        desc_steps.append(f"Section {i}. Implementation of {fd}: Disclosing specific structural interconnects and operational parameters.")

    return {
        "title": f"SYSTEM, METHOD, AND APPARATUS FOR {title.upper()}",
        "technical_field": f"This disclosure relates generally to the technical domain of {domain}, and specifically to automated technical architectures.",
        "cpc_classes": ["G06F 16/90", "H04L 67/10"],
        "abstract": f"A comprehensive technical disclosure is provided for {title}. The system implements: {solution[:300]}. Disclosed methods establish prior art and ensure public freedom to operate.",
        "background": f"Conventional systems in {domain} exhibit notable inefficiencies. In particular, existing approaches fail to overcome: {problem}.",
        "detailed_description": desc_steps or [
            "1. System Environment: Hardware topology and processing components.",
            "2. Algorithmic Workflow: State machines and execution protocols.",
            "3. Exception Handling: Fault-tolerant recovery procedures.",
        ],
        "embodiment_variants": [
            "Variant A: Distributed multi-node cloud configuration.",
            "Variant B: Lightweight local edge hardware implementation.",
            "Variant C: Modular hybrid sensor bus fallback.",
        ],
        "advantages": [
            "Eliminates latency bottlenecks observed in legacy systems.",
            "Secures verified freedom to operate for public domain implementers.",
            "Prevents competitor patent blockades through complete technical enablement.",
        ],
    }


def format_publication_as_markdown(pub: DefensivePublication) -> str:
    """
    Format the complete defensive disclosure as standard GitHub/academic Markdown.
    """
    cpc_str = ", ".join(pub.cpc_classes)
    variants_md = "\n".join([f"- {v}" for v in pub.embodiment_variants])
    advantages_md = "\n".join([f"- {a}" for a in pub.advantages])
    spec_md = "\n\n".join([f"### {item}" for item in pub.detailed_description])

    md = f"""# {pub.title}

> **Defensive Prior Art Technical Disclosure**  
> **Published via InnovX Defensive Publication Engine**  
> **Publication Hash (SHA-256):** `{pub.publication_hash}`  
> **Timestamp (UTC):** `{pub.timestamp}`  
> **Suggested CPC/IPC Classifications:** `{cpc_str}`  

---

## Statutory Legal Notice & Defensive Declaration

> [!WARNING]
> {pub.forfeiture_warning}

---

## Abstract

{pub.abstract}

---

## 1. Technical Field

{pub.technical_field}

---

## 2. Background of the Invention & Prior Art Limitations

{pub.background}

---

## 3. Detailed Enabling Technical Description

{spec_md}

---

## 4. Alternative Embodiments & Structural Variants

To ensure complete enablement across design variations and prevent competitor design-arounds:

{variants_md}

---

## 5. Technical Advantages & Synergistic Effects

{advantages_md}

---

## Cryptographic Provenance Record

- **Document Identifier:** `{pub.publication_hash[:16]}`
- **SHA-256 Integrity Hash:** `{pub.publication_hash}`
- **Timestamp of Generation:** `{pub.timestamp}`
- **Dedicated Portals:** IP.com Prior Art Database, Google TDCommons, Research Disclosure, arXiv.org
"""
    return md


def generate_defensive_pub_pdf(pub: DefensivePublication) -> io.BytesIO:
    """
    Generate a formal multi-page branded PDF of the defensive technical disclosure.
    Formatted in classic IBM Technical Disclosure Bulletin / IP.com style.
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

    brand_cyan = colors.HexColor("#06B6D4")      # Cyan-500
    brand_dark = colors.HexColor("#0F172A")      # Dark navy
    brand_slate = colors.HexColor("#334155")     # Slate-700
    brand_muted = colors.HexColor("#64748B")     # Slate-500
    brand_red = colors.HexColor("#B91C1C")       # Red-700

    title_style = ParagraphStyle(
        "PubTitle",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=15,
        leading=19,
        textColor=brand_dark,
        alignment=TA_LEFT,
        spaceAfter=6,
    )

    meta_style = ParagraphStyle(
        "PubMeta",
        parent=styles["Normal"],
        fontName="Courier",
        fontSize=8,
        leading=11,
        textColor=brand_muted,
        spaceAfter=10,
    )

    h1_style = ParagraphStyle(
        "SectionH1",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=11.5,
        leading=15,
        textColor=brand_cyan,
        spaceBefore=12,
        spaceAfter=5,
    )

    body_style = ParagraphStyle(
        "PubBody",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=13,
        textColor=brand_slate,
        alignment=TA_JUSTIFY,
        spaceAfter=6,
    )

    warning_style = ParagraphStyle(
        "WarningText",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=11,
        textColor=brand_red,
        alignment=TA_JUSTIFY,
    )

    story = []

    # 1. Header Banner
    story.append(Paragraph("DEFENSIVE TECHNICAL DISCLOSURE BULLETIN", ParagraphStyle(
        "TopBanner", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=9, textColor=brand_cyan, spaceAfter=2
    )))
    story.append(Paragraph(pub.title, title_style))
    story.append(Paragraph(
        f"<b>DOCUMENT SHA-256 HASH:</b> {pub.publication_hash}<br/>"
        f"<b>DATE / TIME (UTC):</b> {pub.timestamp} &nbsp;|&nbsp; <b>CLASSIFICATIONS:</b> {', '.join(pub.cpc_classes)}",
        meta_style
    ))
    story.append(HRFlowable(width="100%", thickness=1.5, color=brand_cyan, spaceAfter=10))

    # 2. Statutory Legal Warning Box
    warning_table = Table(
        [[Paragraph(f"<b>⚠️ IRREVOCABLE PRIOR ART CREATION NOTICE:</b><br/>{pub.forfeiture_warning}", warning_style)]],
        colWidths=[522],
    )
    warning_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#FEF2F2")),
        ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#F87171")),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(warning_table)
    story.append(Spacer(1, 10))

    # 3. Abstract
    story.append(Paragraph("ABSTRACT", h1_style))
    story.append(Paragraph(pub.abstract, body_style))
    story.append(Spacer(1, 6))

    # 4. Technical Field & Background
    story.append(Paragraph("1. TECHNICAL FIELD", h1_style))
    story.append(Paragraph(pub.technical_field, body_style))
    story.append(Spacer(1, 6))

    story.append(Paragraph("2. BACKGROUND OF THE DISCLOSURE", h1_style))
    story.append(Paragraph(pub.background, body_style))
    story.append(Spacer(1, 8))

    # 5. Detailed Enabling Description
    story.append(Paragraph("3. DETAILED ENABLING SPECIFICATION", h1_style))
    story.append(Paragraph(
        "<i>The following technical specification describes the architectural structure, execution sequence, "
        "and component interactions in complete detail to satisfy statutory enabling prior art standards.</i>",
        body_style
    ))
    for step in pub.detailed_description:
        story.append(Paragraph(f"<b>[§]</b> {step}", body_style))
        story.append(Spacer(1, 3))

    story.append(Spacer(1, 8))

    # 6. Alternative Embodiments
    story.append(KeepTogether([
        Paragraph("4. ALTERNATIVE EMBODIMENTS &amp; VARIANT STRUCTURES", h1_style),
        Paragraph(
            "<i>To prevent third parties from claiming obvious architectural variants, the following secondary implementations are explicitly disclosed:</i>",
            body_style
        ),
    ]))
    for var in pub.embodiment_variants:
        story.append(Paragraph(f"• {var}", body_style))
        story.append(Spacer(1, 2))

    story.append(Spacer(1, 8))

    # 7. Advantages & Synergies
    story.append(KeepTogether([
        Paragraph("5. TECHNICAL ADVANTAGES OVER EXISTING ART", h1_style),
    ]))
    for adv in pub.advantages:
        story.append(Paragraph(f"✓ {adv}", body_style))
        story.append(Spacer(1, 2))

    story.append(Spacer(1, 10))

    # 8. Publication Submission Portals Directory
    story.append(KeepTogether([
        Paragraph("6. COMPLIANT DEFENSIVE PUBLICATION REGISTRIES", h1_style),
        Paragraph("This technical document is formatted for direct submission to the following recognized prior art registries:", body_style),
    ]))

    portal_rows = [["Registry Name", "Indexing Speed", "Official Cost", "Official URL"]]
    for portal in pub.submission_portals:
        portal_rows.append([
            Paragraph(f"<b>{portal.name}</b>", body_style),
            Paragraph(portal.indexing_speed, body_style),
            Paragraph(portal.cost_info, body_style),
            Paragraph(f"<font color='#06B6D4'>{portal.portal_url}</font>", body_style),
        ])

    portal_table = Table(portal_rows, colWidths=[150, 110, 110, 152])
    portal_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), brand_dark),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(portal_table)

    doc.build(story)
    buffer.seek(0)
    return buffer
