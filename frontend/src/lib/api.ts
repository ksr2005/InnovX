/**
 * InnovX API Client — Communicates with the FastAPI backend.
 */

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/+$/, "");

export interface TechnicalFeature {
  id: string;
  description: string;
  category: string;
  search_queries: string[];
}

export interface TechnicalComponents {
  hardware: string[];
  software: string[];
  methods: string[];
}

export interface StructuredIdea {
  title: string;
  problem_statement: string;
  proposed_solution: string;
  domain: string;
  key_features: TechnicalFeature[];
  target_applications: string[];
  technical_components: TechnicalComponents;
  architecture_diagram_mermaid?: string | null;
  selected_paths?: PathwayType[];
  development_notes?: Array<{ id: string; title: string; content: string; created_at: string; updated_at?: string | null }>;
}

export interface ApiQueryAudit {
  source: string;
  status: "ok" | "degraded" | "failed";
  query: string;
  results_count: number;
  error_message?: string | null;
}

export interface FeatureSearchAudit {
  feature_id: string;
  feature_description: string;
  queries_run: ApiQueryAudit[];
  total_candidates_found: number;
  total_after_fusion: number;
}

export interface SearchMethodology {
  apis_queried: string[];
  api_health: Record<string, string>;
  hybrid_fusion: string;
  total_documents_scanned: number;
  feature_audits: FeatureSearchAudit[];
  timestamp: string;
}

export interface GuardrailValidationResponse {
  status: "valid" | "short_input" | "non_technical" | "overly_broad" | "security_violation";
  is_valid: boolean;
  headline: string;
  feedback_message: string;
  clarifying_questions: string[];
  suggested_template?: string | null;
  detected_domain?: string | null;
}

export class GuardrailError extends Error {
  public guardrail: GuardrailValidationResponse;
  constructor(guardrail: GuardrailValidationResponse) {
    super(guardrail.feedback_message || guardrail.headline);
    this.name = "GuardrailError";
    this.guardrail = guardrail;
  }
}

export interface FeatureEvidence {
  title: string;
  source: "openalex" | "arxiv" | "uspto";
  similarity: number;
  evidence_sentence: string | null;
  url: string | null;
  rrf_score?: number | null;
  keyword_score?: number | null;
  rank_rrf?: number | null;
  rank_semantic?: number | null;
  rank_keyword?: number | null;
}

export interface FeatureAnalysis {
  id: string;
  description: string;
  prior_art: FeatureEvidence[];
  coverage: "high" | "medium" | "low" | "none";
  total_matches: number;
}

export interface FeatureMatrix {
  innovation_id: string;
  title: string;
  domain: string;
  features: FeatureAnalysis[];
  search_sources: string[];
  search_timestamp: string;
  limitations: string[];
  methodology?: SearchMethodology | null;
}

export interface ProvenanceRecord {
  innovation_id: string;
  version: number;
  document_hash: string;
  previous_hash: string | null;
  created_at: string;
}

export interface ScoreDetail {
  score: number;
  explanation: string;
  references: string[];
}

export interface AssessmentScores {
  prior_art_density: ScoreDetail;
  feature_novelty: ScoreDetail;
  combination_distinctiveness: ScoreDetail;
  research_freshness: ScoreDetail;
  evidence_strength: ScoreDetail;
  search_confidence: ScoreDetail;
}

export interface AnalysisResponse {
  innovation_id: string;
  structured_idea: StructuredIdea;
  feature_matrix: FeatureMatrix;
  scores: AssessmentScores | null;
  assessment_summary: string | null;
  report: Record<string, unknown> | null;
  provenance: ProvenanceRecord;
  methodology?: SearchMethodology | null;
  guardrail_result?: GuardrailValidationResponse | null;
}

/**
 * Submit an idea for full analysis.
 * This is the core endpoint that chains: Structure → Search → Rank → Evidence → Matrix
 */
export async function analyzeIdea(rawText: string): Promise<AnalysisResponse> {
  const response = await fetch(`${API_BASE}/api/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ raw_text: rawText }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: "Analysis failed" }));
    if (response.status === 400 && errorData.detail && typeof errorData.detail === "object" && errorData.detail.status) {
      throw new GuardrailError(errorData.detail as GuardrailValidationResponse);
    }
    const message = typeof errorData.detail === "string" ? errorData.detail : "Analysis failed";
    throw new Error(message || `Analysis failed with status ${response.status}`);
  }

  return response.json();
}

/**
 * Pre-flight guardrail check for idea submissions.
 */
export async function validateIdeaSubmission(rawText: string): Promise<GuardrailValidationResponse> {
  const response = await fetch(`${API_BASE}/api/analyze/validate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ raw_text: rawText }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Validation check failed" }));
    throw new Error(error.detail || `Validation failed with status ${response.status}`);
  }

  return response.json();
}


/**
 * Structure an idea without running the full search pipeline.
 */
export async function structureIdea(rawText: string): Promise<StructuredIdea> {
  const response = await fetch(`${API_BASE}/api/analyze/structure`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ raw_text: rawText }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Structuring failed" }));
    throw new Error(error.detail || `Structuring failed with status ${response.status}`);
  }

  return response.json();
}

export interface MatchedGrant {
  id: string;
  agency: string;
  program: string;
  topic_name: string;
  award_amount: string;
  phase2_potential: string;
  equity_taken: string;
  deadline: string;
  fit_score: number;
  why_fit: string;
  application_portal: string;
  eligibility: string;
}

