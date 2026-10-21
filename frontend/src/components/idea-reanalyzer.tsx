"use client";

import React, { useState } from "react";
import { reanalyzeInnovation, type InnovationListItem } from "@/lib/api";
import { Button } from "@/components/ui/button";

interface IdeaReanalyzerProps {
  innovation: InnovationListItem;
  token: string;
  onReanalyzed: (updated: InnovationListItem) => void;
}

export function IdeaReanalyzer({ innovation, token, onReanalyzed }: IdeaReanalyzerProps) {
  const [rawText, setRawText] = useState(innovation.raw_input || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{
    version: number;
    docHash: string;
    prevHash: string | null;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rawText.trim().length < 50) {
      setError("Idea description must be at least 50 characters for technical analysis.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessInfo(null);

    try {
      const res = await reanalyzeInnovation(innovation.id, rawText.trim(), token);
      setSuccessInfo({
        version: res.version,
        docHash: res.document_hash,
        prevHash: res.previous_hash,
      });
      onReanalyzed(res.innovation);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Re-analysis failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Informational Banner */}
      <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-xs space-y-1.5">
        <div className="flex items-center gap-2 font-semibold text-cyan-400">
          <span>🔄</span>
          <span>Idea Refinement &amp; Provenance Chaining</span>
        </div>
        <p className="text-muted-foreground leading-relaxed">
          Modifying your technical idea re-runs the full 10-step AI discovery pipeline (OpenAlex, arXiv, USPTO),
          re-extracts atomic features, updates novelty scores, and automatically commits a new version (
          <span className="text-foreground font-mono font-bold">
            v{innovation.current_version} → v{innovation.current_version + 1}
          </span>
          ) to the immutable SHA-256 provenance hash chain.
        </p>
      </div>

      {/* Re-analysis Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-foreground">
              Technical Description (v{innovation.current_version})
            </label>
            <span className="text-[11px] text-muted-foreground font-mono">
              {rawText.length} characters (min 50)
            </span>
          </div>

          <textarea
            rows={8}
            required
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            disabled={loading}
            placeholder="Describe your technical invention, components, mechanisms, and implementation details..."
            className="w-full p-3.5 text-xs rounded-xl bg-background border border-border text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 leading-relaxed font-sans"
          />
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
            {error}
          </div>
        )}

        {/* Success Card */}
        {successInfo && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs space-y-2 animate-in fade-in duration-300">
            <div className="flex items-center gap-2 text-emerald-400 font-bold">
              <span>✅</span>
              <span>Re-Analysis Complete — Advanced to Version {successInfo.version}</span>
            </div>
            <p className="text-muted-foreground">
              Your innovation has been re-indexed against OpenAlex, arXiv, and USPTO databases. The provenance chain is cryptographically intact:
            </p>
            <div className="font-mono text-[11px] space-y-1 bg-black/40 p-2.5 rounded-lg border border-border/50">
              <p className="text-muted-foreground">
                Previous Hash: <span className="text-foreground">{successInfo.prevHash || "(genesis)"}</span>
              </p>
              <p className="text-emerald-400">
                New Document Hash: <span className="font-bold">{successInfo.docHash}</span>
              </p>
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="flex items-center justify-between pt-2">
          <span className="text-[11px] text-muted-foreground">
            Pipeline takes ~20–30s to query external research databases.
          </span>

          <Button
            type="submit"
            disabled={loading || rawText.trim().length < 50}
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-5 h-9"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Re-Running Discovery Pipeline...
              </span>
            ) : (
              "Re-Run AI Discovery & Advance Version"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
