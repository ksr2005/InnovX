"""
Pydantic schemas for InnovX API requests and responses.
"""
from __future__ import annotations

import uuid
from datetime import datetime
from enum import Enum
from typing import Optional, Any

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
        min_length=10,
        max_length=10000,
        description="The idea description in natural language. Minimum 10 characters for pre-flight guardrail evaluation.",
        json_schema_extra={
            "example": "An autonomous robot for underground mines that navigates without GPS, "
                       "detects environmental hazards like gas leaks and temperature spikes, "
                       "and transmits only semantically important information to a remote operator."
        },
    )


class GuardrailValidationRequest(BaseModel):
    """Request to validate an idea submission against guardrails and edge cases."""
    raw_text: str = Field(..., description="The user's raw submission text")


class GuardrailValidationResponse(BaseModel):
    """Result of evaluating a submission for brevity, technical domain, and broadness."""
    status: str = Field(..., description="'valid' | 'short_input' | 'non_technical' | 'overly_broad'")
    is_valid: bool = Field(..., description="True if submission can proceed to full analysis")
    headline: str = Field(..., description="Summary headline of the evaluation")
    feedback_message: str = Field(..., description="Constructive guidance message")
    clarifying_questions: list[str] = Field(
        default_factory=list,
        description="Targeted technical questions to narrow down architecture and mechanisms"
    )
    suggested_template: Optional[str] = Field(
        default=None,
        description="Suggested starter template to format patentable features"
    )
    detected_domain: Optional[str] = Field(
        default=None,
        description="Domain detected by classifier"
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


class ApiStatus(str, Enum):
    OK = "ok"
    DEGRADED = "degraded"
    FAILED = "failed"


class ApiQueryAudit(BaseModel):
    """Audit record for a specific query dispatched to an external API."""
    source: str = Field(..., description="API source (e.g. openalex, arxiv, uspto)")
    status: str = Field(default="ok", description="'ok' | 'degraded' | 'failed'")
    query: str = Field(..., description="Exact query string dispatched")
    results_count: int = Field(default=0, description="Number of candidate documents returned")
    error_message: Optional[str] = Field(default=None, description="Diagnostic error if call failed")


class FeatureSearchAudit(BaseModel):
    """Audit record of prior-art search across all sources for one technical feature."""
    feature_id: str
    feature_description: str
    queries_run: list[ApiQueryAudit] = Field(default_factory=list)
    total_candidates_found: int = 0
    total_after_fusion: int = 0


class SearchMethodology(BaseModel):
    """Transparency audit of search queries, source health, and Reciprocal Rank Fusion ranking."""
    apis_queried: list[str] = Field(
        default_factory=lambda: ["OpenAlex (250M+ Academic Works)", "arXiv (Preprints)", "USPTO (US Patents)"]
    )
    api_health: dict[str, str] = Field(
        default_factory=lambda: {"openalex": "ok", "arxiv": "ok", "uspto": "ok"}
    )
    hybrid_fusion: str = Field(
        default="Reciprocal Rank Fusion (RRF, k=60) combining Okapi BM25 and all-MiniLM-L6-v2 embeddings"
    )
    total_documents_scanned: int = 0
    feature_audits: list[FeatureSearchAudit] = Field(default_factory=list)
    timestamp: datetime = Field(default_factory=lambda: datetime.now())


# ─── Feature Matrix ──────────────────────────────────────

class FeatureEvidence(BaseModel):
    """Prior art evidence for a single feature."""
    title: str
    source: SourceType
    similarity: float
    evidence_sentence: Optional[str] = None
    url: Optional[str] = None
    rrf_score: Optional[float] = None
    keyword_score: Optional[float] = None
    rank_rrf: Optional[int] = None
    rank_semantic: Optional[int] = None
    rank_keyword: Optional[int] = None


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
    methodology: Optional[SearchMethodology] = None
    limitations: list[str] = Field(
        default_factory=lambda: [
            "Searched OpenAlex (250M+ works), arXiv, and USPTO patent databases.",
            "Ranked using Reciprocal Rank Fusion (RRF, k=60) combining lexical BM25 and all-MiniLM-L6-v2 semantic embeddings.",
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
    methodology: Optional[SearchMethodology] = None
    guardrail_result: Optional[GuardrailValidationResponse] = None



# ─── Innovations Database Schemas ───────────────────────

class InnovationCreateRequest(BaseModel):
    """Payload to save an analyzed or drafted innovation to Supabase."""
    id: Optional[str] = None
    title: str
    raw_input: str
    structured_data: Optional[dict] = None
    status: Optional[str] = "completed"
    visibility: Optional[str] = "private"
    scores: Optional[dict] = None
    assessment_summary: Optional[str] = None
    report: Optional[dict] = None
    provenance: Optional[dict] = None
    feature_matrix: Optional[dict] = None


class InnovationUpdateRequest(BaseModel):
    """Payload to update an innovation record."""
    title: Optional[str] = None
    visibility: Optional[str] = None
    status: Optional[str] = None


class InnovationItem(BaseModel):
    """Summary item for listing user's innovations in dashboard."""
    id: str
    user_id: Optional[str] = None
    title: str
    raw_input: str
    status: str = "draft"
    visibility: str = "private"
    current_version: int = 1
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    structured_data: Optional[dict] = None
    scores: Optional[dict] = None


class InnovationListResponse(BaseModel):
    """List response for dashboard innovations."""
    total: int
    innovations: list[InnovationItem]


class UserProfileResponse(BaseModel):
    """User profile data."""
    id: str
    email: str
    full_name: Optional[str] = None
    role: str = "creator"


# ─── Provenance Chain Schemas (Day 12) ───────────────────

class ProvenanceVersionItem(BaseModel):
    """Single version record in the provenance audit trail."""
    id: str
    innovation_id: str
    version: int
    document_hash: str
    previous_hash: Optional[str] = None
    snapshot: dict
    created_at: str
    is_link_valid: bool = True


class ProvenanceChainResponse(BaseModel):
    """Complete provenance timeline and chain status."""
    innovation_id: str
    total_versions: int
    is_chain_intact: bool
    genesis_hash: Optional[str] = None
    latest_hash: Optional[str] = None
    records: list[ProvenanceVersionItem]
    verified_at: str


class ChainVerificationResponse(BaseModel):
    """Cryptographic audit result for an innovation hash chain."""
    innovation_id: str
    is_valid: bool
    total_versions: int
    genesis_hash: Optional[str] = None
    latest_hash: Optional[str] = None
    audit_log: list[str]
    verified_at: str


class CreateVersionRequest(BaseModel):
    """Request payload to create a new revision/version of an innovation."""
    raw_input: str
    title: Optional[str] = None
    structured_data: Optional[dict] = None
    scores: Optional[dict] = None
    assessment_summary: Optional[str] = None
    report: Optional[dict] = None


# ─── Vault Files & Notes Schemas (Day 13) ───────────────

class InnovationFileItem(BaseModel):
    """Uploaded asset record in the Innovation Vault."""
    id: str
    innovation_id: str
    file_name: str
    file_path: str
    file_size: Optional[int] = 0
    mime_type: Optional[str] = None
    created_at: Optional[str] = None
    download_url: Optional[str] = None


class InnovationFileListResponse(BaseModel):
    """Response containing list of uploaded files for an innovation."""
    innovation_id: str
    total: int
    files: list[InnovationFileItem]


class DevelopmentNoteItem(BaseModel):
    """Timestamped running development/lab note."""
    id: str
    title: Optional[str] = "Lab Note"
    content: str
    created_at: str
    updated_at: Optional[str] = None


class DevelopmentNoteCreateRequest(BaseModel):
    """Payload to add a new development note."""
    title: Optional[str] = "Lab Note"
    content: str = Field(..., min_length=1, max_length=50000)


class DevelopmentNotesResponse(BaseModel):
    """List response for development notes."""
    innovation_id: str
    total: int
    notes: list[DevelopmentNoteItem]


class ReanalyzeRequest(BaseModel):
    """Payload to re-analyze an updated idea, incrementing version and provenance."""
    raw_text: str = Field(..., min_length=50, max_length=10000)


class ReanalyzeResponse(BaseModel):
    """Response returned upon re-analyzing an idea and chaining provenance."""
    status: str = "success"
    message: str
    version: int
    document_hash: str
    previous_hash: Optional[str] = None
    innovation: dict
    scores: Optional[dict] = None
    report: Optional[dict] = None


# ─── Creator Pathways Schemas (Day 15 / Week 3) ─────────────

class PathwayType(str, Enum):
    PROTECT = "protect"
    SHARE = "share"
    CONNECT = "connect"
    BUILD = "build"


class PathSelectionRequest(BaseModel):
    """Payload to save creator's selected commercialization pathways."""
    paths: list[str] = Field(
        default_factory=list,
        description="List of selected paths: protect, share, connect, build",
    )


class PathSelectionResponse(BaseModel):
    """Response returned upon updating selected commercial pathways."""
    status: str = "success"
    innovation_id: str
    selected_paths: list[str]
    updated_at: str
    message: str


# ─── Protect Path: Patent Readiness Schemas (Day 16 / Week 3) ──

class FeeTier(BaseModel):
    name: str
    amount: str
    qualification: str
    filing_route: str


class JurisdictionFeeInfo(BaseModel):
    office_name: str
    currency: str
    portal_name: str
    portal_url: str
    timeline_months: int = 12
    fees: list[FeeTier]


class ClaimBoundaryItem(BaseModel):
    category: str
    suggested_focus: str
    novel_elements: list[str]
    potential_fallbacks: list[str]
    attorney_notes: str


class PriorArtGapItem(BaseModel):
    feature_id: str
    feature_description: str
    closest_prior_art_reference: str
    key_differentiation: str
    recommended_drafting_emphasis: str


class ChecklistItem(BaseModel):
    item_id: str
    title: str
    required_for: str
    description: str
    completed: bool = False


class PatentPrepPackage(BaseModel):
    title: str
    technical_field: str
    suggested_cpc_classes: list[str]
    background_art: str
    invention_summary: str
    detailed_spec_outline: list[str]
    embodiment_variations: list[str]
    suggested_claim_boundaries: list[ClaimBoundaryItem]
    prior_art_gaps: list[PriorArtGapItem]
    filing_checklist: list[ChecklistItem]
    jurisdictions: dict[str, JurisdictionFeeInfo]
    mandatory_disclaimer: str
    generated_at: str


class PatentPrepResponse(BaseModel):
    status: str = "success"
    innovation_id: str
    package: PatentPrepPackage
    message: str = "Patent readiness & provisional preparation package generated successfully."


# ─── Share Path: Defensive Publication Schemas (Day 17 / Week 3) ──

class SubmissionPortalInfo(BaseModel):
    name: str
    portal_url: str
    cost_info: str
    indexing_speed: str
    description: str


class DefensivePublication(BaseModel):
    title: str
    technical_field: str
    cpc_classes: list[str]
    abstract: str
    background: str
    detailed_description: list[str]
    embodiment_variants: list[str]
    advantages: list[str]
    publication_hash: str
    timestamp: str
    forfeiture_warning: str
    submission_portals: list[SubmissionPortalInfo]


class DefensivePubResponse(BaseModel):
    status: str = "success"
    innovation_id: str
    publication: DefensivePublication
    message: str = "Defensive publication generated successfully."


# ─── Connect Path: Marketplace Schemas (Day 18 / Week 3) ────────

class SanitizedListingDraft(BaseModel):
    """AI-sanitized public summary that conceals confidential proprietary mechanisms."""
    public_title: str
    public_description: str
    domain: Optional[str] = "Technology"
    target_market: list[str] = []
    commercial_value_prop: str
    suggested_stage: str = "concept"
    suggested_availability: list[str] = ["license", "co_development"]
    withheld_confidential_elements: list[str] = []
    sanitization_notice: str


class SanitizeDraftResponse(BaseModel):
    status: str = "success"
    innovation_id: str
    draft: SanitizedListingDraft
    message: str = "AI-sanitized public summary drafted successfully."


class MarketplaceListingCreateRequest(BaseModel):
    innovation_id: str
    public_title: str = Field(..., min_length=3, max_length=200)
    public_description: str = Field(..., min_length=10, max_length=5000)
    domain: Optional[str] = "Technology"
    stage: Optional[str] = "concept"
    available_for: list[str] = ["license", "co_development"]
    preferred_terms: Optional[str] = None
    target_market: Optional[list[str]] = []
    commercial_value_prop: Optional[str] = None
    withheld_confidential_elements: Optional[list[str]] = []


class MarketplaceListingItem(BaseModel):
    id: str
    innovation_id: str
    creator_id: str
    public_title: str
    public_description: str
    domain: Optional[str] = None
    stage: Optional[str] = "concept"
    available_for: list[str] = []
    preferred_terms: Optional[str] = None
    status: str = "active"
    created_at: str
    creator_name: Optional[str] = None
    target_market: Optional[list[str]] = []
    commercial_value_prop: Optional[str] = None
    withheld_confidential_elements: Optional[list[str]] = []


class MarketplaceListingListResponse(BaseModel):
    total: int
    listings: list[MarketplaceListingItem]


class MarketplaceListingUpdateRequest(BaseModel):
    public_title: Optional[str] = None
    public_description: Optional[str] = None
    domain: Optional[str] = None
    stage: Optional[str] = None
    available_for: Optional[list[str]] = None
    preferred_terms: Optional[str] = None
    status: Optional[str] = None  # active | paused | closed


# ─── Connect Path: Mutual NDA & Access Request Schemas (Day 19) ─

class AccessRequestCreateRequest(BaseModel):
    intended_use: Optional[str] = None
    organization: Optional[str] = None


class AccessRequestItem(BaseModel):
    id: str
    listing_id: str
    requestor_id: str
    requestor_name: Optional[str] = "Prospective Partner"
    requestor_email: Optional[str] = None
    listing_title: Optional[str] = None
    domain: Optional[str] = None
    stage: Optional[str] = None
    nda_accepted: bool = True
    nda_accepted_at: Optional[str] = None
    status: str = "pending"  # pending | approved | rejected
    created_at: str


class AccessRequestListResponse(BaseModel):
    total: int
    requests: list[AccessRequestItem]


class AccessRequestReviewRequest(BaseModel):
    action: str = Field(..., description="'approve' or 'reject'")


class ListingAccessStatusResponse(BaseModel):
    has_requested: bool
    status: str  # none | pending | approved | rejected
    nda_accepted: bool
    request_id: Optional[str] = None


class FullInnovationDisclosureResponse(BaseModel):
    status: str = "success"
    listing_id: str
    innovation_id: str
    title: str
    raw_input: str
    structured_data: Optional[dict] = None
    scores: Optional[dict] = None
    assessment_summary: Optional[str] = None
    report: Optional[dict] = None
    disclosed_under_nda: bool = True
    authorized_at: str


# ─── Connect Path: In-Platform Messaging & Dual-Role Schemas (Day 20) ─

class MessageItem(BaseModel):
    id: str
    listing_id: str
    sender_id: str
    receiver_id: str
    sender_name: Optional[str] = None
    receiver_name: Optional[str] = None
    content: str
    created_at: str
    is_from_creator: bool = False


class MessageSendRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=5000)
    receiver_id: Optional[str] = Field(None, description="Target recipient user ID (required when creator is replying to a buyer)")


class MessageThreadItem(BaseModel):
    listing_id: str
    listing_title: str
    partner_id: str
    partner_name: str
    partner_role: str  # 'creator' or 'buyer'
    last_message: str
    last_message_at: str
    message_count: int


class MessageListResponse(BaseModel):
    status: str = "success"
    listing_id: str
    listing_title: str
    partner_id: Optional[str] = None
    partner_name: Optional[str] = None
    messages: list[MessageItem]


class ThreadListResponse(BaseModel):
    status: str = "success"
    total: int
    threads: list[MessageThreadItem]


class CreatorListingSummaryItem(BaseModel):
    id: str
    innovation_id: str
    public_title: str
    domain: Optional[str] = None
    stage: Optional[str] = None
    available_for: list[str] = []
    status: str = "active"
    pending_requests_count: int = 0
    approved_requests_count: int = 0
    messages_count: int = 0
    created_at: str


class CreatorListingListResponse(BaseModel):
    total: int
    listings: list[CreatorListingSummaryItem]


# ─── Build Path: Crowdfunding Campaign Generator (Day 22 / Week 4) ───

class CampaignRewardTier(BaseModel):
    tier_id: str
    title: str
    pledge_amount: int
    currency: str = "USD"
    retail_price: Optional[int] = None
    discount_percentage: Optional[int] = None
    description: str
    estimated_delivery: str
    items_included: list[str]
    backer_limit: Optional[int] = None
    is_featured: bool = False


class CampaignVideoScene(BaseModel):
    scene_number: int
    timestamp_range: str
    visual_description: str
    voiceover_script: str
    on_screen_text: str


class CampaignRoadmapMilestone(BaseModel):
    phase_name: str
    days_range: str
    focus_goal: str
    tactics: list[str]


class CampaignFaqItem(BaseModel):
    question: str
    answer: str


class CrowdfundingCampaign(BaseModel):
    id: Optional[str] = None
    innovation_id: str
    platform: str = "kickstarter"  # kickstarter | indiegogo | crowd_supply | general
    title: str
    tagline: str
    funding_goal: int = 15000
    currency: str = "USD"
    duration_days: int = 30
    origin_story: str
    technical_mechanism_pitch: str
    prototype_stage: str
    fund_allocation_breakdown: list[dict[str, Any]] = []
    reward_tiers: list[CampaignRewardTier] = []
    video_script: list[CampaignVideoScene] = []
    risks_and_challenges: list[str] = []
    campaign_milestones: list[CampaignRoadmapMilestone] = []
    faq_items: list[CampaignFaqItem] = []
    pre_launch_ip_advisory: str
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class CampaignResponse(BaseModel):
    status: str = "success"
    campaign: CrowdfundingCampaign
    message: str


class CampaignUpdateRequest(BaseModel):
    title: Optional[str] = None
    tagline: Optional[str] = None
    funding_goal: Optional[int] = None
    platform: Optional[str] = None
    origin_story: Optional[str] = None
    technical_mechanism_pitch: Optional[str] = None
    prototype_stage: Optional[str] = None
    reward_tiers: Optional[list[CampaignRewardTier]] = None
    video_script: Optional[list[CampaignVideoScene]] = None
    risks_and_challenges: Optional[list[str]] = None
    campaign_milestones: Optional[list[CampaignRoadmapMilestone]] = None
    faq_items: Optional[list[CampaignFaqItem]] = None


# ─── Day 23: Multi-Platform Export & Platform Guides ─────────

class PlatformChecklistItem(BaseModel):
    id: str
    category: str
    task: str
    description: str
    mandatory: bool = True


class PlatformGuide(BaseModel):
    platform_id: str
    platform_name: str
    tagline: str
    recommended_duration: str
    funding_model: str
    fee_structure: str
    key_rules: list[str]
    checklist: list[PlatformChecklistItem]


class PlatformGuidesResponse(BaseModel):
    status: str = "success"
    guides: dict[str, PlatformGuide]


class CampaignExportResponse(BaseModel):
    status: str = "success"
    platform: str
    markdown_content: str
    word_count: int