export interface MatchedVC {
  firm: string;
  stage: string;
  thesis: string;
  portfolio_examples: string[];
  fit_score: number;
  website: string;
}

export interface GrantMatchingResponse {
  matched_grants: MatchedGrant[];
  matched_vcs: MatchedVC[];
  tailored_grant_abstract: string;
  total_non_dilutive_potential: string;
  recommended_first_step: string;
}

export async function matchInnovationGrants(payload: {
  title: string;
  domain: string;
  problem_statement: string;
  proposed_solution: string;
  key_features?: unknown[];
}): Promise<GrantMatchingResponse> {
  const response = await fetch(`${API_BASE}/api/analyze/grants`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Grant matching failed" }));
    throw new Error(error.detail || `Grant matching failed with status ${response.status}`);
  }

  return response.json();
}

export interface OverlappingFeature {
  feature_id: string;
  feature_description: string;
  similarity_score: number;
  risk_level: string;
  analysis: string;
}

export interface DifferentiatingFeature {
  feature_id: string;
  feature_description: string;
  similarity_score: number;
  novelty_signal: string;
  analysis: string;
}

export interface PatentCompareResponse {
  creator_title: string;
  competitor_title: string;
  overall_overlap_percentage: number;
  risk_rating: string;
  risk_color: string;
  risk_summary: string;
  overlapping_features: OverlappingFeature[];
  differentiating_features: DifferentiatingFeature[];
  design_around_recommendations: string[];
  freedom_to_operate_index: number;
}

export async function compareCompetitorPatent(payload: {
  creator_title: string;
  creator_features: unknown[];
  competitor_title: string;
  competitor_claims_or_text: string;
}): Promise<PatentCompareResponse> {
  const response = await fetch(`${API_BASE}/api/search/compare`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Patent comparison failed" }));
    throw new Error(error.detail || `Patent comparison failed with status ${response.status}`);
  }

  return response.json();
}

/**
 * Check if the backend is running.
 */
export async function healthCheck(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/health`);
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Download the full innovation report as a PDF file.
 * Triggers a browser download dialog.
 */
export async function downloadReportPdf(innovationId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/api/report/${innovationId}/pdf`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "PDF download failed" }));
    throw new Error(error.detail || `PDF download failed with status ${response.status}`);
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `InnovX_Report_${innovationId}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

/**
 * Get the full report JSON for an innovation.
 */
export async function getReport(innovationId: string): Promise<Record<string, unknown>> {
  const response = await fetch(`${API_BASE}/api/report/${innovationId}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Report fetch failed" }));
    throw new Error(error.detail || `Report fetch failed with status ${response.status}`);
  }

  return response.json();
}

// ─── User Portfolio & Innovations Endpoints ────────────────

export interface InnovationListItem {
  id: string;
  user_id?: string;
  title: string;
  raw_input: string;
  status: string;
  visibility: string;
  current_version: number;
  created_at?: string;
  updated_at?: string;
  structured_data?: StructuredIdea;
  scores?: {
    prior_art_density?: number;
    feature_novelty?: number;
    combination_distinctiveness?: number;
    research_freshness?: number;
    evidence_strength?: number;
    search_confidence?: number;
    summary_text?: string;
  };
}

export interface InnovationListResponse {
  total: number;
  innovations: InnovationListItem[];
}

export interface CreatorStats {
  total_innovations: number;
  average_novelty: number;
  private_count: number;
  active_analyses: number;
}

export interface SaveInnovationPayload {
  id?: string;
  title: string;
  raw_input: string;
  structured_data?: StructuredIdea;
  status?: string;
  visibility?: string;
  scores?: AssessmentScores | Record<string, unknown>;
  assessment_summary?: string;
  report?: Record<string, unknown>;
  provenance?: ProvenanceRecord;
  feature_matrix?: FeatureMatrix;
}

/**
 * Fetch all innovations for the authenticated user.
 */
export async function getUserInnovations(token: string): Promise<InnovationListResponse> {
  const response = await fetch(`${API_BASE}/api/innovations`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Failed to fetch innovations" }));
    throw new Error(error.detail || `Failed to fetch innovations with status ${response.status}`);
  }

  return response.json();
}

/**
 * Fetch creator summary stats for dashboard header.
 */
export async function getCreatorStats(token: string): Promise<CreatorStats> {
  const response = await fetch(`${API_BASE}/api/innovations/stats/summary`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    return {
      total_innovations: 0,
      average_novelty: 0,
      private_count: 0,
      active_analyses: 0,
    };
  }

  return response.json();
}

/**
 * Save an innovation to the user's private vault in Supabase.
 */
export async function saveInnovation(payload: SaveInnovationPayload, token: string): Promise<{ status: string; innovation_id: string; message: string }> {
  const response = await fetch(`${API_BASE}/api/innovations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Failed to save innovation" }));
    throw new Error(error.detail || `Save failed with status ${response.status}`);
  }

  return response.json();
}

/**
 * Get detailed innovation record from the database.
 */
export async function getInnovationDetail(id: string, token: string): Promise<{
  innovation: Record<string, unknown>;
  assessment?: Record<string, unknown>;
  provenance_records?: unknown[];
  report?: Record<string, unknown>;
}> {
  const response = await fetch(`${API_BASE}/api/innovations/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Failed to fetch innovation" }));
    throw new Error(error.detail || `Fetch failed with status ${response.status}`);
  }

  return response.json();
}

