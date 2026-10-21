"""
InnovX Guardrails & Edge Case Engine — Evaluates raw idea submissions for validity,
detects brief, non-technical, or overly broad concepts, and provides constructive
clarifying questions to help creators narrow down and refine patentable architecture.
"""
import asyncio
import json
import os
import re
from typing import Optional
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

# Configure Gemini
api_key = os.getenv("GEMINI_API_KEY")
if api_key:
    genai.configure(api_key=api_key)

MODEL_NAME = os.getenv("GEMINI_MODEL", "gemini-flash-lite-latest")


GUARDRAIL_PROMPT = """You are an intellectual property and engineering triage specialist for InnovX, a technical prior-art and patent discovery engine.

Analyze the user's submission to determine its suitability for patent prior-art triangulation across academic papers (OpenAlex, arXiv) and USPTO patents.

CLASSIFY INTO ONE OF THREE STATUSES:
1. "valid" — The submission describes an engineering, software, hardware, scientific, algorithmic, or physical invention with identifiable components and mechanisms.
2. "non_technical" — The submission describes a restaurant, hospitality, lifestyle coaching, clothing store, generic business model, culinary recipe, or purely artistic/entertainment idea without underlying engineering, computing, or hardware innovations.
3. "overly_broad" — The submission names a technical domain (e.g., "AI for healthcare", "quantum blockchain", "robotics for elderly care") but is so abstract or brief that it lacks specific architectural mechanisms, inputs, transformations, or engineering constraints.

JSON OUTPUT SCHEMA:
{
  "status": "valid|non_technical|overly_broad",
  "headline": "Brief 1-sentence diagnostic headline",
  "feedback_message": "Constructive 2-3 sentence explanation of the diagnostic",
  "clarifying_questions": [
    "Specific engineering question 1 to clarify the concept",
    "Specific technical question 2 regarding architecture or mechanism",
    "Specific question 3 regarding inputs, transformations, or data flow"
  ],
  "suggested_template": "A brief fill-in-the-blank starter template tailored to their domain",
  "detected_domain": "Identified domain or general area (e.g., Culinary Business, Medical AI, Distributed Systems)"
}

Respond ONLY with valid JSON. No markdown backticks, no conversational preamble."""


def _heuristic_fallback(raw_text: str) -> dict:
    """Fallback rule-based classifier when LLM is unavailable or quota limited."""
    clean = raw_text.strip().lower()
    words = re.findall(r"\b\w+\b", clean)
    n_words = len(words)

    # 1. Check length
    if len(clean) < 50 or n_words < 12:
        return {
            "status": "short_input",
            "is_valid": False,
            "headline": "Submission Too Brief for Prior-Art Triangulation",
            "feedback_message": (
                f"Your submission is {n_words} words ({len(clean)} characters). "
                "Prior-art and patent triangulation requires at least 2-3 sentences covering: "
                "(1) the core problem, (2) technical mechanisms or algorithms, and (3) key hardware/software components."
            ),
            "clarifying_questions": [
                "What specific engineering or computational problem does this invention solve?",
                "What physical mechanism, circuit, or algorithmic pipeline executes the solution?",
                "What are the system inputs, operational constraints, and tangible outputs?",
            ],
            "suggested_template": (
                "An [engineering system / algorithm / device] for [specific problem], comprising "
                "[component A] configured to [action], and [component B] that executes [mechanism] "
                "to achieve [measurable outcome]."
            ),
            "detected_domain": "General Concept",
        }

    # 2. Check for non-technical indicators
    non_tech_keywords = [
        "restaurant", "bakery", "cafe", "coffee shop", "pizza", "burger", "bistro",
        "clothing store", "boutique", "fashion line", "apparel brand",
        "life coach", "motivational coaching", "fitness workout routine",
        "podcast about", "travel agency", "hair salon", "barbershop", "catering"
    ]
    tech_keywords = [
        "algorithm", "neural", "sensor", "hardware", "firmware", "circuit",
        "protocol", "database", "optical", "rfid", "lidar", "fpga", "actuator",
        "encryption", "cryptographic", "mesh", "subterranean", "autonomous",
        "pipeline", "bioreactor", "spectroscopy", "photovoltaic", "microcontroller"
    ]

    has_non_tech = any(kw in clean for kw in non_tech_keywords)
    has_tech = any(kw in clean for kw in tech_keywords)

    if has_non_tech and not has_tech:
        return {
            "status": "non_technical",
            "is_valid": False,
            "headline": "Non-Technical Concept Detected",
            "feedback_message": (
                "InnovX is an intellectual property engine built for technical innovations "
                "(software algorithms, hardware, biotechnology, physical systems, electronics). "
                "Your submission appears to be a business, creative, or hospitality concept without "
                "patentable technical components."
            ),
            "clarifying_questions": [
                "Does your concept incorporate proprietary hardware (e.g., custom IoT sensors, automated dispensing mechanics)?",
                "Is there a novel software algorithm or data routing protocol powering the service?",
                "Can you describe the physical or algorithmic apparatus rather than the commercial business model?",
            ],
            "suggested_template": (
                "An automated [hardware apparatus / software system] for [application], comprising "
                "[sensor/processor] executing [algorithm/method] to optimize [technical metric]."
            ),
            "detected_domain": "Commercial / Hospitality Service",
        }

    # 3. Check for overly broad concepts
    broad_patterns = [
        r"^an? ai (for|that) \w+$",
        r"^blockchain (for|in) \w+$",
        r"^smart \w+ using iot$",
        r"^machine learning to cure \w+$",
    ]
    for pat in broad_patterns:
        if re.search(pat, clean):
            return {
                "status": "overly_broad",
                "is_valid": False,
                "headline": "High-Level Concept Requires Technical Specifics",
                "feedback_message": (
                    "Your idea outlines a very broad domain vision. For a high-signal patent landscape "
                    "and novelty assessment, patent examiners look at the specific 'how' — the architecture, "
                    "data structures, and mechanical interactions."
                ),
                "clarifying_questions": [
                    "What specific model architecture, neural layer, or mathematical formulation is employed?",
                    "What exact hardware sensors or compute environments are required?",
                    "What edge cases or latency/throughput constraints are addressed?",
                ],
                "suggested_template": (
                    "A [specific technical system] utilizing [model/algorithm] trained on [modality] data, "
                    "featuring [novel component] to achieve [performance benchmark] under [constraints]."
                ),
                "detected_domain": "Broad Technology Vision",
            }

    # Default valid
    return {
        "status": "valid",
        "is_valid": True,
        "headline": "Technical Concept Verified",
        "feedback_message": "Submission contains sufficient technical structure for prior-art search.",
        "clarifying_questions": [],
        "suggested_template": None,
        "detected_domain": "Engineering / Technology",
    }


