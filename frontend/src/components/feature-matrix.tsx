"use client";

import type { FeatureMatrix as FeatureMatrixType, FeatureAnalysis } from "@/lib/api";
import { SearchMethodologyModal } from "./search-methodology-modal";
import { ExternalLink, CheckCircle2 } from "lucide-react";

interface FeatureMatrixProps {
  matrix: FeatureMatrixType;
}

const coverageBadge = {
  high: { label: "HIGH OVERLAP", className: "bg-rose-500/10 text-rose-400 border-rose-500/20" },
  medium: { label: "MODERATE", className: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  low: { label: "LOW DENSITY", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  none: { label: "HIGH NOVELTY", className: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" },
};

const sourceBadge = {
  openalex: { label: "Paper", className: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  arxiv: { label: "Preprint", className: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
  uspto: { label: "Patent", className: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
};

export function FeatureMatrix({ matrix }: FeatureMatrixProps) {
  return (
    <div className="border border-border/70 rounded-3xl overflow-hidden bg-card/70 backdrop-blur-xl shadow-xl">
      <div className="px-6 sm:px-8 py-5 bg-muted/20 border-b border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h3 className="font-bold text-lg text-foreground">Feature × Evidence Grounding Matrix</h3>
            <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-bold uppercase tracking-wider">
              Reciprocal Rank Fusion
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Each row maps to an extracted technical feature. Evidence links to verified external citations.
          </p>
        </div>

        {/* Search Methodology & Audit Trail Modal Trigger */}
        <div className="shrink-0">
          <SearchMethodologyModal
            methodology={matrix.methodology}
            sourcesSearched={matrix.search_sources}
            totalFeatures={matrix.features.length}
          />
        </div>
      </div>

      <div className="divide-y divide-border/40">
        {matrix.features.map((feature) => (
          <FeatureRow key={feature.id} feature={feature} />
        ))}
      </div>

      <div className="px-6 sm:px-8 py-4 bg-muted/10 border-t border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span>Target Corpora:</span>
          <span className="text-foreground font-semibold">{matrix.search_sources.join(" • ")}</span>
        </div>
        <div className="flex items-center gap-3 font-mono text-[11px]">
          <span className="text-cyan-400">RRF k=60 Fusion</span>
          <span>&bull;</span>
          <span>Timestamped: {new Date(matrix.search_timestamp).toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  );
}

function FeatureRow({ feature }: { feature: FeatureAnalysis }) {
  const badge = coverageBadge[feature.coverage];

  return (
    <div className="p-6 sm:p-8 space-y-4">
      {/* Feature header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-lg mt-0.5 shrink-0">
            {feature.id}
          </span>
          <span className="text-sm sm:text-base font-bold text-foreground leading-snug">
            {feature.description}
          </span>
        </div>
        <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-auto">
          <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${badge.className}`}>
            {badge.label}
          </span>
          <span className="text-xs font-mono text-muted-foreground">
            {feature.total_matches} candidate{feature.total_matches === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      {/* Prior art results */}
      {feature.prior_art.length > 0 ? (
        <div className="space-y-3 pt-1">
          {feature.prior_art.map((art, i) => {
            const src = sourceBadge[art.source];
            return (
              <div key={i} className="text-xs sm:text-sm border border-border/50 rounded-2xl p-4 sm:p-5 bg-muted/15 hover:bg-muted/30 transition-all duration-200 space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex-1 space-y-1">
                    {art.url ? (
                      <a
                        href={art.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-cyan-400 hover:text-cyan-300 font-semibold text-sm leading-snug inline-flex items-center gap-1.5 group"
                      >
                        <span className="group-hover:underline">{art.title}</span>
                        <ExternalLink className="w-3.5 h-3.5 shrink-0 opacity-70 group-hover:opacity-100" />
                      </a>
                    ) : (
                      <span className="font-semibold text-sm leading-snug text-foreground">{art.title}</span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {/* Source Badge */}
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${src.className}`}>
                      {src.label}
                    </span>

                    {/* Semantic Similarity */}
                    <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-md border border-emerald-500/20" title="Semantic Cosine Similarity">
                      {(art.similarity * 100).toFixed(0)}% match
                    </span>
                  </div>
                </div>

                {art.evidence_sentence && (
                  <div className="p-3.5 rounded-xl bg-background/50 border border-border/30 text-xs sm:text-sm text-foreground/80 leading-relaxed italic border-l-2 border-l-emerald-400">
                    &ldquo;{art.evidence_sentence}&rdquo;
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-muted/10 border border-border/30 text-xs text-muted-foreground italic flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>No direct anticipation found across indexed literature for this feature vector. High Novelty Opportunity.</span>
        </div>
      )}
    </div>
  );
}