/**
 * Delete an innovation record and all linked assessments/provenance.
 */
export async function deleteInnovation(id: string, token: string): Promise<void> {
  const response = await fetch(`${API_BASE}/api/innovations/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Failed to delete innovation" }));
    throw new Error(error.detail || `Delete failed with status ${response.status}`);
  }
}

// ─── Provenance Chain & Audit Endpoints (Day 12) ──────────

export interface ProvenanceVersionItem {
  id: string;
  innovation_id: string;
  version: number;
  document_hash: string;
  previous_hash: string | null;
  snapshot: Record<string, unknown>;
  created_at: string;
  is_link_valid: boolean;
}

export interface ProvenanceChainResponse {
  innovation_id: string;
  total_versions: number;
  is_chain_intact: boolean;
  genesis_hash: string | null;
  latest_hash: string | null;
  records: ProvenanceVersionItem[];
  verified_at: string;
}

export interface ChainVerificationResponse {
  innovation_id: string;
  is_valid: boolean;
  total_versions: number;
  genesis_hash: string | null;
  latest_hash: string | null;
  audit_log: string[];
  verified_at: string;
}

export interface CreateVersionPayload {
  raw_input: string;
  title?: string;
  structured_data?: StructuredIdea;
  scores?: AssessmentScores | Record<string, unknown>;
  assessment_summary?: string;
  report?: Record<string, unknown>;
}

/**
 * Fetch complete provenance history and chain status.
 */
export async function getInnovationProvenance(
  innovationId: string,
  token: string
): Promise<ProvenanceChainResponse> {
  const response = await fetch(`${API_BASE}/api/innovations/${innovationId}/provenance`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Failed to fetch provenance" }));
    throw new Error(error.detail || `Failed to fetch provenance with status ${response.status}`);
  }

  return response.json();
}

/**
 * Trigger an active cryptographic audit of the SHA-256 hash chain.
 */
export async function verifyInnovationChain(
  innovationId: string,
  token: string
): Promise<ChainVerificationResponse> {
  const response = await fetch(`${API_BASE}/api/innovations/${innovationId}/verify-chain`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Verification failed" }));
    throw new Error(error.detail || `Verification failed with status ${response.status}`);
  }

  return response.json();
}

/**
 * Create a new version revision in the provenance chain.
 */
export async function createInnovationVersion(
  innovationId: string,
  payload: CreateVersionPayload,
  token: string
): Promise<{
  status: string;
  message: string;
  version: number;
  document_hash: string;
  previous_hash: string | null;
}> {
  const response = await fetch(`${API_BASE}/api/innovations/${innovationId}/version`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Failed to create version" }));
    throw new Error(error.detail || `Create version failed with status ${response.status}`);
  }

  return response.json();
}

// ─── Vault Files Management (Day 13) ───────────────────────

export interface InnovationFileItem {
  id: string;
  innovation_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string | null;
  created_at?: string;
  download_url?: string | null;
}

export interface InnovationFileListResponse {
  innovation_id: string;
  total: number;
  files: InnovationFileItem[];
}

/**
 * Upload an attachment, diagram, or research file (up to 10MB) to the Innovation Vault.
 */
export async function uploadVaultFile(
  innovationId: string,
  file: File,
  token: string
): Promise<InnovationFileItem> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE}/api/innovations/${innovationId}/files`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Upload failed" }));
    throw new Error(error.detail || `Upload failed with status ${response.status}`);
  }

  return response.json();
}

/**
 * Fetch all uploaded files for an innovation with active signed download URLs.
 */
export async function getVaultFiles(
  innovationId: string,
  token: string
): Promise<InnovationFileListResponse> {
  const response = await fetch(`${API_BASE}/api/innovations/${innovationId}/files`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Failed to fetch files" }));
    throw new Error(error.detail || `Failed to fetch files with status ${response.status}`);
  }

  return response.json();
}

/**
 * Delete a file from the vault and Supabase Storage.
 */
export async function deleteVaultFile(
  innovationId: string,
  fileId: string,
  token: string
): Promise<void> {
  const response = await fetch(`${API_BASE}/api/innovations/${innovationId}/files/${fileId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Failed to delete file" }));
    throw new Error(error.detail || `Delete failed with status ${response.status}`);
  }
}

// ─── Freeform Development Notes (Day 13) ───────────────────

export interface DevelopmentNoteItem {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at?: string | null;
}

export interface DevelopmentNotesResponse {
  innovation_id: string;
  total: number;
  notes: DevelopmentNoteItem[];
}

/**
 * Fetch running development/lab notes for an innovation.
 */
export async function getDevelopmentNotes(
  innovationId: string,
  token: string
): Promise<DevelopmentNotesResponse> {
  const response = await fetch(`${API_BASE}/api/innovations/${innovationId}/notes`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Failed to fetch notes" }));
    throw new Error(error.detail || `Failed to fetch notes with status ${response.status}`);
  }

  return response.json();
}

/**
 * Add a new timestamped running development note to an innovation.
 */
export async function addDevelopmentNote(
  innovationId: string,
  note: { title?: string; content: string },
  token: string
): Promise<DevelopmentNoteItem> {
  const response = await fetch(`${API_BASE}/api/innovations/${innovationId}/notes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(note),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Failed to add note" }));
    throw new Error(error.detail || `Add note failed with status ${response.status}`);
  }

  return response.json();
}

