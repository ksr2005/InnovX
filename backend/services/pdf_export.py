"""
PDF Export Service — Generates professional PDF reports from InnovX analysis data.

Uses ReportLab (pure Python, no system dependencies) to create branded,
multi-page PDF reports with tables, color-coded scores, and evidence sections.
"""
import io
from datetime import datetime

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, mm
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
from reportlab.platypus.flowables import Flowable


# ─── Brand Colors ────────────────────────────────────────
BRAND_PRIMARY = colors.HexColor("#10B981")   # Emerald-500
BRAND_DARK = colors.HexColor("#1a1a2e")      # Dark navy
BRAND_ACCENT = colors.HexColor("#6366F1")    # Indigo-500
BRAND_MUTED = colors.HexColor("#6B7280")     # Gray-500
BRAND_BG = colors.HexColor("#F9FAFB")        # Gray-50
BRAND_CARD_BG = colors.HexColor("#F3F4F6")   # Gray-100

COVERAGE_COLORS = {
    "high": colors.HexColor("#EF4444"),    # Red — lots of prior art
    "medium": colors.HexColor("#F59E0B"),  # Amber
    "low": colors.HexColor("#10B981"),     # Green — little prior art
    "none": colors.HexColor("#22C55E"),    # Bright green — no prior art found
}

URGENCY_COLORS = {
    "high": colors.HexColor("#EF4444"),
    "medium": colors.HexColor("#F59E0B"),
    "low": colors.HexColor("#6B7280"),
}


# ─── Custom Flowables ───────────────────────────────────

class ScoreBar(Flowable):
    """Draws a horizontal score bar (0-100) with a fill color."""

    def __init__(self, score, width=200, height=14, label=None):
        Flowable.__init__(self)
        self.score = score
        self.bar_width = width
        self.bar_height = height
        self.label = label

    def wrap(self, availWidth, availHeight):
        return self.bar_width + 60, self.bar_height + 4

    def draw(self):
        # Background bar
        self.canv.setFillColor(colors.HexColor("#E5E7EB"))
        self.canv.roundRect(0, 0, self.bar_width, self.bar_height, 3, fill=1, stroke=0)

        # Fill bar
        fill_width = (self.score / 100.0) * self.bar_width
        if self.score >= 70:
            fill_color = BRAND_PRIMARY
        elif self.score >= 40:
            fill_color = colors.HexColor("#F59E0B")
        else:
            fill_color = colors.HexColor("#EF4444")

        self.canv.setFillColor(fill_color)
        self.canv.roundRect(0, 0, max(fill_width, 6), self.bar_height, 3, fill=1, stroke=0)

        # Score text
        self.canv.setFillColor(colors.black)
        self.canv.setFont("Helvetica-Bold", 9)
        self.canv.drawString(self.bar_width + 8, 2, f"{self.score:.0f}/100")


class CoverageBadge(Flowable):
    """Draws a small colored badge for coverage level."""

    def __init__(self, coverage, width=60, height=16):
        Flowable.__init__(self)
        self.coverage = coverage
        self.badge_width = width
        self.badge_height = height

    def wrap(self, availWidth, availHeight):
        return self.badge_width, self.badge_height

    def draw(self):
        color = COVERAGE_COLORS.get(self.coverage, colors.gray)
        self.canv.setFillColor(color)
        self.canv.roundRect(0, 0, self.badge_width, self.badge_height, 4, fill=1, stroke=0)
        self.canv.setFillColor(colors.white)
        self.canv.setFont("Helvetica-Bold", 8)
        text_width = self.canv.stringWidth(self.coverage.upper(), "Helvetica-Bold", 8)
        x = (self.badge_width - text_width) / 2
        self.canv.drawString(x, 4, self.coverage.upper())


# ─── Styles ──────────────────────────────────────────────

