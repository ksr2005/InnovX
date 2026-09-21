"use client";

import type { FeatureMatrix as FeatureMatrixType, FeatureAnalysis } from "@/lib/api";

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
    <div className="border border-border rounded-lg overflow-hidden bg-card">
      <div className="px-6 py-4 bg-muted/30 border-b border-border">
        <h3 className="font-semibold text-lg">Feature × Evidence Matrix</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Each row is an extracted technical feature. Evidence links to real sources.
        </p>
      </div>

      <div className="divide-y divide-border">
        {matrix.features.map((feature) => (
          <FeatureRow key={feature.id} feature={feature} />
        ))}
      </div>

      <div className="px-6 py-3 bg-muted/20 border-t border-border text-xs text-muted-foreground">
        Sources: {matrix.search_sources.join(" · ")} · 
        Searched: {new Date(matrix.search_timestamp).toLocaleString()}
      </div>
    </div>
  );
}

function FeatureRow({ feature }: { feature: FeatureAnalysis }) {
  const badge = coverageBadge[feature.coverage];

  return (
    <div className="px-6 py-4">
      {/* Feature header */}
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-emerald-500 font-bold">{feature.id}</span>
            <span className="text-sm font-medium">{feature.description}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${badge.className}`}>
            {badge.label}
          </span>
          <span className="text-xs text-muted-foreground">
            {feature.total_matches} found
          </span>
        </div>
      </div>

      {/* Prior art results */}
      {feature.prior_art.length > 0 ? (
        <div className="space-y-2 ml-6">
          {feature.prior_art.map((art, i) => {
            const src = sourceBadge[art.source];
            return (
              <div key={i} className="text-sm border border-border/50 rounded-md p-3 bg-muted/20">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    {art.url ? (
                      <a
                        href={art.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:underline font-medium text-sm"
                      >
                        {art.title}
                      </a>
                    ) : (
                      <span className="font-medium text-sm">{art.title}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${src.className}`}>
                      {src.label}
                    </span>
                    <span className="text-xs font-mono text-muted-foreground">
                      {(art.similarity * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
                {art.evidence_sentence && (
                  <p className="text-xs text-muted-foreground mt-2 italic border-l-2 border-emerald-500/30 pl-3">
                    &quot;{art.evidence_sentence}&quot;
                  </p>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground ml-6 italic">
          No prior art found in indexed sources for this feature.
        </p>
      )}
    </div>
  );
}