/**
 * Delete a development note.
 */
export async function deleteDevelopmentNote(
  innovationId: string,
  noteId: string,
  token: string
): Promise<void> {
  const response = await fetch(`${API_BASE}/api/innovations/${innovationId}/notes/${noteId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Failed to delete note" }));
    throw new Error(error.detail || `Delete note failed with status ${response.status}`);
  }
}

// ─── Idea Re-Analysis (Day 13) ──────────────────────────────

export interface ReanalyzeResponse {
  status: string;
  message: string;
  version: number;
  document_hash: string;
  previous_hash: string | null;
  innovation: InnovationListItem;
  scores?: Record<string, unknown>;
  report?: Record<string, unknown>;
}

/**
 * Re-run full discovery pipeline on modified idea text, advancing version and chaining provenance.
 */
export async function reanalyzeInnovation(
  innovationId: string,
  rawText: string,
  token: string
): Promise<ReanalyzeResponse> {
  const response = await fetch(`${API_BASE}/api/innovations/${innovationId}/reanalyze`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ raw_text: rawText }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Re-analysis failed" }));
    throw new Error(error.detail || `Re-analysis failed with status ${response.status}`);
  }

  return response.json();
}

// ─── Creator Commercialization Pathways (Day 15 / Week 3) ────

export type PathwayType = "protect" | "share" | "connect" | "build";

export interface PathSelectionResponse {
  status: string;
  innovation_id: string;
  selected_paths: PathwayType[];
  updated_at: string;
  message: string;
}

/**
 * Fetch selected commercialization pathways for an innovation.
 */
export async function getInnovationPaths(
  innovationId: string,
  token: string
): Promise<PathSelectionResponse> {
  const getCached = (): PathwayType[] => {
    if (typeof window !== "undefined") {
      try {
        const item = localStorage.getItem(`innovx_paths_${innovationId}`);
        if (item) return JSON.parse(item);
      } catch {}
    }
    return [];
  };

  if (!innovationId || innovationId.startsWith("demo-")) {
    return {
      status: "success",
      innovation_id: innovationId,
      selected_paths: getCached(),
      updated_at: new Date().toISOString(),
      message: "Paths retrieved from local session",
    };
  }

  try {
    const response = await fetch(`${API_BASE}/api/innovations/${innovationId}/paths`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return {
        status: "fallback",
        innovation_id: innovationId,
        selected_paths: getCached(),
        updated_at: new Date().toISOString(),
        message: "Paths retrieved from offline cache",
      };
    }

    const data = await response.json();
    if (typeof window !== "undefined" && data?.selected_paths) {
      try {
        localStorage.setItem(`innovx_paths_${innovationId}`, JSON.stringify(data.selected_paths));
      } catch {}
    }
    return data;
  } catch {
    return {
      status: "fallback",
      innovation_id: innovationId,
      selected_paths: getCached(),
      updated_at: new Date().toISOString(),
      message: "Paths retrieved from offline cache",
    };
  }
}

/**
 * Save selected commercialization pathways for an innovation (multi-path enabled).
 */
export async function saveInnovationPaths(
  innovationId: string,
  paths: PathwayType[],
  token: string
): Promise<PathSelectionResponse> {
  // Always update local cache for instant client consistency
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(`innovx_paths_${innovationId}`, JSON.stringify(paths));
    } catch {}
  }

  // Handle demo or local-only innovation IDs
  if (!innovationId || innovationId.startsWith("demo-")) {
    return {
      status: "success",
      innovation_id: innovationId,
      selected_paths: paths,
      updated_at: new Date().toISOString(),
      message: "Paths saved to local session",
    };
  }

  try {
    const response = await fetch(`${API_BASE}/api/innovations/${innovationId}/paths`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ paths }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Failed to save pathways" }));
      console.warn("Server path save status:", error.detail || response.status);
      return {
        status: "cached",
        innovation_id: innovationId,
        selected_paths: paths,
        updated_at: new Date().toISOString(),
        message: `Saved to local session (server status ${response.status})`,
      };
    }

    return await response.json();
  } catch (err) {
    // Offline or network error: do not throw to crash UI, return graceful cached success
    console.warn("Could not reach backend for saveInnovationPaths; saved to local session:", err);
    return {
      status: "cached",
      innovation_id: innovationId,
      selected_paths: paths,
      updated_at: new Date().toISOString(),
      message: "Saved to local session (backend offline)",
    };
  }
}

// ─── Protect Path: Patent Readiness Package (Day 16 / Week 3) ──

export interface FeeTier {
  name: string;
  amount: string;
  qualification: string;
  filing_route: string;
}

export interface JurisdictionFeeInfo {
  office_name: string;
  currency: string;
  portal_name: string;
  portal_url: string;
  timeline_months: number;
  fees: FeeTier[];
}

export interface ClaimBoundaryItem {
  category: string;
  suggested_focus: string;
  novel_elements: string[];
  potential_fallbacks: string[];
  attorney_notes: string;
}

export interface PriorArtGapItem {
  feature_id: string;
  feature_description: string;
  closest_prior_art_reference: string;
  key_differentiation: string;
  recommended_drafting_emphasis: string;
}

export interface ChecklistItem {
  item_id: string;
  title: string;
  required_for: string;
  description: string;
  completed?: boolean;
}

export interface PatentPrepPackage {
  title: string;
  technical_field: string;
  suggested_cpc_classes: string[];
  background_art: string;
  invention_summary: string;
  detailed_spec_outline: string[];
  embodiment_variations: string[];
  suggested_claim_boundaries: ClaimBoundaryItem[];
  prior_art_gaps: PriorArtGapItem[];
  filing_checklist: ChecklistItem[];
  jurisdictions: Record<string, JurisdictionFeeInfo>;
  mandatory_disclaimer: string;
  generated_at: string;
}

export interface PatentPrepResponse {
  status: string;
  innovation_id: string;
  package: PatentPrepPackage;
  message: string;
}

/**
 * Fetch existing Patent Readiness Package for an innovation.
 */
export async function getPatentPrepPackage(
  innovationId: string,
  token: string
): Promise<PatentPrepResponse> {
  const response = await fetch(`${API_BASE}/api/innovations/${innovationId}/protect`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Failed to fetch patent package" }));
    throw new Error(error.detail || `Failed to fetch patent package with status ${response.status}`);
  }

  return response.json();
}

/**
 * Generate (or regenerate) Patent Readiness Package for an innovation.
 */
export async function generatePatentPrepPackage(
  innovationId: string,
  token: string
): Promise<PatentPrepResponse> {
  const response = await fetch(`${API_BASE}/api/innovations/${innovationId}/protect`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Failed to generate patent package" }));
    throw new Error(error.detail || `Generate patent package failed with status ${response.status}`);
  }

  return response.json();
}

/**
 * Download the branded multi-page Provisional Patent Preparation Package PDF.
 */
export async function downloadPatentPrepPdf(
  innovationId: string,
  token: string
): Promise<void> {
  const response = await fetch(`${API_BASE}/api/innovations/${innovationId}/protect/pdf`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "PDF generation failed" }));
    throw new Error(error.detail || `Download failed with status ${response.status}`);
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `innovx_patent_prep_${innovationId.slice(0, 8)}.pdf`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

// ─── Share Path: Defensive Publication Engine (Day 17 / Week 3) ──

export interface SubmissionPortalInfo {
  name: string;
  portal_url: string;
  cost_info: string;
  indexing_speed: string;
  description: string;
}

export interface DefensivePublication {
  title: string;
  technical_field: string;
  cpc_classes: string[];
  abstract: string;
  background: string;
  detailed_description: string[];
  embodiment_variants: string[];
  advantages: string[];
  publication_hash: string;
  timestamp: string;
  forfeiture_warning: string;
  submission_portals: SubmissionPortalInfo[];
}

export interface DefensivePubResponse {
  status: string;
  innovation_id: string;
  publication: DefensivePublication;
  message: string;
}

/**
 * Fetch existing Defensive Publication for an innovation.
 */
export async function getDefensivePublication(
  innovationId: string,
  token: string
): Promise<DefensivePubResponse> {
  const response = await fetch(`${API_BASE}/api/innovations/${innovationId}/publish`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Failed to fetch publication" }));
    throw new Error(error.detail || `Failed to fetch publication with status ${response.status}`);
  }

  return response.json();
}

/**
 * Generate (or regenerate) Defensive Publication for an innovation.
 */
export async function generateDefensivePublication(
  innovationId: string,
  token: string
): Promise<DefensivePubResponse> {
  const response = await fetch(`${API_BASE}/api/innovations/${innovationId}/publish`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Failed to generate publication" }));
    throw new Error(error.detail || `Generate publication failed with status ${response.status}`);
  }

  return response.json();
}

/**
 * Download the branded multi-page Defensive Publication Bulletin PDF.
 */
export async function downloadDefensivePubPdf(
  innovationId: string,
  token: string
): Promise<void> {
  const response = await fetch(`${API_BASE}/api/innovations/${innovationId}/publish/pdf`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "PDF generation failed" }));
    throw new Error(error.detail || `Download failed with status ${response.status}`);
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `innovx_defensive_disclosure_${innovationId.slice(0, 8)}.pdf`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

/**
 * Download the defensive publication as standard Markdown (.md) text.
 */
export async function downloadDefensivePubText(
  innovationId: string,
  token: string
): Promise<void> {
  const response = await fetch(`${API_BASE}/api/innovations/${innovationId}/publish/text`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Text download failed" }));
    throw new Error(error.detail || `Download failed with status ${response.status}`);
  }

  const text = await response.text();
  const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `defensive_disclosure_${innovationId.slice(0, 8)}.md`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

// ─── Connect Path: Marketplace Types & Functions (Day 18 / Week 3) ──

export interface SanitizedListingDraft {
  public_title: string;
  public_description: string;
  domain?: string;
  target_market: string[];
  commercial_value_prop: string;
  suggested_stage: string;
  suggested_availability: string[];
  withheld_confidential_elements: string[];
  sanitization_notice: string;
}

export interface SanitizeDraftResponse {
  status: string;
  innovation_id: string;
  draft: SanitizedListingDraft;
  message: string;
}

export interface MarketplaceListingCreateRequest {
  innovation_id: string;
  public_title: string;
  public_description: string;
  domain?: string;
  stage?: string;
  available_for: string[];
  preferred_terms?: string;
  target_market?: string[];
  commercial_value_prop?: string;
  withheld_confidential_elements?: string[];
}

export interface MarketplaceListingItem {
  id: string;
  innovation_id: string;
  creator_id: string;
  public_title: string;
  public_description: string;
  domain?: string | null;
  stage?: string | null;
  available_for: string[];
  preferred_terms?: string | null;
  status: "active" | "paused" | "closed";
  created_at: string;
  creator_name?: string | null;
  target_market?: string[];
  commercial_value_prop?: string;
  withheld_confidential_elements?: string[];
}

export interface MarketplaceListingListResponse {
  total: number;
  listings: MarketplaceListingItem[];
}

export interface MarketplaceListingUpdateRequest {
  public_title?: string;
  public_description?: string;
  domain?: string;
  stage?: string;
  available_for?: string[];
  preferred_terms?: string;
  status?: "active" | "paused" | "closed";
}

/**
 * Generate an AI-sanitized non-confidential public summary draft.
 */
export async function getSanitizedDraft(
  innovationId: string,
  token: string
): Promise<SanitizeDraftResponse> {
  const response = await fetch(`${API_BASE}/api/marketplace/sanitize/${innovationId}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Sanitization failed" }));
    throw new Error(error.detail || `Sanitization failed with status ${response.status}`);
  }

  return response.json();
}