def _build_styles():
    """Create custom paragraph styles for the PDF."""
    styles = getSampleStyleSheet()

    styles.add(ParagraphStyle(
        name="BrandTitle",
        parent=styles["Title"],
        fontSize=22,
        textColor=BRAND_DARK,
        spaceAfter=6,
        fontName="Helvetica-Bold",
    ))

    styles.add(ParagraphStyle(
        name="BrandSubtitle",
        parent=styles["Normal"],
        fontSize=11,
        textColor=BRAND_MUTED,
        spaceAfter=12,
    ))

    styles.add(ParagraphStyle(
        name="SectionHeader",
        parent=styles["Heading1"],
        fontSize=15,
        textColor=BRAND_DARK,
        spaceBefore=18,
        spaceAfter=8,
        fontName="Helvetica-Bold",
        borderPadding=(0, 0, 4, 0),
    ))

    styles.add(ParagraphStyle(
        name="SubSectionHeader",
        parent=styles["Heading2"],
        fontSize=12,
        textColor=BRAND_ACCENT,
        spaceBefore=10,
        spaceAfter=4,
        fontName="Helvetica-Bold",
    ))

    styles.add(ParagraphStyle(
        name="BodyText2",
        parent=styles["Normal"],
        fontSize=9,
        textColor=colors.HexColor("#374151"),
        spaceAfter=6,
        leading=13,
        alignment=TA_JUSTIFY,
    ))

    styles.add(ParagraphStyle(
        name="EvidenceText",
        parent=styles["Normal"],
        fontSize=8,
        textColor=colors.HexColor("#6B7280"),
        leftIndent=12,
        spaceAfter=4,
        leading=11,
        fontName="Helvetica-Oblique",
    ))

    styles.add(ParagraphStyle(
        name="DisclaimerText",
        parent=styles["Normal"],
        fontSize=7,
        textColor=colors.HexColor("#9CA3AF"),
        spaceBefore=6,
        spaceAfter=2,
        leading=9,
        alignment=TA_CENTER,
    ))

    styles.add(ParagraphStyle(
        name="SmallLabel",
        parent=styles["Normal"],
        fontSize=8,
        textColor=BRAND_MUTED,
        spaceAfter=2,
    ))

    styles.add(ParagraphStyle(
        name="ScoreName",
        parent=styles["Normal"],
        fontSize=9,
        textColor=BRAND_DARK,
        fontName="Helvetica-Bold",
        spaceAfter=2,
    ))

    return styles


# ─── Page Template Callbacks ─────────────────────────────

def _header_footer(canvas, doc, report_title="", innovation_id=""):
    """Draw header and footer on every page."""
    canvas.saveState()

    # Header line
    canvas.setStrokeColor(BRAND_PRIMARY)
    canvas.setLineWidth(1.5)
    canvas.line(40, A4[1] - 40, A4[0] - 40, A4[1] - 40)

    # Header text
    canvas.setFont("Helvetica-Bold", 8)
    canvas.setFillColor(BRAND_DARK)
    canvas.drawString(40, A4[1] - 35, "InnovX")
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(BRAND_PRIMARY)
    canvas.drawString(72, A4[1] - 35, "Engine")

    canvas.setFont("Helvetica", 7)
    canvas.setFillColor(BRAND_MUTED)
    if innovation_id:
        canvas.drawRightString(A4[0] - 40, A4[1] - 35, f"Report #{innovation_id}")

    # Footer
    canvas.setStrokeColor(colors.HexColor("#E5E7EB"))
    canvas.setLineWidth(0.5)
    canvas.line(40, 35, A4[0] - 40, 35)

    canvas.setFont("Helvetica", 6)
    canvas.setFillColor(BRAND_MUTED)
    canvas.drawString(
        40, 22,
        "InnovX provides evidence-based prior-art analysis, not legal advice. "
        "Consult a patent attorney before making IP decisions."
    )
    canvas.drawRightString(A4[0] - 40, 22, f"Page {doc.page}")

    canvas.restoreState()


# ─── Main PDF Generator ─────────────────────────────────