async def evaluate_submission(raw_text: str) -> dict:
    """
    Evaluate user idea text against guardrails.
    Returns diagnostic status, validity, feedback message, clarifying prompts, and suggested template.
    """
    # Fast-path 0: Enterprise Security & Prompt Injection Defense
    from services.security import detect_prompt_injection, sanitize_text
    is_injection, injection_reason = detect_prompt_injection(raw_text)
    if is_injection:
        return {
            "status": "security_violation",
            "is_valid": False,
            "headline": "Prompt Injection / Adversarial Pattern Shielded",
            "feedback_message": (
                "Your submission was flagged by the InnovX security guard: "
                f"{injection_reason}. "
                "To protect LLM pipeline integrity, system override instructions and adversarial prompts are blocked. "
                "Please describe your technical engineering invention directly without meta-prompts."
            ),
            "clarifying_questions": [
                "What specific engineering system or algorithm does this invention utilize?",
                "What physical hardware, circuit, or software components are involved?",
                "What measurable technical problem does the invention solve?",
            ],
            "suggested_template": (
                "An engineering apparatus for [specific application], comprising a [component A] "
                "configured to [action] and a [component B] executing [mechanism] to achieve [outcome]."
            ),
            "detected_domain": "Security / Adversarial Guard",
        }

    clean = sanitize_text(raw_text)
    words = re.findall(r"\b\w+\b", clean)

    # Fast-path 1: Check minimum length (< 50 chars or < 12 words)
    if len(clean) < 50 or len(words) < 12:
        return _heuristic_fallback(clean)

    # Use Gemini for semantic triage if available
    try:
        model = genai.GenerativeModel(MODEL_NAME)
        prompt = f"{GUARDRAIL_PROMPT}\n\nUSER SUBMISSION TO EVALUATE:\n\"\"\"\n{clean}\n\"\"\""
        
        response = await asyncio.to_thread(model.generate_content, prompt)
        text = response.text.strip()

        # Clean JSON markdown if wrapped
        if text.startswith("```"):
            lines = text.split("\n")
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].startswith("```"):
                lines = lines[:-1]
            text = "\n".join(lines).strip()

        data = json.loads(text)
        status = data.get("status", "valid").lower()

        # Ensure consistent structure
        is_valid = status == "valid"
        return {
            "status": status,
            "is_valid": is_valid,
            "headline": data.get("headline", "Submission Evaluated"),
            "feedback_message": data.get("feedback_message", ""),
            "clarifying_questions": data.get("clarifying_questions", []),
            "suggested_template": data.get("suggested_template"),
            "detected_domain": data.get("detected_domain", "Technology"),
        }
    except Exception as e:
        print(f"[WARN] Gemini guardrail check failed ({e}), falling back to heuristic evaluation")
        return _heuristic_fallback(clean)