/**
 * Publish or update a sanitized marketplace listing.
 */
export async function createMarketplaceListing(
  payload: MarketplaceListingCreateRequest,
  token: string
): Promise<MarketplaceListingItem> {
  const response = await fetch(`${API_BASE}/api/marketplace/listings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Failed to publish listing" }));
    throw new Error(error.detail || `Publish listing failed with status ${response.status}`);
  }

  return response.json();
}

/**
 * Fetch public catalog of active marketplace listings.
 */
export async function getPublicMarketplaceListings(filters?: {
  domain?: string;
  stage?: string;
  available_for?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<MarketplaceListingListResponse> {
  const params = new URLSearchParams();
  if (filters?.domain) params.set("domain", filters.domain);
  if (filters?.stage) params.set("stage", filters.stage);
  if (filters?.available_for) params.set("available_for", filters.available_for);
  if (filters?.search) params.set("search", filters.search);
  if (filters?.limit) params.set("limit", filters.limit.toString());
  if (filters?.offset) params.set("offset", filters.offset.toString());

  const response = await fetch(`${API_BASE}/api/marketplace/listings?${params.toString()}`);
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Failed to fetch listings" }));
    throw new Error(error.detail || `Failed to fetch listings with status ${response.status}`);
  }

  return response.json();
}

/**
 * Fetch all marketplace listings created by current creator.
 */
export async function getMyMarketplaceListings(
  token: string
): Promise<MarketplaceListingListResponse> {
  const response = await fetch(`${API_BASE}/api/marketplace/listings/my`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Failed to fetch your listings" }));
    throw new Error(error.detail || `Failed to fetch listings with status ${response.status}`);
  }

  return response.json();
}

/**
 * Fetch a single listing by ID.
 */
export async function getMarketplaceListingById(
  listingId: string
): Promise<MarketplaceListingItem> {
  const response = await fetch(`${API_BASE}/api/marketplace/listings/${listingId}`);
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Listing not found" }));
    throw new Error(error.detail || `Failed to fetch listing with status ${response.status}`);
  }
  return response.json();
}

/**
 * Update an existing marketplace listing.
 */
export async function updateMarketplaceListing(
  listingId: string,
  payload: MarketplaceListingUpdateRequest,
  token: string
): Promise<MarketplaceListingItem> {
  const response = await fetch(`${API_BASE}/api/marketplace/listings/${listingId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Failed to update listing" }));
    throw new Error(error.detail || `Update failed with status ${response.status}`);
  }

  return response.json();
}

/**
 * Delete a marketplace listing.
 */
export async function deleteMarketplaceListing(
  listingId: string,
  token: string
): Promise<{ status: string; message: string }> {
  const response = await fetch(`${API_BASE}/api/marketplace/listings/${listingId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Failed to delete listing" }));
    throw new Error(error.detail || `Delete failed with status ${response.status}`);
  }

  return response.json();
}

// ─── Connect Path: Mutual NDA & Access Request Client (Day 19) ─

export interface AccessRequestCreateRequest {
  intended_use?: string;
  organization?: string;
}

export interface AccessRequestItem {
  id: string;
  listing_id: string;
  requestor_id: string;
  requestor_name?: string | null;
  requestor_email?: string | null;
  listing_title?: string | null;
  domain?: string | null;
  stage?: string | null;
  nda_accepted: boolean;
  nda_accepted_at?: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

export interface AccessRequestListResponse {
  total: number;
  requests: AccessRequestItem[];
}

export interface ListingAccessStatusResponse {
  has_requested: boolean;
  status: "none" | "pending" | "approved" | "rejected";
  nda_accepted: boolean;
  request_id?: string | null;
}

export interface FullInnovationDisclosureResponse {
  status: string;
  listing_id: string;
  innovation_id: string;
  title: string;
  raw_input: string;
  structured_data?: any;
  scores?: any;
  assessment_summary?: string | null;
  report?: any;
  disclosed_under_nda: boolean;
  authorized_at: string;
}

/**
 * Digitally sign Mutual NDA and request access to confidential technical claims.
 */
export async function requestListingAccess(
  listingId: string,
  token: string,
  payload?: AccessRequestCreateRequest
): Promise<AccessRequestItem> {
  const response = await fetch(`${API_BASE}/api/marketplace/listings/${listingId}/request-access`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload || {}),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Access request failed" }));
    throw new Error(error.detail || `Request failed with status ${response.status}`);
  }

  return response.json();
}

/**
 * Check whether the logged-in user has access or pending request for a listing.
 */
export async function getListingAccessStatus(
  listingId: string,
  token: string
): Promise<ListingAccessStatusResponse> {
  const response = await fetch(`${API_BASE}/api/marketplace/listings/${listingId}/access-status`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Failed to check access status" }));
    throw new Error(error.detail || `Status check failed with status ${response.status}`);
  }

  return response.json();
}

/**
 * Fetch inbound access requests across all listings owned by current creator.
 */
export async function getIncomingAccessRequests(
  token: string
): Promise<AccessRequestListResponse> {
  const response = await fetch(`${API_BASE}/api/marketplace/access-requests/incoming`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Failed to fetch incoming requests" }));
    throw new Error(error.detail || `Failed to fetch requests with status ${response.status}`);
  }

  return response.json();
}

/**
 * Fetch all access requests made by current user.
 */
export async function getMyAccessRequests(
  token: string
): Promise<AccessRequestListResponse> {
  const response = await fetch(`${API_BASE}/api/marketplace/access-requests/my`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Failed to fetch your requests" }));
    throw new Error(error.detail || `Failed to fetch requests with status ${response.status}`);
  }

  return response.json();
}

/**
 * Creator approves or rejects a buyer's NDA access request.
 */
export async function reviewAccessRequest(
  requestId: string,
  action: "approve" | "reject",
  token: string
): Promise<AccessRequestItem> {
  const response = await fetch(`${API_BASE}/api/marketplace/access-requests/${requestId}/review`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ action }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Review action failed" }));
    throw new Error(error.detail || `Review action failed with status ${response.status}`);
  }

  return response.json();
}

/**
 * Access the full uncensored disclosure and report under approved Mutual NDA.
 */
export async function getConfidentialFullDisclosure(
  listingId: string,
  token: string
): Promise<FullInnovationDisclosureResponse> {
  const response = await fetch(`${API_BASE}/api/marketplace/listings/${listingId}/full-report`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Access to confidential report denied" }));
    throw new Error(error.detail || `Access denied with status ${response.status}`);
  }

  return response.json();
}

// ─── Day 20: In-Platform Confidential Messaging & Management Types ────────

export interface MessageItem {
  id: string;
  listing_id: string;
  sender_id: string;
  receiver_id: string;
  sender_name?: string;
  receiver_name?: string;
  content: string;
  created_at: string;
  is_from_creator: boolean;
}

export interface MessageThreadItem {
  listing_id: string;
  listing_title: string;
  partner_id: string;
  partner_name: string;
  partner_role: "creator" | "buyer";
  last_message: string;
  last_message_at: string;
  message_count: number;
}

export interface MessageListResponse {
  status: string;
  listing_id: string;
  listing_title: string;
  partner_id?: string;
  partner_name?: string;
  messages: MessageItem[];
}

export interface ThreadListResponse {
  status: string;
  total: number;
  threads: MessageThreadItem[];
}

export interface CreatorListingSummaryItem {
  id: string;
  innovation_id: string;
  public_title: string;
  domain?: string;
  stage?: string;
  available_for: string[];
  status: string;
  pending_requests_count: number;
  approved_requests_count: number;
  messages_count: number;
  created_at: string;
}

export interface CreatorListingListResponse {
  total: number;
  listings: CreatorListingSummaryItem[];
}

/**
 * Send an in-platform confidential message regarding a marketplace listing.
 */
export async function sendListingMessage(
  listingId: string,
  content: string,
  token: string,
  receiverId?: string
): Promise<MessageItem> {
  const response = await fetch(`${API_BASE}/api/marketplace/listings/${listingId}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      content,
      receiver_id: receiverId,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Failed to send message" }));
    throw new Error(error.detail || `Message delivery failed with status ${response.status}`);
  }

  return response.json();
}

/**
 * Fetch thread messages for a listing between creator and a specific buyer.
 */
export async function getListingMessages(
  listingId: string,
  token: string,
  buyerId?: string
): Promise<MessageListResponse> {
  const url = new URL(`${API_BASE}/api/marketplace/listings/${listingId}/messages`);
  if (buyerId) {
    url.searchParams.set("buyer_id", buyerId);
  }

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Failed to load messages" }));
    throw new Error(error.detail || `Failed to load messages with status ${response.status}`);
  }

  return response.json();
}