def generate_pdf(report: dict) -> bytes:
    """
    Generate a complete PDF from a report dictionary.

    Args:
        report: The 10-section report dict from report_gen.generate_report()

    Returns:
        bytes: The PDF file content
    """
    buffer = io.BytesIO()
    styles = _build_styles()

    title = report.get("title", "Innovation Report")
    domain = report.get("domain", "")
    innovation_id = report.get("innovation_id", "")
    generated_at = report.get("generated_at", "")
    provenance = report.get("provenance", {})
    sections = report.get("sections", [])

    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        topMargin=55,
        bottomMargin=50,
        leftMargin=40,
        rightMargin=40,
        title=f"InnovX Report - {title}",
        author="InnovX Engine",
    )

    # Build page callback with closure over report data
    def on_page(canvas, doc):
        _header_footer(canvas, doc, title, innovation_id)

    story = []

    # ─── Cover / Title Block ─────────────────────────────
    story.append(Spacer(1, 20))
    story.append(Paragraph(
        f'<font color="#{BRAND_DARK.hexval()[2:]}">{_escape(title)}</font>',
        styles["BrandTitle"]
    ))
    story.append(Paragraph(
        f'Domain: {_escape(domain)} | Report #{innovation_id} | '
        f'Generated: {_format_timestamp(generated_at)}',
        styles["BrandSubtitle"]
    ))
    story.append(HRFlowable(
        width="100%", thickness=1, color=BRAND_PRIMARY,
        spaceAfter=12, spaceBefore=4
    ))

    # ─── Table of Contents ───────────────────────────────
    story.append(Paragraph("Table of Contents", styles["SectionHeader"]))
    toc_data = []
    for section in sections:
        toc_data.append([
            Paragraph(f'<b>{section["id"]}.</b>', styles["BodyText2"]),
            Paragraph(section["title"], styles["BodyText2"]),
        ])

    if toc_data:
        toc_table = Table(toc_data, colWidths=[30, 400])
        toc_table.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("TOPPADDING", (0, 0), (-1, -1), 2),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
        ]))
        story.append(toc_table)

    story.append(Spacer(1, 12))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#E5E7EB")))

    # ─── Render Each Section ─────────────────────────────
    section_map = {s["id"]: s for s in sections}

    # Section A: Executive Summary
    if "A" in section_map:
        _render_executive_summary(story, section_map["A"], styles)

    # Section B: Structured Innovation
    if "B" in section_map:
        _render_structured_section(story, section_map["B"], styles)

    # Section C: Search Methodology
    if "C" in section_map:
        _render_methodology(story, section_map["C"], styles)

    # Section D: Prior Art Found
    if "D" in section_map:
        _render_prior_art(story, section_map["D"], styles)

    # Section E: Feature Comparison Matrix
    if "E" in section_map:
        _render_matrix(story, section_map["E"], styles)

    # Section F: Similarity Analysis
    if "F" in section_map:
        _render_similarity(story, section_map["F"], styles)

    # Section G: Potential Differentiators
    if "G" in section_map:
        _render_differentiators(story, section_map["G"], styles)

    # Section H: Innovation Assessment
    if "H" in section_map:
        _render_assessment(story, section_map["H"], styles)

    # Section I: Search Confidence & Limitations
    if "I" in section_map:
        _render_confidence(story, section_map["I"], styles)

    # Section J: Recommended Next Steps
    if "J" in section_map:
        _render_next_steps(story, section_map["J"], styles)

    # ─── Provenance Footer ───────────────────────────────
    story.append(Spacer(1, 20))
    story.append(HRFlowable(width="100%", thickness=1, color=BRAND_PRIMARY))
    story.append(Spacer(1, 8))
    story.append(Paragraph("Provenance Record", styles["SubSectionHeader"]))

    prov_hash = provenance.get("document_hash", "N/A")
    prov_version = provenance.get("version", 1)
    prov_prev = provenance.get("previous_hash") or "None (v1)"
    prov_created = provenance.get("created_at", "")

    story.append(Paragraph(
        f'Version: {prov_version} | '
        f'Created: {_format_timestamp(prov_created)}',
        styles["SmallLabel"]
    ))
    story.append(Paragraph(
        f'SHA-256: <font face="Courier" size="7">{_escape(prov_hash)}</font>',
        styles["SmallLabel"]
    ))
    story.append(Paragraph(
        f'Previous: <font face="Courier" size="7">{_escape(prov_prev)}</font>',
        styles["SmallLabel"]
    ))

    story.append(Spacer(1, 16))
    story.append(Paragraph(
        "This report was generated by InnovX Engine. "
        "It provides evidence-based prior-art analysis and does not constitute legal, "
        "business, or investment advice. The SHA-256 provenance hash above can be used "
        "to verify report integrity. Consult qualified professionals before making "
        "IP or business decisions.",
        styles["DisclaimerText"]
    ))

    # Build the PDF
    doc.build(story, onFirstPage=on_page, onLaterPages=on_page)

    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes


# ─── Section Renderers ───────────────────────────────────

