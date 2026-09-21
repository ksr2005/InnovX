"""
Evidence Extraction Service — Uses Gemini to find the exact sentences in retrieved
documents that match each technical feature. This is the "explainability" layer.
"""
import json
import os

import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

MODEL_NAME = "gemini-2.0-flash"

EVIDENCE_PROMPT = """You are a precise technical evidence extractor for a prior-art analysis system.

Given a TECHNICAL FEATURE and a DOCUMENT ABSTRACT, your job is to:
1. Determine if the document contains evidence related to the feature.
2. If yes, extract the EXACT sentence(s) from the abstract that relate to the feature.
3. If no relevant sentence exists, return null.

RULES:
- Only extract sentences that ACTUALLY appear in the abstract. Do NOT paraphrase or generate text.
- Be precise. Partial relevance counts, but completely unrelated content should return null.
- Return the raw sentence as it appears, not a summary.

Respond with JSON: {"evidence_sentence": "exact sentence from abstract" } or {"evidence_sentence": null}"""


async def extract_evidence(
    feature_description: str,
    document_abstract: str,
) -> str | None:
    """
    Extract the specific evidence sentence from a document that relates to a feature.

    Args:
        feature_description: The technical feature to look for.
        document_abstract: The abstract/text of the retrieved document.

    Returns:
        The exact evidence sentence, or None if no match.
    """
    if not document_abstract or len(document_abstract.strip()) < 20:
        return None

    model = genai.GenerativeModel(
        MODEL_NAME,
        generation_config=genai.GenerationConfig(
            response_mime_type="application/json",
            temperature=0.1,  # Very low temp for precise extraction
        ),
    )

    prompt = f"""{EVIDENCE_PROMPT}

TECHNICAL FEATURE:
{feature_description}

DOCUMENT ABSTRACT:
{document_abstract}"""

    try:
        response = await model.generate_content_async(prompt)
        result = json.loads(response.text)
        return result.get("evidence_sentence")
    except Exception as e:
        print(f"Evidence extraction error: {e}")
        return None


async def extract_evidence_batch(
    feature_description: str,
    documents: list[dict],
    top_k: int = 5,
    abstract_key: str = "abstract",
) -> list[dict]:
    """
    Extract evidence for the top-k most similar documents for a given feature.
    Adds 'evidence_sentence' field to each document.

    Only runs evidence extraction on the top_k documents to save API calls.
    """
    results = []
    for doc in documents[:top_k]:
        abstract = doc.get(abstract_key, "")
        evidence = await extract_evidence(feature_description, abstract) if abstract else None
        doc_copy = doc.copy()
        doc_copy["evidence_sentence"] = evidence
        results.append(doc_copy)

    # For remaining docs beyond top_k, skip evidence extraction
    for doc in documents[top_k:]:
        doc_copy = doc.copy()
        doc_copy["evidence_sentence"] = None
        results.append(doc_copy)

    return results