/**
 * Fetch all active messaging threads for the logged-in user.
 */
export async function getUserMessageThreads(
  token: string
): Promise<ThreadListResponse> {
  const response = await fetch(`${API_BASE}/api/marketplace/messages/threads`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Failed to load message threads" }));
    throw new Error(error.detail || `Failed to load threads with status ${response.status}`);
  }

  return response.json();
}

/**
 * Fetch creator's marketplace listings with request counts and message stats.
 */
export async function getCreatorListingsSummary(
  token: string
): Promise<CreatorListingListResponse> {
  const response = await fetch(`${API_BASE}/api/marketplace/my-listings-summary`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Failed to load listings summary" }));
    throw new Error(error.detail || `Failed to load summary with status ${response.status}`);
  }

  return response.json();
}

/**
 * Fetch innovations unlocked by the user under executed Mutual NDAs.
 */
export async function getBuyerUnlockedListings(
  token: string
): Promise<MarketplaceListingListResponse> {
  const response = await fetch(`${API_BASE}/api/marketplace/my-unlocked-listings`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Failed to load unlocked listings" }));
    throw new Error(error.detail || `Failed with status ${response.status}`);
  }

  return response.json();
}

// ─── Build Path: Crowdfunding Campaign Generator (Day 22 / Week 4) ───

