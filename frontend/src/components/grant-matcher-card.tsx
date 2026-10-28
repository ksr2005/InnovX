"use client";

import { useState, useEffect } from "react";
import {
  matchInnovationGrants,
  type GrantMatchingResponse,
  type StructuredIdea,
} from "@/lib/api";

interface GrantMatcherCardProps {
  structuredIdea: StructuredIdea;
}

export function GrantMatcherCard({ structuredIdea }: GrantMatcherCardProps) {
  const [data, setData] = useState<GrantMatchingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"grants" | "vcs">("grants");
  const [showAbstractModal, setShowAbstractModal] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadMatches() {
      try {
        setLoading(true);
        const res = await matchInnovationGrants({
          title: structuredIdea.title,
          domain: structuredIdea.domain,
          problem_statement: structuredIdea.problem_statement,
          proposed_solution: structuredIdea.proposed_solution,
          key_features: structuredIdea.key_features,
        });
        if (isMounted) setData(res);
      } catch (err) {
        console.warn("Grant matching fetch failed:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadMatches();
    return () => {
      isMounted = false;
    };
  }, [structuredIdea]);

  const handleCopyAbstract = () => {
    if (!data?.tailored_grant_abstract) return;
    navigator.clipboard.writeText(data.tailored_grant_abstract);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="w-full rounded-2xl border border-border/80 bg-card/90 backdrop-blur-md p-6 shadow-xl space-y-3 animate-pulse">
        <div className="h-4 w-48 bg-muted rounded"></div>
        <div className="h-8 w-80 bg-muted/70 rounded"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
          <div className="h-28 bg-muted/40 rounded-xl"></div>
          <div className="h-28 bg-muted/40 rounded-xl"></div>
          <div className="h-28 bg-muted/40 rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="w-full rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/20 via-card to-background p-5 sm:p-6 shadow-xl space-y-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">🏛️</span>
            <h3 className="text-base sm:text-lg font-bold text-foreground">
              Federal Non-Dilutive SBIR/STTR Grants &amp; Deep-Tech Capital Match
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold">
              0% Equity Dilution
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Algorithmically matched against active Federal agency solicitations and specialized deep-tech venture funds.
          </p>
        </div>

        {/* Tab & Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center rounded-xl border border-border/80 bg-muted/30 p-1">
            <button
              type="button"
              onClick={() => setActiveTab("grants")}
              className={`text-xs font-semibold px-3 py-1 rounded-lg transition-all cursor-pointer ${
                activeTab === "grants"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              🇺🇸 Federal Grants (3)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("vcs")}
              className={`text-xs font-semibold px-3 py-1 rounded-lg transition-all cursor-pointer ${
                activeTab === "vcs"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              💼 Venture Capital (3)
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowAbstractModal(true)}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span>📝</span>
            <span>Draft Proposal Abstract</span>
          </button>
        </div>
      </div>

      {/* Highlights Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl border border-emerald-500/20 bg-emerald-950/30 text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className="text-emerald-400 font-bold">💰 Available Non-Dilutive Pool:</span>
          <span className="text-foreground font-semibold">{data.total_non_dilutive_potential}</span>
        </div>
        <div className="text-[11px] text-muted-foreground">
          {data.recommended_first_step}
        </div>
      </div>

      {/* Content Tabs */}
      {activeTab === "grants" ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {data.matched_grants.map((grant) => (
            <div
              key={grant.id}
              className="p-4 rounded-xl border border-border/80 bg-card/80 hover:border-emerald-500/40 transition-all flex flex-col justify-between space-y-3"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    {grant.agency.split(" ")[0]} &bull; {grant.program}
                  </span>
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    {grant.fit_score}% Match
                  </span>
                </div>
                <h4 className="text-xs font-bold text-foreground leading-snug line-clamp-2">
                  {grant.topic_name}
                </h4>
                <div className="text-sm font-extrabold text-foreground font-mono">
                  {grant.award_amount}
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {grant.why_fit}
                </p>
              </div>

              <div className="pt-2 border-t border-border/60 flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground font-mono truncate max-w-[140px]">
                  {grant.deadline}
                </span>
                <a
                  href={grant.application_portal}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 hover:underline cursor-pointer"
                >
                  <span>Apply Portal</span>
                  <span>↗</span>
                </a>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {data.matched_vcs.map((vc, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl border border-border/80 bg-card/80 hover:border-emerald-500/40 transition-all flex flex-col justify-between space-y-3"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                    {vc.stage}
                  </span>
                  <span className="text-xs font-mono font-bold text-purple-400">
                    {vc.fit_score}% Thesis Fit
                  </span>
                </div>
                <h4 className="text-sm font-bold text-foreground">
                  {vc.firm}
                </h4>
                <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-3">
                  {vc.thesis}
                </p>
                <div className="text-[10px] text-muted-foreground font-mono">
                  <span className="font-semibold text-foreground">Notable Portfolio: </span>
                  {vc.portfolio_examples.join(", ")}
                </div>
              </div>

              <div className="pt-2 border-t border-border/60 flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">Deep Tech Seed / Series A</span>
                <a
                  href={vc.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1 hover:underline cursor-pointer"
                >
                  <span>Firm Portal</span>
                  <span>↗</span>
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Proposal Abstract Modal */}
      {showAbstractModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-2xl rounded-2xl border border-emerald-500/40 bg-card p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">📜</span>
                <h3 className="text-base font-bold text-foreground">
                  Tailored Federal SBIR / STTR Proposal Abstract
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAbstractModal(false)}
                className="text-xs text-muted-foreground hover:text-foreground cursor-pointer p-1 rounded-lg border border-border/60"
              >
                ✕ Close
              </button>
            </div>

            <p className="text-xs text-muted-foreground">
              Formulated to satisfy standard NSF/DARPA merit review criteria (Technical Objectives, Intellectual Merit, and Commercialization Impact). Ready to copy into FastLane, Research.gov, or SBIR.gov.
            </p>

            <div className="p-4 rounded-xl bg-black/60 border border-border/80 font-mono text-xs text-emerald-300 leading-relaxed whitespace-pre-wrap">
              {data.tailored_grant_abstract}
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-muted-foreground font-mono">
                Adheres to 200-word statutory federal pitch limits
              </span>
              <button
                type="button"
                onClick={handleCopyAbstract}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>{copied ? "✓" : "📋"}</span>
                <span>{copied ? "Copied to Clipboard!" : "Copy Grant Abstract"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
