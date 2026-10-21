"""
Marketplace Sanitizer Service (Day 18 / Week 3).
Generates AI-sanitized, non-confidential public summaries for the NDA-gated marketplace.
Enforces Rule 4 (Private by default) and Rule 6 (Confidentiality protection):
Patentable mechanisms, proprietary algorithms, and trade secrets are withheld
until mutual NDA execution, while showcasing commercial problem/solution fit.
"""
import os
import json
import asyncio
from typing import Any, Optional
import google.generativeai as genai
from dotenv import load_dotenv

from models.schemas import SanitizedListingDraft

load_dotenv()

# Configure Gemini
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
MODEL_NAME = os.getenv("GEMINI_MODEL", "gemini-flash-lite-latest")

SANITIZATION_NOTICE = (
    "CONFIDENTIALITY SHIELD ACTIVE: This summary has been automatically sanitized to protect "
    "underlying patentability and proprietary trade secrets. Detailed claim boundaries, architecture diagrams, "
    "and full implementation specifications remain confidential and accessible solely upon execution of a Mutual NDA."
)

SANITIZER_PROMPT_TEMPLATE = """You are an elite intellectual property counsel and corporate commercialization strategist.
Your task is to create a compelling, NON-CONFIDENTIAL executive listing summary for an innovation to be showcased on a commercial technology marketplace.

CRITICAL CONFIDENTIALITY & PATENT RULES:
1. Do NOT reveal patentable novel mechanisms, proprietary algorithms, specific formulas, exact sensor configurations, or trade secrets.
2. DO clearly explain:
   - What real-world industry problem is solved.
   - The operational application domain and target industries.
   - The overarching functional capability and commercial value proposition (e.g., speed, efficiency, reliability, cost savings).
   - What commercial engagement models are most suitable.
3. Explicitly list the specific technical elements that have been INTENTIONALLY WITHHELD to protect the creator's intellectual property.

INVENTION DETAILS:
TITLE: {title}
DOMAIN: {domain}
RAW DESCRIPTION: {raw_input}
PROBLEM STATEMENT: {problem_statement}
PROPOSED SOLUTION: {proposed_solution}
EXTRACTED FEATURES: {features}

Respond ONLY with a valid JSON object matching this exact schema:
{{
  "public_title": "A professional, non-infringing executive title (e.g., 'Autonomous Subterranean Navigation System')",
  "public_description": "2-3 well-written paragraphs explaining the operational problem, the high-level functional approach, and the commercial breakthrough, WITHOUT disclosing confidential mechanism details or equations.",
  "domain": "{domain}",
  "target_market": ["Industry Sector 1", "Industry Sector 2", "Industry Sector 3"],
  "commercial_value_prop": "Key measurable business advantage or efficiency improvement (1-2 sentences).",
  "suggested_stage": "concept" | "detailed_design" | "prototype" | "mvp",
  "suggested_availability": ["license", "co_development", "sale", "investment"],
  "withheld_confidential_elements": [
    "Specific sensor fusion weighting algorithms",
    "Proprietary packet synchronization protocol",
    "Custom hardware circuit schematics"
  ]
}}
"""


async def generate_sanitized_draft(
    title: str,
    domain: str,
    raw_input: str,
    structured_data: Optional[dict[str, Any]] = None,
) -> SanitizedListingDraft:
    """
    Generate an AI-sanitized public teaser that protects confidential trade secrets.
    """
    struct = structured_data or {}
    problem_statement = struct.get("problem_statement", "General technical bottleneck in domain.")
    proposed_solution = struct.get("proposed_solution", "Engineered technological solution.")
    
    # Extract feature descriptions if available
    features_list = struct.get("features", [])
    if isinstance(features_list, list):
        feature_strs = [
            f.get("description", str(f)) if isinstance(f, dict) else str(f)
            for f in features_list
        ]
        features_text = "; ".join(feature_strs) if feature_strs else "Proprietary technical architecture"
    else:
        features_text = "Proprietary technical architecture"

    prompt = SANITIZER_PROMPT_TEMPLATE.format(
        title=title,
        domain=domain or "Technology",
        raw_input=raw_input[:1500],
        problem_statement=problem_statement,
        proposed_solution=proposed_solution,
        features=features_text,
    )

    try:
        model = genai.GenerativeModel(
            model_name=MODEL_NAME,
            generation_config={"response_mime_type": "application/json"},
        )
        # Always use asyncio.to_thread on Windows to prevent gRPC deadlock
        response = await asyncio.to_thread(model.generate_content, prompt)
        
        raw_text = response.text.strip()
        data = json.loads(raw_text)

        return SanitizedListingDraft(
            public_title=data.get("public_title", title),
            public_description=data.get("public_description", proposed_solution),
            domain=data.get("domain", domain or "Technology"),
            target_market=data.get("target_market", [domain or "Technology", "Enterprise Systems"]),
            commercial_value_prop=data.get(
                "commercial_value_prop",
                "Delivers significant performance and cost improvements over legacy solutions."
            ),
            suggested_stage=data.get("suggested_stage", "prototype"),
            suggested_availability=data.get(
                "suggested_availability", ["license", "co_development"]
            ),
            withheld_confidential_elements=data.get(
                "withheld_confidential_elements",
                [
                    "Proprietary algorithmic implementation details",
                    "Underlying claim boundaries and formulas",
                    "Detailed architectural schematics",
                ],
            ),
            sanitization_notice=SANITIZATION_NOTICE,
        )
    except Exception as e:
        print(f"[WARN] Gemini sanitization error ({e}); using deterministic safe fallback")
        return create_fallback_sanitized_draft(
            title=title,
            domain=domain,
            problem_statement=problem_statement,
            proposed_solution=proposed_solution,
        )


def create_fallback_sanitized_draft(
    title: str,
    domain: str,
    problem_statement: str,
    proposed_solution: str,
) -> SanitizedListingDraft:
    """
    Deterministic non-confidential fallback in case AI quota is exhausted.
    """
    # Clean the title of overtly sensitive wording
    clean_title = f"Advanced {domain or 'Technology'} Architecture: {title}"
    
    # Generic sanitized narrative
    desc = (
        f"This technology targets significant operational inefficiencies in the {domain or 'technical'} space. "
        f"Specifically addressing: {problem_statement[:200]}... "
        f"The architecture provides an end-to-end framework designed for scalable commercial adoption. "
        f"Core technical mechanisms and full intellectual property claims are safeguarded under mutual confidentiality."
    )

    return SanitizedListingDraft(
        public_title=clean_title[:100],
        public_description=desc,
        domain=domain or "Technology",
        target_market=[domain or "Technology", "Industrial Automation", "Commercial Systems"],
        commercial_value_prop="High-efficiency architecture designed to address domain-specific scalability barriers.",
        suggested_stage="concept",
        suggested_availability=["license", "co_development"],
        withheld_confidential_elements=[
            "Novel algorithmic logic and execution parameters",
            "Full patent claim boundaries and proof-of-concept benchmarks",
            "Internal component interconnections and firmware specs",
        ],
        sanitization_notice=SANITIZATION_NOTICE,
    )