export interface CampaignRewardTier {
  tier_id: string;
  title: string;
  pledge_amount: number;
  currency: string;
  retail_price?: number;
  discount_percentage?: number;
  description: string;
  estimated_delivery: string;
  items_included: string[];
  backer_limit?: number;
  is_featured: boolean;
}

export interface CampaignVideoScene {
  scene_number: number;
  timestamp_range: string;
  visual_description: string;
  voiceover_script: string;
  on_screen_text: string;
}

export interface CampaignRoadmapMilestone {
  phase_name: string;
  days_range: string;
  focus_goal: string;
  tactics: string[];
}

export interface CampaignFaqItem {
  question: string;
  answer: string;
}

export interface CrowdfundingCampaign {
  id?: string;
  innovation_id: string;
  platform: string;
  title: string;
  tagline: string;
  funding_goal: number;
  currency: string;
  duration_days: number;
  origin_story: string;
  technical_mechanism_pitch: string;
  prototype_stage: string;
  fund_allocation_breakdown: { category: string; percentage: number }[];
  reward_tiers: CampaignRewardTier[];
  video_script: CampaignVideoScene[];
  risks_and_challenges: string[];
  campaign_milestones: CampaignRoadmapMilestone[];
  faq_items: CampaignFaqItem[];
  pre_launch_ip_advisory: string;
  created_at?: string;
  updated_at?: string;
}