def _render_executive_summary(story, section, styles):
    """Section A: Executive Summary"""
    content = section.get("content", {})
    story.append(Paragraph(
        f'A. {section["title"]}',
        styles["SectionHeader"]
    ))

    # Key scores table
    key_scores = content.get("key_scores", {})
    if key_scores:
        score_data = [
            [
                Paragraph("<b>Metric</b>", styles["SmallLabel"]),
                Paragraph("<b>Score</b>", styles["SmallLabel"]),
            ]
        ]
        score_names = {
            "prior_art_density": "Prior Art Density",
            "feature_novelty": "Feature Novelty",
            "combination_distinctiveness": "Combination Distinctiveness",
        }
        for key, label in score_names.items():
            val = key_scores.get(key, 0)
            score_data.append([
                Paragraph(label, styles["BodyText2"]),
                Paragraph(f"<b>{val:.0f}</b>/100", styles["BodyText2"]),
            ])

        score_table = Table(score_data, colWidths=[250, 120])
        score_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), BRAND_CARD_BG),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E5E7EB")),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ]))
        story.append(score_table)
        story.append(Spacer(1, 8))

    features_count = content.get("features_analyzed", 0)
    story.append(Paragraph(
        f"Features Analyzed: {features_count}",
        styles["SmallLabel"]
    ))

    # AI Summary
    ai_summary = content.get("ai_summary", "")
    if ai_summary:
        story.append(Spacer(1, 6))
        story.append(Paragraph(
            f"<b>AI Assessment:</b> {_escape(ai_summary)}",
            styles["BodyText2"]
        ))


def _render_structured_section(story, section, styles):
    """Section B: Structured Innovation"""
    content = section.get("content", {})
    story.append(Paragraph(f'B. {section["title"]}', styles["SectionHeader"]))

    problem = content.get("problem_statement", "")
    solution = content.get("proposed_solution", "")

    if problem:
        story.append(Paragraph("<b>Problem Statement</b>", styles["SubSectionHeader"]))
        story.append(Paragraph(_escape(problem), styles["BodyText2"]))

    if solution:
        story.append(Paragraph("<b>Proposed Solution</b>", styles["SubSectionHeader"]))
        story.append(Paragraph(_escape(solution), styles["BodyText2"]))

    # Key Features list
    features = content.get("key_features", [])
    if features:
        story.append(Paragraph("<b>Key Features</b>", styles["SubSectionHeader"]))
        for f in features:
            fid = f.get("id", "")
            fdesc = f.get("description", "")
            fcat = f.get("category", "")
            story.append(Paragraph(
                f'<b>{_escape(fid)}</b> [{_escape(fcat)}]: {_escape(fdesc)}',
                styles["BodyText2"]
            ))

    # Target Applications
    apps = content.get("target_applications", [])
    if apps:
        story.append(Paragraph("<b>Target Applications</b>", styles["SubSectionHeader"]))
        for app in apps:
            story.append(Paragraph(f"- {_escape(app)}", styles["BodyText2"]))


def _render_methodology(story, section, styles):
    """Section C: Search Methodology"""
    content = section.get("content", {})
    story.append(Paragraph(f'C. {section["title"]}', styles["SectionHeader"]))

    method = content.get("method", "")
    if method:
        story.append(Paragraph(_escape(method), styles["BodyText2"]))

    sources = content.get("sources_searched", [])
    if sources:
        story.append(Paragraph("<b>Sources:</b> " + ", ".join(
            _escape(s) for s in sources
        ), styles["BodyText2"]))

    embedding = content.get("embedding_model", "")
    if embedding:
        story.append(Paragraph(
            f"<b>Embedding Model:</b> {_escape(embedding)}",
            styles["SmallLabel"]
        ))

    ranking = content.get("ranking_method", "")
    if ranking:
        story.append(Paragraph(
            f"<b>Ranking:</b> {_escape(ranking)}",
            styles["SmallLabel"]
        ))


def _render_prior_art(story, section, styles):
    """Section D: Prior Art Found"""
    content = section.get("content", {})
    story.append(Paragraph(f'D. {section["title"]}', styles["SectionHeader"]))

    total = content.get("total_documents_found", 0)
    unique = content.get("unique_documents_in_report", 0)
    story.append(Paragraph(
        f"Total documents found: {total} | Included in report: {unique}",
        styles["SmallLabel"]
    ))

    by_feature = content.get("by_feature", [])
    for feat in by_feature:
        fid = feat.get("feature_id", "")
        fdesc = feat.get("feature_description", "")
        coverage = feat.get("coverage", "none")
        docs_found = feat.get("documents_found", 0)

        story.append(Spacer(1, 6))
        story.append(Paragraph(
            f'<b>{_escape(fid)}: {_escape(fdesc)}</b> '
            f'(Coverage: {coverage.upper()}, {docs_found} docs)',
            styles["BodyText2"]
        ))

        top_matches = feat.get("top_matches", [])
        for match in top_matches[:3]:  # Top 3 per feature in PDF
            m_title = match.get("title", "Untitled")
            m_source = match.get("source", "")
            m_sim = match.get("similarity", 0)
            m_evidence = match.get("evidence_sentence")
            m_url = match.get("url", "")

            story.append(Paragraph(
                f'- <b>{_escape(m_title)}</b> '
                f'[{_escape(m_source)}] '
                f'(similarity: {m_sim:.1%})',
                styles["BodyText2"]
            ))
            if m_evidence:
                story.append(Paragraph(
                    f'Evidence: "{_escape(m_evidence)}"',
                    styles["EvidenceText"]
                ))
            if m_url:
                story.append(Paragraph(
                    f'<link href="{_escape(m_url)}">{_escape(m_url)}</link>',
                    styles["EvidenceText"]
                ))


