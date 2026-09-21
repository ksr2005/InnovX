"""
Similarity Engine — Computes semantic similarity between features and retrieved documents.
Uses sentence-transformers for embeddings (runs locally on CPU, zero API cost).
"""
import numpy as np
from sentence_transformers import SentenceTransformer
from typing import Optional

# Global model reference — loaded once at startup
_model: Optional[SentenceTransformer] = None
MODEL_NAME = "all-MiniLM-L6-v2"  # 22MB, 384-dim, runs on CPU in ~10ms


def load_embedding_model():
    """Load the embedding model into memory. Called once at startup."""
    global _model
    if _model is None:
        print(f"Loading embedding model: {MODEL_NAME}...")
        _model = SentenceTransformer(MODEL_NAME)
        print(f"✓ Model loaded: {MODEL_NAME} ({_model.get_sentence_embedding_dimension()}-dim)")
    return _model


def get_model() -> SentenceTransformer:
    """Get the loaded model, loading it if necessary."""
    global _model
    if _model is None:
        load_embedding_model()
    return _model


def compute_embedding(text: str) -> list[float]:
    """Compute embedding vector for a single text string."""
    model = get_model()
    embedding = model.encode(text, normalize_embeddings=True)
    return embedding.tolist()


def compute_embeddings_batch(texts: list[str]) -> list[list[float]]:
    """Compute embedding vectors for a batch of texts (more efficient)."""
    model = get_model()
    embeddings = model.encode(texts, normalize_embeddings=True, batch_size=32)
    return embeddings.tolist()


def cosine_similarity(vec_a: list[float], vec_b: list[float]) -> float:
    """Compute cosine similarity between two embedding vectors."""
    a = np.array(vec_a)
    b = np.array(vec_b)
    # Vectors are already normalized by sentence-transformers, so dot product = cosine sim
    return float(np.dot(a, b))


def compute_similarity_matrix(
    feature_texts: list[str],
    document_texts: list[str],
) -> list[list[float]]:
    """
    Compute pairwise cosine similarity between features and documents.

    Returns a matrix where matrix[i][j] = similarity between feature i and document j.
    """
    model = get_model()

    feature_embeddings = model.encode(feature_texts, normalize_embeddings=True, batch_size=32)
    document_embeddings = model.encode(document_texts, normalize_embeddings=True, batch_size=32)

    # Dot product of normalized vectors = cosine similarity
    similarity_matrix = np.dot(feature_embeddings, document_embeddings.T)

    return similarity_matrix.tolist()


def rank_documents_for_feature(
    feature_text: str,
    documents: list[dict],
    text_key: str = "abstract",
    top_k: int = 10,
) -> list[dict]:
    """
    Rank documents by semantic similarity to a feature.

    Args:
        feature_text: The feature description.
        documents: List of document dicts, each containing a text field.
        text_key: Key in document dict containing the text to compare.
        top_k: Number of top results to return.

    Returns:
        Top-k documents sorted by similarity, with similarity_score added.
    """
    if not documents:
        return []

    model = get_model()

    # Get feature embedding
    feature_emb = model.encode([feature_text], normalize_embeddings=True)[0]

    # Get document embeddings
    doc_texts = [doc.get(text_key, "") or "" for doc in documents]
    doc_embs = model.encode(doc_texts, normalize_embeddings=True, batch_size=32)

    # Compute similarities
    similarities = np.dot(doc_embs, feature_emb)

    # Create scored results
    scored = []
    for i, doc in enumerate(documents):
        doc_copy = doc.copy()
        doc_copy["similarity_score"] = float(similarities[i])
        scored.append(doc_copy)

    # Sort by similarity descending
    scored.sort(key=lambda x: x["similarity_score"], reverse=True)

    return scored[:top_k]