export interface CampaignResponse {
  status: string;
  campaign: CrowdfundingCampaign;
  message: string;
}

export interface CampaignExportResponse {
  status: string;
  platform: string;
  markdown_content: string;
  word_count: number;
}

/**
 * Retrieve existing campaign draft or generate on-demand.
 */
export async function getCrowdfundingCampaign(
  innovationId: string,
  token: string,
  platform: string = "kickstarter"
): Promise<CampaignResponse> {
  const response = await fetch(`${API_BASE}/api/campaigns/${innovationId}?platform=${platform}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Failed to load campaign" }));
    throw new Error(error.detail || `Failed to load campaign with status ${response.status}`);
  }

  return response.json();
}

/**
 * Trigger AI regeneration of crowdfunding campaign package.
 */
export async function generateCrowdfundingCampaign(
  innovationId: string,
  token: string,
  platform: string = "kickstarter"
): Promise<CampaignResponse> {
  const response = await fetch(`${API_BASE}/api/campaigns/generate/${innovationId}?platform=${platform}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Failed to generate campaign" }));
    throw new Error(error.detail || `Failed to generate campaign with status ${response.status}`);
  }

  return response.json();
}

/**
 * Save creator edits to crowdfunding campaign draft.
 */
export async function updateCrowdfundingCampaign(
  innovationId: string,
  payload: Partial<CrowdfundingCampaign>,
  token: string
): Promise<CampaignResponse> {
  const response = await fetch(`${API_BASE}/api/campaigns/${innovationId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Failed to save campaign" }));
    throw new Error(error.detail || `Failed to save campaign with status ${response.status}`);
  }

  return response.json();
}
export interface PlatformChecklistItem {
  id: string;
  category: string;
  task: string;
  description: string;
  mandatory: boolean;
}

export interface PlatformGuide {
  platform_id: string;
  platform_name: string;
  tagline: string;
  recommended_duration: string;
  funding_model: string;
  fee_structure: string;
  key_rules: string[];
  checklist: PlatformChecklistItem[];
}

export interface PlatformGuidesResponse {
  status: string;
  guides: Record<string, PlatformGuide>;
}

/**
 * Retrieve platform-specific guidelines and submission checklists.
 */
export async function getCrowdfundingGuides(token?: string): Promise<PlatformGuidesResponse> {
  const headers: HeadersInit = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE}/api/campaigns/guides`, {
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Failed to fetch platform guides" }));
    throw new Error(error.detail || `Failed to fetch platform guides with status ${response.status}`);
  }

  return response.json();
}

/**
 * Export campaign copy formatted for Kickstarter, Indiegogo, or Crowd Supply markdown editors.
 */
export async function exportCampaignMarkdown(
  innovationId: string,
  token: string,
  platform: string = "kickstarter"
): Promise<CampaignExportResponse> {
  const response = await fetch(`${API_BASE}/api/campaigns/${innovationId}/export?platform=${platform}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Failed to export campaign" }));
    throw new Error(error.detail || `Failed to export campaign with status ${response.status}`);
  }

  return response.json();
}

/**
 * Download high-quality branded ReportLab PDF specification for crowdfunding campaign.
 */
export async function downloadCampaignPdf(
  token: string,
  innovationId: string,
  suggestedFilename?: string
): Promise<void> {
  const response = await fetch(`${API_BASE}/api/campaigns/${innovationId}/pdf`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: "Failed to download campaign PDF" }));
    throw new Error(err.detail || `Failed to download campaign PDF with status ${response.status}`);
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = suggestedFilename || `InnovX_Campaign_${innovationId.slice(0, 8)}.pdf`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}
