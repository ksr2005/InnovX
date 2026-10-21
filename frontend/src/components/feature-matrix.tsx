"use client";

import type { FeatureMatrix as FeatureMatrixType, FeatureAnalysis } from "@/lib/api";
import { SearchMethodologyModal } from "./search-methodology-modal";

interface FeatureMatrixProps {
  matrix: FeatureMatrixType;
}

const coverageBadge = {
  high: { label: "HIGH", className: "bg-red-500/10 text-red-400 border-red-500/20" },
  medium: { label: "MEDIUM", className: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" },
  low: { label: "LOW", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  none: { label: "NONE", className: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20" },
};

const sourceBadge = {
  openalex: { label: "Paper", className: "bg-blue-500/10 text-blue-400" },
  arxiv: { label: "Preprint", className: "bg-purple-500/10 text-purple-400" },
  uspto: { label: "Patent", className: "bg-orange-500/10 text-orange-400" },
};

export function FeatureMatrix({ matrix }: FeatureMatrixProps) {
  return (
    <div className="border border-border rounded-xl overflow-hidden bg-card shadow-sm">
      <div className="px-6 py-4 bg-muted/30 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-lg text-foreground">Feature × Evidence Matrix</h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-bold uppercase">
              RRF Hybrid
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Each row is an extracted technical feature. Evidence links to verified external sources.
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

      <div className="divide-y divide-border">
        {matrix.features.map((feature) => (
          <FeatureRow key={feature.id} feature={feature} />
        ))}
      </div>

      <div className="px-6 py-3.5 bg-muted/20 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-muted-foreground">
        <div>
          <span>Sources: </span>
          <span className="text-foreground font-medium">{matrix.search_sources.join(" · ")}</span>
        </div>
        <div className="flex items-center gap-3 font-mono text-[11px]">
          <span className="text-cyan-400">RRF k=60 Fused</span>
          <span>&bull;</span>
          <span>Searched: {new Date(matrix.search_timestamp).toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}

function FeatureRow({ feature }: { feature: FeatureAnalysis }) {
  const badge = coverageBadge[feature.coverage];

  return (
    <div className="px-6 py-5">
      {/* Feature header */}
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-emerald-500 font-bold">{feature.id}</span>
            <span className="text-sm font-semibold text-foreground">{feature.description}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${badge.className}`}>
            {badge.label}
          </span>
          <span className="text-xs font-mono text-muted-foreground">
            {feature.total_matches} candidate{feature.total_matches === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      {/* Prior art results */}
      {feature.prior_art.length > 0 ? (
        <div className="space-y-2.5 ml-0 sm:ml-6">
          {feature.prior_art.map((art, i) => {
            const src = sourceBadge[art.source];
            return (
              <div key={i} className="text-sm border border-border/60 rounded-xl p-3.5 bg-muted/25 hover:bg-muted/40 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                  <div className="flex-1">
                    {art.url ? (
                      <a
                        href={art.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-cyan-400 hover:text-cyan-300 hover:underline font-medium text-sm leading-snug"
                      >
                        {art.title}
                      </a>
                    ) : (
                      <span className="font-medium text-sm leading-snug text-foreground">{art.title}</span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 shrink-0 pt-0.5">
                    {/* Source Badge */}
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${src.className}`}>
                      {src.label}
                    </span>

                    {/* RRF Rank Badge */}
                    {art.rank_rrf && (
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/25">
                        RRF #{art.rank_rrf}
                      </span>
                    )}

                    {/* Semantic Similarity */}
                    <span className="text-xs font-mono font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20" title="Semantic Cosine Similarity">
                      {(art.similarity * 100).toFixed(0)}% sim
                    </span>

                    {/* BM25 Keyword match */}
                    {art.keyword_score != null && art.keyword_score > 0 && (
                      <span className="text-[10px] font-mono text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20" title="Okapi BM25 Keyword Match">
                        BM25: {(art.keyword_score * 100).toFixed(0)}%
                      </span>
                    )}
                  </div>
                </div>

                {art.evidence_sentence && (
                  <p className="text-xs text-muted-foreground mt-2 italic border-l-2 border-emerald-500/40 pl-3 leading-relaxed">
                    &ldquo;{art.evidence_sentence}&rdquo;
                  </p>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground ml-0 sm:ml-6 italic">
          No prior art found in indexed sources for this feature.
        </p>
      )}
    </div>
  );
}

