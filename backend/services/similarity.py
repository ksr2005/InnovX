"""
Similarity Engine — Computes semantic similarity between features and retrieved documents.
Uses Google Gemini Cloud Embeddings (gemini-embedding-001, 3072-dim) for 0 MB server RAM consumption,
with a robust local TF-IDF / hashing vectorizer fallback.
"""
import os
import gc
import numpy as np
import google.generativeai as genai
from typing import Optional

MODEL_NAME = "gemini-embedding-001"  # 3072-dim cloud embedding, 0 MB server RAM


def _fallback_token_embedding(text: str, dim: int = 384) -> list[float]:
    """Lightweight hash-based pseudo-embedding when offline or unconfigured."""
    import hashlib
    words = (text or "").lower().split()
    vec = [0.0] * dim
    if not words:
        return vec
    for w in words:
        h = int(hashlib.md5(w.encode("utf-8")).hexdigest(), 16)
        idx = h % dim
        vec[idx] += 1.0
    norm = np.linalg.norm(vec)
    if norm > 0:
        vec = (np.array(vec) / norm).tolist()
    return vec


def load_embedding_model():
    """Verify cloud embedding engine configuration."""
    api_key = os.getenv("GEMINI_API_KEY")
    if api_key:
        genai.configure(api_key=api_key)
        print(f"[OK] Cloud Embedding Engine Active: {MODEL_NAME} (3072-dim, 0 MB server RAM)")
    else:
        print("[WARN] GEMINI_API_KEY missing; using local lexical fallback.")
    return True


def get_model():
    return None


def compute_embedding(text: str) -> list[float]:
    """Compute embedding vector using Gemini Cloud Embeddings (0 MB server RAM)."""
    if not text or not text.strip():
        return [0.0] * 384

    try:
        api_key = os.getenv("GEMINI_API_KEY")
        if api_key:
            res = genai.embed_content(model="models/gemini-embedding-001", content=text.strip())
            if "embedding" in res:
                return res["embedding"]
    except Exception as e:
        print(f"[WARN] Cloud embedding API call failed: {e}. Using vector fallback.")

    return _fallback_token_embedding(text)


def compute_embeddings_batch(texts: list[str]) -> list[list[float]]:
    """Compute embedding vectors in batch with 0 MB server RAM using Gemini Cloud Embeddings."""
    if not texts:
        return []

    clean_texts = [t.strip() if t and t.strip() else "none" for t in texts]

    try:
        api_key = os.getenv("GEMINI_API_KEY")
        if api_key:
            # Batch in chunks of 20 to avoid exceeding payload limits
            all_embs = []
            chunk_size = 20
            for i in range(0, len(clean_texts), chunk_size):
                chunk = clean_texts[i : i + chunk_size]
                res = genai.embed_content(model="models/gemini-embedding-001", content=chunk)
                if "embedding" in res:
                    all_embs.extend(res["embedding"])
            if len(all_embs) == len(clean_texts):
                return all_embs
    except Exception as e:
        print(f"[WARN] Batch cloud embedding failed: {e}. Using vector fallback.")

    return [_fallback_token_embedding(t) for t in clean_texts]


def cosine_similarity(vec_a: list[float], vec_b: list[float]) -> float:
    """Compute cosine similarity between two embedding vectors."""
    a = np.array(vec_a)
    b = np.array(vec_b)
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(np.dot(a, b) / (norm_a * norm_b))


def compute_similarity(text_a: str, text_b: str) -> float:
    """Compute semantic cosine similarity between two text strings."""
    try:
        embs = compute_embeddings_batch([text_a, text_b])
        if len(embs) == 2:
            return cosine_similarity(embs[0], embs[1])
    except Exception:
        pass
    vec_a = _fallback_token_embedding(text_a)
    vec_b = _fallback_token_embedding(text_b)
    return cosine_similarity(vec_a, vec_b)


def compute_similarity_matrix(
    feature_texts: list[str],
    document_texts: list[str],
) -> list[list[float]]:
    """
    Compute pairwise cosine similarity between features and documents.
    Returns a matrix where matrix[i][j] = similarity between feature i and document j.
    """
    try:
        feat_embs = np.array(compute_embeddings_batch(feature_texts))
        doc_embs = np.array(compute_embeddings_batch(document_texts))

        feat_norms = np.linalg.norm(feat_embs, axis=1, keepdims=True)
        feat_norms[feat_norms == 0] = 1.0
        norm_feat = feat_embs / feat_norms

        doc_norms = np.linalg.norm(doc_embs, axis=1, keepdims=True)
        doc_norms[doc_norms == 0] = 1.0
        norm_doc = doc_embs / doc_norms

        similarity_matrix = np.dot(norm_feat, norm_doc.T)
        return similarity_matrix.tolist()
    except Exception as e:
        print(f"[WARN] Matrix cloud encode failed ({e}), using lexical fallback")

    feat_embs = np.array([_fallback_token_embedding(t) for t in feature_texts])
    doc_embs = np.array([_fallback_token_embedding(t) for t in document_texts])
    similarity_matrix = np.dot(feat_embs, doc_embs.T)
    return similarity_matrix.tolist()


def rank_documents_for_feature(
    feature_text: str,
    documents: list[dict],
    text_key: str = "abstract",
    top_k: int = 10,
) -> list[dict]:
    """Rank documents by semantic similarity to a feature."""
    if not documents:
        return []

    try:
        doc_texts = [doc.get(text_key, "") or "" for doc in documents]
        feature_emb = np.array(compute_embedding(feature_text))
        doc_embs = np.array(compute_embeddings_batch(doc_texts))

        feat_norm = np.linalg.norm(feature_emb)
        if feat_norm > 0:
            feature_emb = feature_emb / feat_norm

        doc_norms = np.linalg.norm(doc_embs, axis=1, keepdims=True)
        doc_norms[doc_norms == 0] = 1.0
        norm_doc = doc_embs / doc_norms

        similarities = np.dot(norm_doc, feature_emb)

        scored = []
        for i, doc in enumerate(documents):
            doc_copy = doc.copy()
            doc_copy["similarity_score"] = float(similarities[i])
            scored.append(doc_copy)

        scored.sort(key=lambda x: x["similarity_score"], reverse=True)
        return scored[:top_k]
    except Exception as e:
        print(f"[WARN] Document ranking failed ({e}), using lexical fallback")

    # Fallback to BM25 scoring
    bm25_scores = compute_bm25_lexical_scores(feature_text, documents, text_key=text_key)
    scored = []
    for i, doc in enumerate(documents):
        doc_copy = doc.copy()
        doc_copy["similarity_score"] = float(bm25_scores[i]) if i < len(bm25_scores) else 0.4
        scored.append(doc_copy)

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
    doc_texts = [
        f"{doc.get('title', '')} {doc.get(text_key, '') or ''}".strip()
        for doc in documents
    ]
    semantic_sims = None
    if model is not None:
        try:
            feature_emb = model.encode([feature_text], normalize_embeddings=True)[0]
            doc_embs = model.encode(doc_texts, normalize_embeddings=True, batch_size=8)
            semantic_sims = np.dot(doc_embs, feature_emb).tolist()
        except Exception as e:
            print(f"[WARN] RRF semantic encoding failed ({e}), using lexical fallback")

    if semantic_sims is None:
        feat_emb = np.array(_fallback_token_embedding(feature_text))
        doc_embs = np.array([_fallback_token_embedding(t) for t in doc_texts])
        semantic_sims = np.dot(doc_embs, feat_emb).tolist()

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

