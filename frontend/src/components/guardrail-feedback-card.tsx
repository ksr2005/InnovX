"use client";

import type { GuardrailValidationResponse } from "@/lib/api";

interface GuardrailFeedbackCardProps {
  feedback: GuardrailValidationResponse;
  onApplyTemplate?: (template: string) => void;
  onDismiss: () => void;
}

export function GuardrailFeedbackCard({
  feedback,
  onApplyTemplate,
  onDismiss,
}: GuardrailFeedbackCardProps) {
  const isSecurity = feedback.status === "security_violation";
  const isNonTech = feedback.status === "non_technical";
  const isBroad = feedback.status === "overly_broad";
  const isShort = feedback.status === "short_input";

  const borderColor = isSecurity
    ? "border-red-500/50"
    : isNonTech
    ? "border-amber-500/40"
    : isBroad
    ? "border-cyan-500/40"
    : "border-yellow-500/40";

  const bgGradient = isSecurity
    ? "from-red-950/30 via-card to-background"
    : isNonTech
    ? "from-amber-950/20 via-card to-background"
    : isBroad
    ? "from-cyan-950/20 via-card to-background"
    : "from-yellow-950/20 via-card to-background";

  const badgeColor = isSecurity
    ? "bg-red-500/20 text-red-400 border-red-500/40 font-semibold"
    : isNonTech
    ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
    : isBroad
    ? "bg-cyan-500/15 text-cyan-400 border-cyan-500/30"
    : "bg-yellow-500/15 text-yellow-400 border-yellow-500/30";

  const icon = isSecurity ? "🛡️" : isNonTech ? "💡" : isBroad ? "🔭" : "📝";
  const categoryLabel = isSecurity
    ? "Adversarial Prompt Shield Active"
    : isNonTech
    ? "Non-Technical Concept Diagnostic"
    : isBroad
    ? "High-Level Vision Clarification"
    : "Brevity Diagnostic";

  return (
    <div
      className={`rounded-2xl border ${borderColor} bg-gradient-to-br ${bgGradient} p-5 sm:p-6 shadow-xl space-y-4 animate-in fade-in slide-in-from-top-2 duration-300`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="text-2xl p-2 rounded-xl bg-muted/60 border border-border/80 shrink-0">
            {icon}
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border uppercase ${badgeColor}`}
              >
                {categoryLabel}
              </span>
              {feedback.detected_domain && (
                <span className="text-[11px] font-mono text-muted-foreground">
                  Detected: {feedback.detected_domain}
                </span>
              )}
            </div>
            <h3 className="text-base sm:text-lg font-bold text-foreground">
              {feedback.headline}
            </h3>
          </div>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          className="text-xs text-muted-foreground hover:text-foreground p-1 rounded-lg border border-border/60 hover:bg-muted transition-colors cursor-pointer shrink-0"
        >
          ✕ Dismiss
        </button>
      </div>

      {/* Main Feedback Message */}
      <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
        {feedback.feedback_message}
      </p>

      {/* Clarifying Questions */}
      {feedback.clarifying_questions && feedback.clarifying_questions.length > 0 && (
        <div className="p-4 rounded-xl border border-border/60 bg-muted/30 space-y-2">
          <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <span>🎯</span>
            <span>Targeted Questions to Narrow Down Your Architecture:</span>
          </div>
          <ul className="space-y-1.5 text-xs text-muted-foreground">
            {feedback.clarifying_questions.map((q, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold shrink-0 font-mono">
                  Q{idx + 1}.
                </span>
                <span className="leading-normal">{q}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Suggested Template Box */}
      {feedback.suggested_template && (
        <div className="p-4 rounded-xl border border-border/60 bg-muted/20 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <span>✍️</span>
              <span>Suggested Technical Claim Starter:</span>
            </span>
            {onApplyTemplate && (
              <button
                type="button"
                onClick={() => onApplyTemplate(feedback.suggested_template!)}
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold rounded-lg shadow-sm transition-all cursor-pointer flex items-center gap-1"
              >
                <span>✨</span>
                <span>Use Starter Template</span>
              </button>
            )}
          </div>
          <div className="p-3 bg-background/80 rounded-lg border border-border/60 font-mono text-xs text-foreground/90 italic leading-relaxed">
            &ldquo;{feedback.suggested_template}&rdquo;
          </div>
        </div>
      )}
    </div>
  );
}
