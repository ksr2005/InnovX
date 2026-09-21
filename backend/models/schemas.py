"""
Pydantic schemas for InnovX API requests and responses.
"""
from __future__ import annotations

import uuid
from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


# ─── Enums ───────────────────────────────────────────────

class CoverageLevel(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    NONE = "none"


class SourceType(str, Enum):
    OPENALEX = "openalex"
    ARXIV = "arxiv"
    USPTO = "uspto"


class InnovationStatus(str, Enum):
    DRAFT = "draft"
    ANALYZING = "analyzing"
    COMPLETED = "completed"
    ARCHIVED = "archived"


class Visibility(str, Enum):
    PRIVATE = "private"
    MARKETPLACE = "marketplace"
    PUBLISHED = "published"


# ─── Idea Submission ─────────────────────────────────────

class IdeaSubmission(BaseModel):
    """Raw idea text submitted by a user."""
    raw_text: str = Field(
        ...,
        min_length=50,
        max_length=10000,
        description="The idea description in natural language. Minimum 50 characters.",
        json_schema_extra={
            "example": "An autonomous robot for underground mines that navigates without GPS, "
                       "detects environmental hazards like gas leaks and temperature spikes, "
                       "and transmits only semantically important information to a remote operator."
        },
    )


# ─── Structured Feature ─────────────────────────────────

class TechnicalFeature(BaseModel):
    """A single extracted technical feature/component of the idea."""
    id: str = Field(..., description="Feature ID like F1, F2, etc.")
    description: str = Field(..., description="Clear description of this technical feature")
    category: str = Field(..., description="Category: hardware, software, method, system, application")
    search_queries: list[str] = Field(
        default_factory=list,
        description="2-4 search queries optimized for finding prior art on this feature",
    )


class TechnicalComponents(BaseModel):
    """Breakdown of hardware, software, and methods."""
    hardware: list[str] = Field(default_factory=list)
    software: list[str] = Field(default_factory=list)
    methods: list[str] = Field(default_factory=list)


class StructuredIdea(BaseModel):
    """The AI-structured version of a raw idea."""
    title: str = Field(..., description="Concise title for the innovation")
    problem_statement: str = Field(..., description="The problem this innovation solves")
    proposed_solution: str = Field(..., description="How the innovation solves the problem")
    domain: str = Field(..., description="Technical domain (e.g., robotics, healthcare, AI)")
    key_features: list[TechnicalFeature] = Field(
        ...,
        min_length=3,
        max_length=12,
        description="3-12 atomic technical features extracted from the idea",
    )
    target_applications: list[str] = Field(default_factory=list)
    technical_components: TechnicalComponents = Field(default_factory=TechnicalComponents)


# ─── Search Results ──────────────────────────────────────

class SearchResult(BaseModel):
    """A single prior art document found during search."""
    source: SourceType
    title: str
    authors: Optional[str] = None
    publication_date: Optional[str] = None
    abstract: Optional[str] = None
    url: Optional[str] = None
    relevance_feature: str = Field(..., description="Feature ID this result is relevant to")
    similarity_score: float = Field(default=0.0, ge=0.0, le=1.0)
    evidence_sentence: Optional[str] = Field(
        default=None,
        description="The exact sentence from this document that matches the feature. Null if no match.",
    )
    metadata: dict = Field(default_factory=dict)


class SearchResponse(BaseModel):
    """Aggregated search results from all sources."""
    innovation_id: str
    total_results: int
    sources_searched: list[str]
    search_timestamp: datetime
    results: list[SearchResult]


# ─── Feature Matrix ──────────────────────────────────────

class FeatureEvidence(BaseModel):
    """Prior art evidence for a single feature."""
    title: str
    source: SourceType
    similarity: float
    evidence_sentence: Optional[str] = None
    url: Optional[str] = None


class FeatureAnalysis(BaseModel):
    """Complete analysis for one extracted feature."""
    id: str
    description: str
    prior_art: list[FeatureEvidence] = Field(default_factory=list)
    coverage: CoverageLevel = CoverageLevel.NONE
    total_matches: int = 0


class FeatureMatrix(BaseModel):
    """The core output: feature-by-feature prior art analysis."""
    innovation_id: str
    title: str
    domain: str
    features: list[FeatureAnalysis]
    search_sources: list[str]
    search_timestamp: datetime
    limitations: list[str] = Field(
        default_factory=lambda: [
            "Searched OpenAlex (250M+ works), arXiv, and USPTO patent databases.",
            "Does not cover: private/unpublished research, paywalled journal full-texts, "
            "non-English publications, Chinese/Japanese/Korean patent databases, corporate trade secrets.",
            "Results represent an evidence-based assessment, not a legal determination of patentability.",
        ]
    )


# ─── Innovation Record ───────────────────────────────────

class InnovationCreate(BaseModel):
    """Request to create a new innovation record."""
    raw_text: str = Field(..., min_length=50, max_length=10000)


class InnovationRecord(BaseModel):
    """Full innovation record stored in the database."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: Optional[str] = None
    title: str = ""
    raw_input: str
    structured_data: Optional[StructuredIdea] = None
    status: InnovationStatus = InnovationStatus.DRAFT
    visibility: Visibility = Visibility.PRIVATE
    current_version: int = 1
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


# ─── Provenance ──────────────────────────────────────────

class ProvenanceRecord(BaseModel):
    """A single entry in the provenance hash chain."""
    innovation_id: str
    version: int
    document_hash: str = Field(..., description="SHA-256 hash of the innovation state")
    previous_hash: Optional[str] = Field(
        default=None,
        description="Hash of the previous version (null for v1)",
    )
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ─── Assessment Scores ───────────────────────────────────

class ScoreDetail(BaseModel):
    """A single assessment metric with explanation."""
    score: float = Field(..., ge=0, le=100)
    explanation: str
    references: list[str] = Field(default_factory=list)


class AssessmentScores(BaseModel):
    """All 6 innovation assessment metrics."""
    prior_art_density: ScoreDetail
    feature_novelty: ScoreDetail
    combination_distinctiveness: ScoreDetail
    research_freshness: ScoreDetail
    evidence_strength: ScoreDetail
    search_confidence: ScoreDetail


# ─── API Responses ───────────────────────────────────────

class AnalysisResponse(BaseModel):
    """Full response from the /api/analyze endpoint."""
    innovation_id: str
    structured_idea: StructuredIdea
    feature_matrix: FeatureMatrix
    scores: Optional[AssessmentScores] = None
    assessment_summary: Optional[str] = None
    report: Optional[dict] = None
    provenance: ProvenanceRecord

