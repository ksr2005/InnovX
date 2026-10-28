"use client";

import { useState } from "react";
import {
  compareCompetitorPatent,
  type PatentCompareResponse,
  type StructuredIdea,
} from "@/lib/api";

interface PatentComparatorModalProps {
  structuredIdea: StructuredIdea;
  isOpen: boolean;
  onClose: () => void;
}

const SAMPLE_COMPETITOR_PATENT = {
  title: "US10824881B2 - Subterranean crawler inspection probe with acoustic transducers",
  text: "An inline pipe inspection robotic device having wheeled track crawlers, ultrasonic pulse transducers for pipe wall thickness evaluation, and an onboard data logging flash storage unit designed for human tethered retrieval in oil pipelines.",
};

export function PatentComparatorModal({
  structuredIdea,
  isOpen,
  onClose,
}: PatentComparatorModalProps) {
  const [competitorTitle, setCompetitorTitle] = useState(SAMPLE_COMPETITOR_PATENT.title);
  const [competitorText, setCompetitorText] = useState(SAMPLE_COMPETITOR_PATENT.text);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PatentCompareResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCompare = async () => {
    if (!competitorText.trim()) return;
    try {
      setLoading(true);
      setError(null);
      const res = await compareCompetitorPatent({
        creator_title: structuredIdea.title,
        creator_features: structuredIdea.key_features,
        competitor_title: competitorTitle.trim() || "Cited Prior Art Patent",
        competitor_claims_or_text: competitorText.trim(),
      });
      setResult(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadSample = () => {
    setCompetitorTitle(SAMPLE_COMPETITOR_PATENT.title);
    setCompetitorText(SAMPLE_COMPETITOR_PATENT.text);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-4xl rounded-2xl border border-cyan-500/40 bg-card p-5 sm:p-7 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-3 border-b border-border/60 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">⚖️</span>
              <h3 className="text-lg sm:text-xl font-bold text-foreground">
                Claim-by-Claim Competitor Patent Comparator
              </h3>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                FTO Risk Engine
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Evaluate semantic claim collision against any specific USPTO patent number, competitor claim, or academic prior art disclosure.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-muted-foreground hover:text-foreground cursor-pointer p-1.5 rounded-lg border border-border/60 hover:bg-muted"
          >
            ✕ Close
          </button>
        </div>

        {/* Input Form */}
        <div className="space-y-3 bg-muted/20 p-4 rounded-xl border border-border/60">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <label className="text-xs font-semibold text-foreground">
              Target Competitor Patent Title / Patent Number:
            </label>
            <button
              type="button"
              onClick={handleLoadSample}
              className="text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
            >
              Load Sample Competitor Patent
            </button>
          </div>
          <input
            type="text"
            value={competitorTitle}
            onChange={(e) => setCompetitorTitle(e.target.value)}
            placeholder="e.g. US10824881B2 — Subterranean pipeline crawler probe"
            className="w-full px-3.5 py-2 text-xs sm:text-sm bg-card border border-border/80 rounded-xl text-foreground focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono"
          />

          <label className="text-xs font-semibold text-foreground block pt-1">
            Competitor Patent Claims or Architectural Description:
          </label>
          <textarea
            value={competitorText}
            onChange={(e) => setCompetitorText(e.target.value)}
            placeholder="Paste independent claims, abstract, or system description from Google Patents or USPTO..."
            rows={3}
            className="w-full p-3 text-xs bg-card border border-border/80 rounded-xl text-foreground focus:outline-none focus:ring-1 focus:ring-cyan-500 leading-relaxed font-mono"
          />

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-muted-foreground font-mono">
              Compares against your {structuredIdea.key_features.length} atomic technical features
            </span>
            <button
              type="button"
              onClick={handleCompare}
              disabled={loading || !competitorText.trim()}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent mr-1" />
                  <span>Computing Vector Collision...</span>
                </>
              ) : (
                <>
                  <span>🔍</span>
                  <span>Run Claim-by-Claim Venn Analysis</span>
                </>
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-xs text-destructive">
            {error}
          </div>
        )}

        {/* Results View */}
        {result && (
          <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2">
            {/* Risk Gauge Bar */}
            <div className="p-4 rounded-xl border border-border/80 bg-gradient-to-r from-card via-muted/30 to-card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-mono text-muted-foreground uppercase">
                  Infringement Exposure &amp; Freedom-to-Operate
                </div>
                <div className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2 mt-0.5">
                  <span className={result.overall_overlap_percentage >= 70 ? "text-rose-400" : result.overall_overlap_percentage >= 50 ? "text-amber-400" : "text-emerald-400"}>
                    {result.risk_rating}
                  </span>
                  <span className="text-xs font-mono font-normal text-muted-foreground">
                    ({result.overall_overlap_percentage}% Overlap)
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1 max-w-xl">
                  {result.risk_summary}
                </p>
              </div>

              <div className="text-right shrink-0">
                <div className="text-[10px] font-mono text-muted-foreground uppercase">Freedom-to-Operate Index</div>
                <div className="text-2xl font-black font-mono text-emerald-400">
                  {result.freedom_to_operate_index} / 100
                </div>
              </div>
            </div>

            {/* Side-by-Side Venn Breakdown Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left Column: Novelty Differentiators */}
              <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/15 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 uppercase font-mono">
                    <span>🛡️</span>
                    <span>Your Patentable Differentiators ({result.differentiating_features.length})</span>
                  </h4>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Circumvention Anchor
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Competitor patent lacks these features. Emphasize these as independent apparatus and method claims.
                </p>
                <div className="space-y-2">
                  {result.differentiating_features.map((item, idx) => (
                    <div key={idx} className="p-2.5 rounded-lg bg-card/80 border border-border/60 space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className="font-bold text-emerald-400">{item.feature_id}</span>
                        <span className="text-muted-foreground">{item.novelty_signal}</span>
                      </div>
                      <p className="text-xs text-foreground font-medium">{item.feature_description}</p>
                      <p className="text-[10px] text-emerald-400/90 italic font-mono">{item.analysis}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column: Overlapping Elements */}
              <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-950/15 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-amber-400 flex items-center gap-1.5 uppercase font-mono">
                    <span>⚠️</span>
                    <span>Overlapping Scope ({result.overlapping_features.length})</span>
                  </h4>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    Needs Claim Narrowing
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Architectural overlap detected with cited prior art. Avoid broad generic claims on these elements.
                </p>
                <div className="space-y-2">
                  {result.overlapping_features.map((item, idx) => (
                    <div key={idx} className="p-2.5 rounded-lg bg-card/80 border border-border/60 space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className="font-bold text-amber-400">{item.feature_id}</span>
                        <span className="text-amber-300 font-bold">{item.risk_level} Overlap</span>
                      </div>
                      <p className="text-xs text-foreground font-medium">{item.feature_description}</p>
                      <p className="text-[10px] text-amber-300/90 italic font-mono">{item.analysis}</p>
                    </div>
                  ))}
                  {result.overlapping_features.length === 0 && (
                    <div className="p-3 text-center text-xs text-emerald-400 font-mono italic">
                      Zero high-risk claim collisions identified! Clear Freedom-to-Operate.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Tactical Design-Around Directives */}
            <div className="p-4 rounded-xl border border-cyan-500/30 bg-cyan-950/20 space-y-2.5">
              <div className="flex items-center gap-2">
                <span className="text-lg">🎯</span>
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider font-mono">
                  MPEP-Compliant Design-Around Directives:
                </h4>
              </div>
              <ul className="space-y-1.5 text-xs text-muted-foreground">
                {result.design_around_recommendations.map((rec, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-cyan-400 font-bold font-mono">#{idx + 1}</span>
                    <span className="leading-relaxed">{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
