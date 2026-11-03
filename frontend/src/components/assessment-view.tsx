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
  feature_novelty: { label: "Feature Novelty Signal", icon: "💡", invertColor: true },
  combination_distinctiveness: { label: "Combination Uniqueness", icon: "🧩", invertColor: true },
  research_freshness: { label: "Research Freshness", icon: "🕐" },
  evidence_strength: { label: "Evidence Strength", icon: "🔬" },
  search_confidence: { label: "Search Confidence", icon: "🎯" },
};

function getScoreColor(score: number, invert: boolean = false): string {
  const effective = invert ? score : 100 - score;
  if (effective >= 70) return "text-emerald-400";
  if (effective >= 40) return "text-amber-400";
  return "text-rose-400";
}

function getBarColor(score: number, invert: boolean = false): string {
  const effective = invert ? score : 100 - score;
  if (effective >= 70) return "bg-gradient-to-r from-emerald-500 to-teal-400";
  if (effective >= 40) return "bg-gradient-to-r from-amber-500 to-yellow-400";
  return "bg-gradient-to-r from-rose-500 to-orange-400";
}

export function AssessmentView({ scores, summary }: AssessmentProps) {
  const scoreEntries = Object.entries(scores) as [string, ScoreDetail][];

  return (
    <div className="space-y-8">
      {/* AI Summary Card */}
      <div className="border border-border/70 rounded-3xl p-6 sm:p-8 bg-card/70 backdrop-blur-xl shadow-xl space-y-3">
        <div className="flex items-center gap-2.5">
          <span className="text-xl">🧠</span>
          <h3 className="font-bold text-lg text-foreground">Synthesis &amp; Assessment Narrative</h3>
        </div>
        <div className="text-sm sm:text-base text-foreground/85 leading-relaxed whitespace-pre-line pl-1 font-normal">
          {summary}
        </div>
      </div>

      {/* Score Cards */}
      <div className="border border-border/70 rounded-3xl overflow-hidden bg-card/70 backdrop-blur-xl shadow-xl">
        <div className="px-6 sm:px-8 py-5 bg-muted/20 border-b border-border/60">
          <h3 className="font-bold text-lg text-foreground">Quantitative Innovation Signals</h3>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Six evidence-backed metrics calculated from multi-lake vector proximity and evidence quotes.
          </p>
        </div>

        <div className="divide-y divide-border/40">
          {scoreEntries.map(([key, detail]) => {
            const meta = SCORE_META[key] || { label: key, icon: "📊" };
            const invert = meta.invertColor || false;

            return (
              <div key={key} className="p-6 sm:p-8 space-y-3 hover:bg-muted/10 transition-colors">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">{meta.icon}</span>
                    <span className="text-sm sm:text-base font-bold text-foreground">{meta.label}</span>
                  </div>
                  <span className={`text-xl font-mono font-extrabold ${getScoreColor(detail.score, invert)}`}>
                    {detail.score.toFixed(0)}
                    <span className="text-xs text-muted-foreground font-normal">/100</span>
                  </span>
                </div>

                {/* Smooth Animated Progress Bar */}
                <div className="h-2 bg-muted/50 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${getBarColor(detail.score, invert)}`}
                    style={{ width: `${Math.min(detail.score, 100)}%` }}
                  />
                </div>

                {/* Explanation with relaxed leading */}
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed pt-1">
                  {detail.explanation}
                </p>

                {/* References */}
                {detail.references.length > 0 && (
                  <div className="pt-2 space-y-1.5">
                    {detail.references.slice(0, 3).map((ref, i) => (
                      <p key={i} className="text-xs text-muted-foreground/75 pl-3 border-l-2 border-border/60 font-mono">
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
