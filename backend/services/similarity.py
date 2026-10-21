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
        print(f"[OK] Model loaded: {MODEL_NAME} ({_model.get_sentence_embedding_dimension()}-dim)")
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


def compute_bm25_lexical_scores(
    query: str,
    documents: list[dict],
    text_key: str = "abstract",
    k1: float = 1.5,
    b: float = 0.75,
) -> list[float]:
    """
    Compute Okapi BM25 lexical relevance scores for documents against a query string.
    Combines abstract text and title (with 1.5x title boost).
    """
    import math
    import re

    if not documents:
        return []

    def tokenize(text: str) -> list[str]:
        if not text:
            return []
        # Lowercase and split on non-alphanumeric characters
        return [w for w in re.findall(r"\b[a-zA-Z0-9_\-]{2,}\b", text.lower()) if len(w) > 1]

    query_tokens = tokenize(query)
    if not query_tokens:
        return [0.0] * len(documents)

    doc_token_lists = []
    for doc in documents:
        title_tokens = tokenize(doc.get("title", "") or "")
        abstract_tokens = tokenize(doc.get(text_key, "") or "")
        # Title tokens weighted 1.5x by appending them again
        combined = abstract_tokens + title_tokens + title_tokens[: len(title_tokens) // 2]
        doc_token_lists.append(combined)

    N = len(documents)
    avgdl = sum(len(d) for d in doc_token_lists) / max(N, 1)
    if avgdl == 0:
        avgdl = 1.0

    # Calculate document frequencies for query terms
    df = {}
    for t in set(query_tokens):
        df[t] = sum(1 for d in doc_token_lists if t in d)

    # Compute BM25 scores
    scores = []
    for d in doc_token_lists:
        doc_len = len(d)
        score = 0.0
        # Term frequencies in this document
        tf = {}
        for token in d:
            tf[token] = tf.get(token, 0) + 1

        for t in query_tokens:
            if t not in df or df[t] == 0:
                continue
            # IDF with Robertson-Sparck Jones formula
            idf = math.log((N - df[t] + 0.5) / (df[t] + 0.5) + 1.0)
            term_freq = tf.get(t, 0)
            numerator = term_freq * (k1 + 1.0)
            denominator = term_freq + k1 * (1.0 - b + b * (doc_len / avgdl))
            if denominator > 0:
                score += idf * (numerator / denominator)

        scores.append(score)

    # Normalize scores to 0.0 - 1.0
    max_score = max(scores) if scores else 0.0
    if max_score > 0:
        return [float(s / max_score) for s in scores]
    return [0.0] * len(scores)


def reciprocal_rank_fusion(
    documents: list[dict],
    feature_text: str,
    k: int = 60,
    text_key: str = "abstract",
    top_k: int = 10,
) -> list[dict]:
    """
    Reciprocal Rank Fusion (RRF) combining dense semantic vector similarity
    (all-MiniLM-L6-v2) and lexical keyword relevance (Okapi BM25).

    Formula:
        RRF_score(d) = (1 / (k + rank_semantic(d))) + (1 / (k + rank_keyword(d)))

    Args:
        documents: Raw retrieved candidate documents.
        feature_text: Feature description and/or search queries.
        k: RRF smoothing constant (default: 60, standard IR benchmark value).
        text_key: Field containing document text.
        top_k: Maximum number of ranked documents to return.

    Returns:
        List of documents sorted by rrf_score descending, with rank details and scores.
    """
    if not documents:
        return []

    model = get_model()
    n_docs = len(documents)

    # 1. Compute Semantic Embeddings & Cosine Similarities
    feature_emb = model.encode([feature_text], normalize_embeddings=True)[0]
    doc_texts = [
        f"{doc.get('title', '')} {doc.get(text_key, '') or ''}".strip()
        for doc in documents
    ]
    doc_embs = model.encode(doc_texts, normalize_embeddings=True, batch_size=32)
    semantic_sims = np.dot(doc_embs, feature_emb).tolist()

    # 2. Compute BM25 Lexical Keyword Relevance
    keyword_scores = compute_bm25_lexical_scores(
        query=feature_text,
        documents=documents,
        text_key=text_key,
    )

    # 3. Establish Ranks (1-based, 1 is best)
    # Semantic ordering
    semantic_order = sorted(range(n_docs), key=lambda i: semantic_sims[i], reverse=True)
    semantic_ranks = {doc_idx: rank + 1 for rank, doc_idx in enumerate(semantic_order)}

    # Keyword ordering
    keyword_order = sorted(range(n_docs), key=lambda i: keyword_scores[i], reverse=True)
    keyword_ranks = {doc_idx: rank + 1 for rank, doc_idx in enumerate(keyword_order)}

    # 4. Compute Reciprocal Rank Fusion (RRF) Score
    scored_docs = []
    for i, doc in enumerate(documents):
        doc_copy = doc.copy()
        r_sem = semantic_ranks[i]
        r_key = keyword_ranks[i]

        rrf_val = (1.0 / (k + r_sem)) + (1.0 / (k + r_key))

        doc_copy["similarity_score"] = float(round(semantic_sims[i], 4))
        doc_copy["keyword_score"] = float(round(keyword_scores[i], 4))
        doc_copy["rrf_score"] = float(round(rrf_val, 6))
        doc_copy["rank_semantic"] = r_sem
        doc_copy["rank_keyword"] = r_key

        scored_docs.append(doc_copy)

    # 5. Sort by RRF score descending
    scored_docs.sort(key=lambda x: x["rrf_score"], reverse=True)

    # Assign final fused rank
    for rank, doc in enumerate(scored_docs):
        doc["rank_rrf"] = rank + 1

    return scored_docs[:top_k]

