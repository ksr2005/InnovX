"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  getConfidentialFullDisclosure,
  downloadReportPdf,
  type FullInnovationDisclosureResponse,
} from "@/lib/api";

interface ConfidentialDisclosureViewProps {
  listingId: string;
  token: string;
  onClose: () => void;
}

export function ConfidentialDisclosureView({
  listingId,
  token,
  onClose,
}: ConfidentialDisclosureViewProps) {
  const [data, setData] = useState<FullInnovationDisclosureResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadDisclosure() {
      try {
        setLoading(true);
        setError(null);
        const res = await getConfidentialFullDisclosure(listingId, token);
        if (isMounted) setData(res);
      } catch (err: any) {
        if (isMounted) setError(err.message || "Failed to access confidential disclosure");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadDisclosure();
    return () => {
      isMounted = false;
    };
  }, [listingId, token]);

  const handleDownloadPdf = async () => {
    if (!data) return;
    try {
      setDownloadingPdf(true);
      await downloadReportPdf(data.innovation_id);
    } catch (err: any) {
      alert("Failed to download PDF report: " + err.message);
    } finally {
      setDownloadingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-2xl border border-emerald-500/30 bg-card p-6 shadow-2xl space-y-6">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* NDA Header Notice */}
        <div className="border-b border-border/60 pb-4">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xl">🔓</span>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                NDA-Authorized Full Technical Disclosure
              </span>
            </div>
            {data && (
              <span className="text-[11px] text-muted-foreground font-mono">
                Access Verified at: {new Date(data.authorized_at).toLocaleString()}
              </span>
            )}
          </div>
          <h2 className="text-2xl font-bold text-foreground">
            {data?.title || "Confidential Innovation Record"}
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Governed by executed Mutual Non-Disclosure Agreement. Any unauthorized duplication, dissemination, or reverse engineering is strictly prohibited.
          </p>
        </div>

        {error && (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-xs text-destructive space-y-2">
            <div className="font-semibold flex items-center gap-1.5">
              <span>🔒</span>
              <span>Confidentiality Barrier Active (Rule 6)</span>
            </div>
            <p>{error}</p>
          </div>
        )}

        {loading ? (
          <div className="py-16 text-center text-xs text-muted-foreground space-y-2">
            <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p>Verifying digital NDA signatures and loading uncensored technical disclosure...</p>
          </div>
        ) : data ? (
          <div className="space-y-6 text-xs">
            {/* Problem & Solution Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-background border border-border/60">
              <div>
                <h4 className="font-semibold text-muted-foreground uppercase tracking-wider text-[11px] mb-1.5">
                  Full Problem Statement
                </h4>
                <p className="text-foreground leading-relaxed">
                  {data.structured_data?.problem_statement || "No structured problem statement available."}
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-muted-foreground uppercase tracking-wider text-[11px] mb-1.5">
                  Uncensored Technical Solution
                </h4>
                <p className="text-foreground leading-relaxed">
                  {data.structured_data?.proposed_solution || "No structured solution statement available."}
                </p>
              </div>
            </div>

            {/* Assessment Scores */}
            {data.scores && (
              <div className="space-y-2">
                <h4 className="font-semibold text-foreground text-xs uppercase tracking-wider">
                  Verified Prior-Art &amp; Novelty Metrics
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                  <div className="p-3 rounded-lg border border-border bg-background text-center">
                    <span className="text-[10px] text-muted-foreground uppercase block">Novelty</span>
                    <span className="text-lg font-bold text-emerald-400">
                      {data.scores.feature_novelty ?? "—"}%
                    </span>
                  </div>
                  <div className="p-3 rounded-lg border border-border bg-background text-center">
                    <span className="text-[10px] text-muted-foreground uppercase block">Density</span>
                    <span className="text-lg font-bold text-amber-400">
                      {data.scores.prior_art_density ?? "—"}%
                    </span>
                  </div>
                  <div className="p-3 rounded-lg border border-border bg-background text-center">
                    <span className="text-[10px] text-muted-foreground uppercase block">Distinct</span>
                    <span className="text-lg font-bold text-cyan-400">
                      {data.scores.combination_distinctiveness ?? "—"}%
                    </span>
                  </div>
                  <div className="p-3 rounded-lg border border-border bg-background text-center">
                    <span className="text-[10px] text-muted-foreground uppercase block">Freshness</span>
                    <span className="text-lg font-bold text-indigo-400">
                      {data.scores.research_freshness ?? "—"}%
                    </span>
                  </div>
                  <div className="p-3 rounded-lg border border-border bg-background text-center">
                    <span className="text-[10px] text-muted-foreground uppercase block">Evidence</span>
                    <span className="text-lg font-bold text-sky-400">
                      {data.scores.evidence_strength ?? "—"}%
                    </span>
                  </div>
                  <div className="p-3 rounded-lg border border-border bg-background text-center">
                    <span className="text-[10px] text-muted-foreground uppercase block">Viability</span>
                    <span className="text-lg font-bold text-purple-400">
                      {data.scores.commercial_viability ?? "—"}%
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Assessment Summary */}
            {data.assessment_summary && (
              <div className="p-4 rounded-xl border border-border/80 bg-background/60 space-y-1.5">
                <h4 className="font-semibold text-foreground text-xs uppercase tracking-wider">
                  AI Assessment Synthesis
                </h4>
                <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {data.assessment_summary}
                </p>
              </div>
            )}

            {/* Feature Breakdown */}
            {data.structured_data?.features && data.structured_data.features.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-foreground text-xs uppercase tracking-wider">
                  Uncensored Technical Feature Architecture
                </h4>
                <div className="divide-y divide-border/60 rounded-xl border border-border bg-background">
                  {data.structured_data.features.map((feat: any, idx: number) => (
                    <div key={idx} className="p-3 flex items-start gap-3">
                      <span className="px-2 py-0.5 rounded bg-muted text-[11px] font-mono font-bold text-foreground shrink-0">
                        {feat.feature_id || `F${idx + 1}`}
                      </span>
                      <div>
                        <p className="text-foreground font-medium text-xs">
                          {feat.description}
                        </p>
                        {feat.category && (
                          <span className="text-[10px] text-muted-foreground capitalize mt-0.5 block">
                            Category: {feat.category}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}

        {/* Footer Actions */}
        <div className="flex items-center justify-between gap-3 pt-4 border-t border-border/60">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            Close Viewer
          </Button>

          {data && (
            <Button
              size="sm"
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5"
            >
              {downloadingPdf ? "Generating PDF..." : "📥 Download Full Uncensored PDF"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