def _render_matrix(story, section, styles):
    """Section E: Feature Comparison Matrix"""
    content = section.get("content", {})
    story.append(Paragraph(f'E. {section["title"]}', styles["SectionHeader"]))

    matrix = content.get("matrix", [])
    if not matrix:
        story.append(Paragraph("No feature data available.", styles["BodyText2"]))
        return

    # Build table
    header = [
        Paragraph("<b>Feature</b>", styles["SmallLabel"]),
        Paragraph("<b>Coverage</b>", styles["SmallLabel"]),
        Paragraph("<b>Top Match</b>", styles["SmallLabel"]),
        Paragraph("<b>Similarity</b>", styles["SmallLabel"]),
    ]
    rows = [header]

    for row in matrix:
        feature_text = row.get("feature", "")[:60]
        coverage = row.get("coverage", "none")
        top_match = row.get("top_match_title", "None")[:45]
        similarity = row.get("top_match_similarity", 0)

        coverage_color = COVERAGE_COLORS.get(coverage, colors.gray)

        rows.append([
            Paragraph(_escape(feature_text), styles["BodyText2"]),
            Paragraph(
                f'<font color="#{coverage_color.hexval()[2:]}">'
                f'<b>{coverage.upper()}</b></font>',
                styles["BodyText2"]
            ),
            Paragraph(_escape(top_match), styles["BodyText2"]),
            Paragraph(f"{similarity:.1%}", styles["BodyText2"]),
        ])

    col_widths = [180, 65, 180, 60]
    table = Table(rows, colWidths=col_widths, repeatRows=1)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), BRAND_CARD_BG),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E5E7EB")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, BRAND_BG]),
    ]))
    story.append(table)


def _render_similarity(story, section, styles):
    """Section F: Similarity Analysis"""
    content = section.get("content", {})
    story.append(Paragraph(f'F. {section["title"]}', styles["SectionHeader"]))

    overlaps = content.get("overlaps", [])
    gaps = content.get("gaps", [])

    story.append(Paragraph(
        f"Overlaps with existing work: {len(overlaps)} | "
        f"Potential gaps (novel areas): {len(gaps)}",
        styles["SmallLabel"]
    ))

    if overlaps:
        story.append(Paragraph("<b>Overlaps (Features with Prior Art)</b>", styles["SubSectionHeader"]))
        for o in overlaps:
            story.append(Paragraph(
                f'- {_escape(o.get("feature", ""))} '
                f'[{o.get("coverage", "").upper()}] '
                f'-- closest: {_escape(o.get("closest_match", ""))} '
                f'({o.get("similarity", 0):.1%})',
                styles["BodyText2"]
            ))

    if gaps:
        story.append(Paragraph("<b>Gaps (Potentially Novel)</b>", styles["SubSectionHeader"]))
        for g in gaps:
            story.append(Paragraph(
                f'- {_escape(g.get("feature", ""))} [{g.get("coverage", "").upper()}]',
                styles["BodyText2"]
            ))


def _render_differentiators(story, section, styles):
    """Section G: Potential Differentiators"""
    content = section.get("content", {})
    story.append(Paragraph(f'G. {section["title"]}', styles["SectionHeader"]))

    features = content.get("features", [])
    if features:
        for f in features:
            story.append(Paragraph(
                f'<b>{_escape(f.get("feature_id", ""))}: '
                f'{_escape(f.get("description", ""))}</b> '
                f'[{f.get("coverage", "").upper()}]',
                styles["BodyText2"]
            ))
            explanation = f.get("explanation", "")
            if explanation:
                story.append(Paragraph(_escape(explanation), styles["EvidenceText"]))
    else:
        story.append(Paragraph(
            "No clear differentiators identified. All features have some prior art coverage.",
            styles["BodyText2"]
        ))

    disclaimer = content.get("disclaimer", "")
    if disclaimer:
        story.append(Spacer(1, 6))
        story.append(Paragraph(_escape(disclaimer), styles["DisclaimerText"]))


