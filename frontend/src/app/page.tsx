"use client";

import { useState } from "react";
import { analyzeIdea, type AnalysisResponse } from "@/lib/api";
import { IdeaInput } from "@/components/idea-input";
import { FeatureMatrix } from "@/components/feature-matrix";
import { ProvenanceCard } from "@/components/provenance-card";

export default function Home() {
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async (text: string) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await analyzeIdea(text);
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 bg-background/95 backdrop-blur">
        <div className="mx-auto max-w-6xl flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold tracking-tight">
              <span className="text-primary">Innov</span>
              <span className="text-emerald-500">X</span>
            </span>
            <span className="text-xs text-muted-foreground border border-border rounded-full px-2 py-0.5">
              Engine
            </span>
          </div>
          <p className="text-sm text-muted-foreground hidden sm:block">
            AI-Powered Innovation Discovery &amp; Validation
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-12">
        {/* Hero Section */}
        {!result && !loading && (
          <div className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
              Discover what already exists.
              <br />
              <span className="text-emerald-500">Find what makes your idea different.</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Paste your idea below. InnovX will decompose it into technical features,
              search 250M+ academic papers, preprints, and patents, and show you
              exactly what overlaps — and what doesn&apos;t.
            </p>
          </div>
        )}

        {/* Idea Input */}
        <IdeaInput onSubmit={handleAnalyze} isLoading={loading} />

        {/* Error */}
        {error && (
          <div className="mt-8 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-center">
            {error}
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="mt-12 space-y-8">
            {/* Innovation Header */}
            <div className="border border-border rounded-lg p-6 bg-card">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-mono">
                    Innovation #{result.innovation_id}
                  </p>
                  <h2 className="text-2xl font-bold mt-1">{result.structured_idea.title}</h2>
                  <p className="text-sm text-emerald-500 mt-1">{result.structured_idea.domain}</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-1">Problem</h3>
                  <p className="text-sm">{result.structured_idea.problem_statement}</p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-1">Solution</h3>
                  <p className="text-sm">{result.structured_idea.proposed_solution}</p>
                </div>
              </div>
            </div>

            {/* Feature Matrix */}
            <FeatureMatrix matrix={result.feature_matrix} />

            {/* Provenance */}
            <ProvenanceCard provenance={result.provenance} />

            {/* Limitations */}
            <div className="border border-border rounded-lg p-6 bg-card">
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                ⚠️ Search Confidence &amp; Limitations
              </h3>
              <ul className="space-y-2">
                {result.feature_matrix.limitations.map((limitation, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex gap-2">
                    <span className="text-yellow-500">•</span>
                    {limitation}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="mt-20 pb-8 text-center text-xs text-muted-foreground">
          <p>
            InnovX provides evidence-based prior-art analysis, not legal advice.
            Consult a patent attorney before making IP decisions.
          </p>
        </footer>
      </main>
    </div>
  );
}
