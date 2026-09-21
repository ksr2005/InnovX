"use client";

interface ScoreDetail {
  score: number;
  explanation: string;
  references: string[];
}

interface AssessmentScores {
  prior_art_density: ScoreDetail;
  feature_novelty: ScoreDetail;
  combination_distinctiveness: ScoreDetail;
  research_freshness: ScoreDetail;
  evidence_strength: ScoreDetail;
  search_confidence: ScoreDetail;
}

interface AssessmentProps {
  scores: AssessmentScores;
  summary: string;
}

const SCORE_META: Record<string, { label: string; icon: string; invertColor?: boolean }> = {
  prior_art_density: { label: "Prior Art Density", icon: "📚" },
  feature_novelty: { label: "Feature Novelty", icon: "💡", invertColor: true },
  combination_distinctiveness: { label: "Combination Uniqueness", icon: "🧩", invertColor: true },
  research_freshness: { label: "Research Freshness", icon: "🕐" },
  evidence_strength: { label: "Evidence Strength", icon: "🔬" },
  search_confidence: { label: "Search Confidence", icon: "🎯" },
};

function getScoreColor(score: number, invert: boolean = false): string {
  const effective = invert ? score : 100 - score;
  if (effective >= 70) return "text-emerald-400";
  if (effective >= 40) return "text-yellow-400";
  return "text-red-400";
}

function getBarColor(score: number, invert: boolean = false): string {
  const effective = invert ? score : 100 - score;
  if (effective >= 70) return "bg-emerald-500";
  if (effective >= 40) return "bg-yellow-500";
  return "bg-red-500";
}

export function AssessmentView({ scores, summary }: AssessmentProps) {
  const scoreEntries = Object.entries(scores) as [string, ScoreDetail][];

  return (
    <div className="space-y-6">
      {/* AI Summary */}
      <div className="border border-border rounded-lg p-6 bg-card">
        <h3 className="font-semibold text-lg mb-3">🧠 AI Assessment Summary</h3>
        <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
          {summary}
        </div>
      </div>

      {/* Score Cards */}
      <div className="border border-border rounded-lg overflow-hidden bg-card">
        <div className="px-6 py-4 bg-muted/30 border-b border-border">
          <h3 className="font-semibold text-lg">Innovation Assessment Scores</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Six evidence-backed metrics. Each score includes an explanation and source references.
          </p>
        </div>

        <div className="divide-y divide-border">
          {scoreEntries.map(([key, detail]) => {
            const meta = SCORE_META[key] || { label: key, icon: "📊" };
            const invert = meta.invertColor || false;

            return (
              <div key={key} className="px-6 py-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span>{meta.icon}</span>
                    <span className="text-sm font-medium">{meta.label}</span>
                  </div>
                  <span className={`text-lg font-bold font-mono ${getScoreColor(detail.score, invert)}`}>
                    {detail.score.toFixed(0)}
                    <span className="text-xs text-muted-foreground">/100</span>
                  </span>
                </div>

                {/* Score bar */}
                <div className="h-2 bg-muted rounded-full overflow-hidden mb-3">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${getBarColor(detail.score, invert)}`}
                    style={{ width: `${Math.min(detail.score, 100)}%` }}
                  />
                </div>

                {/* Explanation */}
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {detail.explanation}
                </p>

                {/* References */}
                {detail.references.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {detail.references.slice(0, 3).map((ref, i) => (
                      <p key={i} className="text-xs text-muted-foreground/70 pl-3 border-l border-border">
                        {ref}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
