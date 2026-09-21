"""
AI Idea Structuring Engine — Uses Gemini to decompose raw ideas into structured technical features.
"""
import json
import os
from typing import Optional

import google.generativeai as genai
from dotenv import load_dotenv

from models.schemas import StructuredIdea

load_dotenv()

# Configure Gemini
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# Use Gemini 2.0 Flash for speed and free tier
MODEL_NAME = "gemini-2.0-flash"

STRUCTURING_PROMPT = """You are an expert technical analyst for an innovation discovery platform called InnovX.

Your job is to take a raw, unstructured idea description and decompose it into a structured technical analysis.

IMPORTANT RULES:
1. Extract 3-12 atomic technical features. Each feature should be a specific, searchable technical capability.
2. Features should be specific enough to search for prior art. "Uses sensors" is too vague. "LiDAR-based 3D mapping in GPS-denied underground environments" is good.
3. Generate 2-4 search queries per feature optimized for finding prior art in academic papers and patents.
4. Be objective and precise. Do not add features the user did not describe.
5. Categorize each feature as: hardware, software, method, system, or application.

You MUST respond with valid JSON matching this exact schema:
{
  "title": "Concise title for the innovation (max 100 chars)",
  "problem_statement": "The specific problem this innovation addresses (2-3 sentences)",
  "proposed_solution": "How the innovation solves the problem (2-3 sentences)",
  "domain": "Primary technical domain (e.g., robotics, healthcare, AI, communications)",
  "key_features": [
    {
      "id": "F1",
      "description": "Clear description of this specific technical feature",
      "category": "hardware|software|method|system|application",
      "search_queries": [
        "optimized search query 1",
        "optimized search query 2",
        "optimized search query 3"
      ]
    }
  ],
  "target_applications": ["application1", "application2"],
  "technical_components": {
    "hardware": ["component1", "component2"],
    "software": ["component1", "component2"],
    "methods": ["method1", "method2"]
  }
}

Respond ONLY with the JSON object. No markdown, no explanations, no code blocks."""


async def structure_idea(raw_text: str) -> StructuredIdea:
    """
    Take raw natural language idea and decompose into structured technical features.

    Args:
        raw_text: The user's idea description in natural language.

    Returns:
        StructuredIdea with extracted features and search queries.
    """
    model = genai.GenerativeModel(
        MODEL_NAME,
        generation_config=genai.GenerationConfig(
            response_mime_type="application/json",
            temperature=0.2,  # Low temperature for consistent, precise extraction
        ),
    )

    prompt = f"{STRUCTURING_PROMPT}\n\nUSER'S IDEA:\n{raw_text}"

    response = await model.generate_content_async(prompt)
    result_text = response.text

    # Parse the JSON response
    try:
        parsed = json.loads(result_text)
    except json.JSONDecodeError:
        # Try to extract JSON from markdown code blocks if present
        import re
        json_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', result_text, re.DOTALL)
        if json_match:
            parsed = json.loads(json_match.group(1))
        else:
            raise ValueError(f"Failed to parse Gemini response as JSON: {result_text[:500]}")

    # Validate and return as Pydantic model
    structured = StructuredIdea(**parsed)
    return structured


async def generate_search_queries(feature_description: str, domain: str) -> list[str]:
    """
    Generate additional search queries for a specific feature.
    Used when initial search returns too few results.
    """
    model = genai.GenerativeModel(
        MODEL_NAME,
        generation_config=genai.GenerationConfig(
            response_mime_type="application/json",
            temperature=0.3,
        ),
    )

    prompt = f"""Generate 5 diverse search queries for finding prior art (academic papers, patents, technical documents) related to this technical feature.

Feature: {feature_description}
Domain: {domain}

Use different terminology, synonyms, and related concepts for each query.
Respond with a JSON array of strings: ["query1", "query2", "query3", "query4", "query5"]"""

    response = await model.generate_content_async(prompt)
    queries = json.loads(response.text)

    if isinstance(queries, list):
        return queries
    return queries.get("queries", [])