def _render_assessment(story, section, styles):
    """Section H: Innovation Assessment — all 6 scores"""
    content = section.get("content", {})
    story.append(Paragraph(f'H. {section["title"]}', styles["SectionHeader"]))

    scores = content.get("scores", {})
    score_labels = {
        "prior_art_density": "Prior Art Density",
        "feature_novelty": "Feature Novelty",
        "combination_distinctiveness": "Combination Distinctiveness",
        "research_freshness": "Research Freshness",
        "evidence_strength": "Evidence Strength",
        "search_confidence": "Search Confidence",
    }

    for key, label in score_labels.items():
        score_data = scores.get(key, {})
        value = score_data.get("value", 0)
        explanation = score_data.get("explanation", "")
        references = score_data.get("references", [])

        story.append(Spacer(1, 6))
        story.append(Paragraph(f"<b>{label}</b>", styles["ScoreName"]))
        story.append(ScoreBar(value, width=300))
        story.append(Spacer(1, 2))
        if explanation:
            story.append(Paragraph(_escape(explanation), styles["BodyText2"]))
        if references:
            refs_text = ", ".join(_escape(r) for r in references[:3])
            story.append(Paragraph(
                f"References: {refs_text}",
                styles["EvidenceText"]
            ))


def _render_confidence(story, section, styles):
    """Section I: Search Confidence & Limitations"""
    content = section.get("content", {})
    story.append(Paragraph(f'I. {section["title"]}', styles["SectionHeader"]))

    conf_score = content.get("confidence_score", 0)
    explanation = content.get("explanation", "")

    story.append(Paragraph(
        f"Search Confidence Score: <b>{conf_score:.0f}/100</b>",
        styles["BodyText2"]
    ))
    if explanation:
        story.append(Paragraph(_escape(explanation), styles["BodyText2"]))

    limitations = content.get("limitations", [])
    if limitations:
        story.append(Paragraph("<b>Known Limitations:</b>", styles["SubSectionHeader"]))
        for lim in limitations:
            story.append(Paragraph(f"- {_escape(lim)}", styles["BodyText2"]))

    not_covered = content.get("not_covered", [])
    if not_covered:
        story.append(Paragraph("<b>Not Covered by This Analysis:</b>", styles["SubSectionHeader"]))
        for item in not_covered:
            story.append(Paragraph(f"- {_escape(item)}", styles["BodyText2"]))


def _render_next_steps(story, section, styles):
    """Section J: Recommended Next Steps"""
    content = section.get("content", {})
    story.append(Paragraph(f'J. {section["title"]}', styles["SectionHeader"]))

    steps = content.get("steps", [])
    if steps:
        for i, step in enumerate(steps, 1):
            action = step.get("action", "")
            reason = step.get("reason", "")
            urgency = step.get("urgency", "low")
            urgency_color = URGENCY_COLORS.get(urgency, colors.gray)

            story.append(Paragraph(
                f'<b>{i}. {_escape(action)}</b> '
                f'<font color="#{urgency_color.hexval()[2:]}">'
                f'[{urgency.upper()}]</font>',
                styles["BodyText2"]
            ))
            if reason:
                story.append(Paragraph(_escape(reason), styles["EvidenceText"]))

    disclaimer = content.get("disclaimer", "")
    if disclaimer:
        story.append(Spacer(1, 8))
        story.append(Paragraph(_escape(disclaimer), styles["DisclaimerText"]))


# ─── Utilities ───────────────────────────────────────────

def _escape(text) -> str:
    """Escape text for safe use in ReportLab Paragraphs (XML-based)."""
    if not isinstance(text, str):
        text = str(text)
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def _format_timestamp(ts) -> str:
    """Format an ISO timestamp to a human-readable string."""
    if not ts:
        return "N/A"
    try:
        if isinstance(ts, str):
            # Handle ISO format with or without timezone
            dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
        elif isinstance(ts, datetime):
            dt = ts
        else:
            return str(ts)
        return dt.strftime("%Y-%m-%d %H:%M UTC")
    except (ValueError, TypeError):
        return str(ts)
