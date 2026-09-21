/**
 * InnovX API Client — Communicates with the FastAPI backend.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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
}

export interface FeatureEvidence {
  title: string;
  source: "openalex" | "arxiv" | "uspto";
  similarity: number;
  evidence_sentence: string | null;
  url: string | null;
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
}

export interface ProvenanceRecord {
  innovation_id: string;
  version: number;
  document_hash: string;
  previous_hash: string | null;
  created_at: string;
}

export interface AnalysisResponse {
  innovation_id: string;
  structured_idea: StructuredIdea;
  feature_matrix: FeatureMatrix;
  provenance: ProvenanceRecord;
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
    const error = await response.json().catch(() => ({ detail: "Analysis failed" }));
    throw new Error(error.detail || `Analysis failed with status ${response.status}`);
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
