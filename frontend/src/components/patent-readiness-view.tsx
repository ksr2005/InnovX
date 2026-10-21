"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  PatentPrepPackage,
  getPatentPrepPackage,
  generatePatentPrepPackage,
  downloadPatentPrepPdf,
} from "@/lib/api";

interface PatentReadinessViewProps {
  innovationId: string;
  token: string;
  className?: string;
  isPathSelected?: boolean;
  onTogglePath?: () => void;
}

export function PatentReadinessView({
  innovationId,
  token,
  className = "",
  isPathSelected,
  onTogglePath,
}: PatentReadinessViewProps) {
  const [pkg, setPkg] = useState<PatentPrepPackage | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"spec" | "claims" | "gaps" | "fees" | "checklist">("spec");
  const [selectedJurisdiction, setSelectedJurisdiction] = useState<string>("uspto");
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    getPatentPrepPackage(innovationId, token)
      .then((res) => {
        if (isMounted) {
          setPkg(res.package);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Failed to load patent preparation package");
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [innovationId, token]);

  const handleRegenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await generatePatentPrepPackage(innovationId, token);
      setPkg(res.package);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate patent package");
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    setError(null);
    try {
      await downloadPatentPrepPdf(innovationId, token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed");
    } finally {
      setDownloadingPdf(false);
    }
  };

  const toggleChecklist = (itemId: string) => {
    setCheckedItems((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-border/80 bg-card p-12 text-center space-y-4">
        <div className="w-10 h-10 border-4 border-amber-500/30 border-t-amber-400 rounded-full animate-spin mx-auto" />
        <h3 className="text-sm font-semibold text-foreground">
          Loading Patent Readiness Package...
        </h3>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
          Analyzing technical features, claim boundaries, and calculating official jurisdiction filing fees.
        </p>
      </div>
    );
  }

  if (error && !pkg) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center space-y-4">
        <p className="text-xs text-destructive font-medium">{error}</p>
        <Button
          onClick={handleRegenerate}
          disabled={generating}
          className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold px-4 py-2"
        >
          {generating ? "Generating Package..." : "Generate Patent Prep Package"}
        </Button>
      </div>
    );
  }

  if (!pkg) return null;

  const currentJur = pkg.jurisdictions[selectedJurisdiction] || pkg.jurisdictions["uspto"];

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header Banner */}
      <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-card to-background p-6 sm:p-7 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <span>🛡️</span>
                <span>Protect Path • Day 16</span>
              </span>
              <span className="text-xs text-muted-foreground font-mono">
                12-Month Priority Window
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Provisional Patent Application Preparation Package
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-2xl">
              AI-assisted drafting outlines, claim boundary guidance, prior-art gap analysis, and statutory fee breakdowns.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {onTogglePath !== undefined && (
              <Button
                type="button"
                variant="outline"
                onClick={onTogglePath}
                className={`text-xs h-9 px-3 border transition-all ${
                  isPathSelected
                    ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/25"
                    : "border-border/80 hover:bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {isPathSelected ? (
                  <>
                    <span className="text-emerald-400 font-bold mr-1.5">✓</span>
                    <span>Active in Strategy</span>
                  </>
                ) : (
                  <>
                    <span className="text-muted-foreground mr-1.5">+</span>
                    <span>Add to Strategy</span>
                  </>
                )}
              </Button>
            )}

            <Button
              onClick={handleRegenerate}
              disabled={generating}
              variant="outline"
              className="text-xs h-9 border-border/80 hover:bg-muted"
            >
              {generating ? (
                <>
                  <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent mr-1.5" />
                  Regenerating...
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Re-Analyze
                </>
              )}
            </Button>

            <Button
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
              className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold h-9 px-4 shadow-sm"
            >
              {downloadingPdf ? (
                <>
                  <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent mr-1.5" />
                  Generating PDF...
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download Prep PDF
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Mandatory Legal Notice */}
        <div className="mt-5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-2.5 text-xs text-amber-300 leading-relaxed">
          <span className="text-base shrink-0">⚠️</span>
          <div>
            <strong className="font-semibold text-amber-200">Legal Disclaimer:</strong>{" "}
            This preparation package provides educational drafting assistance and analytical guidance. It does NOT constitute legal advice or formal representation. InnovX does not file patents. Always review your draft with a registered patent attorney or agent prior to legal submission.
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-border/60 gap-2 text-xs font-semibold overflow-x-auto pb-0.5">
        <button
          type="button"
          onClick={() => setActiveTab("spec")}
          className={`pb-2.5 px-3 flex items-center gap-1.5 transition-all whitespace-nowrap ${
            activeTab === "spec"
              ? "border-b-2 border-amber-400 text-amber-400 font-bold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <span>📋</span>
          <span>Drafting Specification</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("claims")}
          className={`pb-2.5 px-3 flex items-center gap-1.5 transition-all whitespace-nowrap ${
            activeTab === "claims"
              ? "border-b-2 border-amber-400 text-amber-400 font-bold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <span>🎯</span>
          <span>Claim Boundaries ({pkg.suggested_claim_boundaries.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("gaps")}
          className={`pb-2.5 px-3 flex items-center gap-1.5 transition-all whitespace-nowrap ${
            activeTab === "gaps"
              ? "border-b-2 border-amber-400 text-amber-400 font-bold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <span>🔍</span>
          <span>Prior Art Gaps ({pkg.prior_art_gaps.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("fees")}
          className={`pb-2.5 px-3 flex items-center gap-1.5 transition-all whitespace-nowrap ${
            activeTab === "fees"
              ? "border-b-2 border-amber-400 text-amber-400 font-bold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <span>💰</span>
          <span>Filing Fee Calculator</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("checklist")}
          className={`pb-2.5 px-3 flex items-center gap-1.5 transition-all whitespace-nowrap ${
            activeTab === "checklist"
              ? "border-b-2 border-amber-400 text-amber-400 font-bold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <span>⏱️</span>
          <span>12-Month Checklist</span>
        </button>
      </div>

      {/* Tab 1: Drafting Specification */}
      {activeTab === "spec" && (
        <div className="space-y-5 animate-in fade-in duration-150">
          <div className="rounded-xl border border-border/70 bg-card p-5 space-y-3">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <span className="text-amber-400">1.</span>
              <span>Technical Field &amp; Suggested CPC Classes</span>
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {pkg.technical_field}
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {pkg.suggested_cpc_classes.map((cpc, i) => (
                <span
                  key={i}
                  className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full"
                >
                  {cpc}
                </span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="rounded-xl border border-border/70 bg-card p-5 space-y-2">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <span className="text-amber-400">2.</span>
                <span>Background &amp; Problem Framing</span>
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
                {pkg.background_art}
              </p>
            </div>

            <div className="rounded-xl border border-border/70 bg-card p-5 space-y-2">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <span className="text-amber-400">3.</span>
                <span>Summary of the Invention</span>
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
                {pkg.invention_summary}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-border/70 bg-card p-5 space-y-3">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <span className="text-amber-400">4.</span>
              <span>Detailed Specification Outline (35 U.S.C. § 112 Enablement)</span>
            </h3>
            <p className="text-xs text-muted-foreground">
              Organize your provisional written description using this structural hierarchy:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {pkg.detailed_spec_outline.map((sec, idx) => (
                <div key={idx} className="p-3 rounded-lg bg-background border border-border/50 text-xs">
                  <span className="font-semibold text-foreground">{sec}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5 space-y-3">
            <h3 className="text-sm font-bold text-amber-300 flex items-center gap-2">
              <span>🛡️</span>
              <span>Embodiment Variations (Design-Around Prevention)</span>
            </h3>
            <p className="text-xs text-muted-foreground">
              Disclosing secondary configurations in your provisional locks in early priority for broader variations:
            </p>
            <ul className="space-y-2 text-xs text-foreground/90">
              {pkg.embodiment_variations.map((v, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-amber-400 font-bold">•</span>
                  <span>{v}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Tab 2: Suggested Claim Boundaries */}
      {activeTab === "claims" && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="p-3 rounded-xl bg-card border border-border/60 text-xs text-muted-foreground">
            <strong>Strategic Claim Architecture:</strong> While provisional applications do not require legal claims at filing, drafting tentative claim boundaries ensures full statutory enablement and prevents scope disputes when converting to a non-provisional application within 12 months.
          </div>

          {pkg.suggested_claim_boundaries.map((cb, idx) => (
            <div key={idx} className="rounded-xl border border-border/70 bg-card p-5 space-y-3 shadow-xs">
              <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                    Boundary #{idx + 1}
                  </span>
                  <h4 className="text-sm font-bold text-foreground">{cb.category}</h4>
                </div>
              </div>

              <div>
                <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                  Suggested Target Focus
                </span>
                <p className="text-xs font-medium text-foreground mt-0.5">{cb.suggested_focus}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="bg-background p-3 rounded-lg border border-border/50">
                  <span className="text-[10px] text-emerald-400 uppercase font-semibold block mb-1">
                    Novel Elements to Recite
                  </span>
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    {cb.novel_elements.map((elem, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-emerald-400">✓</span>
                        <span>{elem}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-background p-3 rounded-lg border border-border/50">
                  <span className="text-[10px] text-amber-400 uppercase font-semibold block mb-1">
                    Dependent Fallback Limitations
                  </span>
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    {cb.potential_fallbacks.map((fb, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-amber-400">•</span>
                        <span>{fb}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-muted/40 border border-border/40 text-[11px] text-muted-foreground italic">
                <strong className="font-semibold text-foreground not-italic">Attorney Guidance:</strong> {cb.attorney_notes}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 3: Prior Art Gaps */}
      {activeTab === "gaps" && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="p-3 rounded-xl bg-card border border-border/60 text-xs text-muted-foreground">
            <strong>Prior Art Departure Points:</strong> To establish patentable novelty and non-obviousness under 35 U.S.C. 102/103, emphasize these precise technical differences when drafting your specification.
          </div>

          <div className="space-y-3">
            {pkg.prior_art_gaps.map((gap, idx) => (
              <div key={idx} className="rounded-xl border border-border/70 bg-card p-5 space-y-3">
                <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                      {gap.feature_id}
                    </span>
                    <h4 className="text-xs font-bold text-foreground">{gap.feature_description}</h4>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="bg-background p-3 rounded-lg border border-border/40">
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold block mb-0.5">
                      Closest Existing Prior Art
                    </span>
                    <p className="text-muted-foreground">{gap.closest_prior_art_reference}</p>
                  </div>

                  <div className="bg-background p-3 rounded-lg border border-border/40">
                    <span className="text-[10px] text-emerald-400 uppercase font-semibold block mb-0.5">
                      Invention Departure Point
                    </span>
                    <p className="text-foreground font-medium">{gap.key_differentiation}</p>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-[11px] text-emerald-300">
                  <strong className="font-semibold">Recommended Drafting Emphasis:</strong> {gap.recommended_drafting_emphasis}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Filing Fee Calculator */}
      {activeTab === "fees" && (
        <div className="space-y-5 animate-in fade-in duration-150">
          {/* Office Selector */}
          <div className="flex flex-wrap gap-2">
            {Object.keys(pkg.jurisdictions).map((k) => {
              const j = pkg.jurisdictions[k];
              const isSelected = selectedJurisdiction === k;
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => setSelectedJurisdiction(k)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all border ${
                    isSelected
                      ? "bg-amber-500/15 border-amber-500/40 text-amber-300 shadow-xs"
                      : "bg-card border-border/60 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {j.office_name.split("(")[0].trim()}
                </button>
              );
            })}
          </div>

          {/* Current Office Details */}
          <div className="rounded-xl border border-border/70 bg-card p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/40 pb-3">
              <div>
                <h3 className="text-base font-bold text-foreground">{currentJur.office_name}</h3>
                <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                  Standard Statutory Priority Window: {currentJur.timeline_months} Months
                </p>
              </div>

              <a
                href={currentJur.portal_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 underline font-semibold"
              >
                <span>Official Filing Portal: {currentJur.portal_name}</span>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>

            {/* Fee Tiers Table */}
            <div className="grid grid-cols-1 gap-3">
              {currentJur.fees.map((f, i) => (
                <div
                  key={i}
                  className="rounded-lg bg-background border border-border/60 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-foreground">{f.name}</span>
                      <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded font-mono">
                        {f.filing_route}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground max-w-lg">{f.qualification}</p>
                  </div>

                  <div className="text-left sm:text-right shrink-0">
                    <span className="text-lg font-bold text-amber-400 font-mono block">
                      {f.amount}
                    </span>
                    <span className="text-[10px] text-muted-foreground uppercase">
                      Government Statutory Fee
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-[11px] text-muted-foreground italic pt-2">
              * Note: These are government statutory filing fees. Patent attorney drafting and prosecution fees typically range from $1,500 – $4,000 for provisional applications depending on complexity.
            </p>
          </div>
        </div>
      )}

      {/* Tab 5: 12-Month Checklist */}
      {activeTab === "checklist" && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="p-3 rounded-xl bg-card border border-border/60 text-xs text-muted-foreground">
            <strong>Provisional Filing Execution Checklist:</strong> Check off each preparation deliverable before submitting to the patent office portal.
          </div>

          <div className="space-y-2.5">
            {pkg.filing_checklist.map((item) => {
              const isChecked = checkedItems[item.item_id] ?? item.completed ?? false;
              return (
                <div
                  key={item.item_id}
                  onClick={() => toggleChecklist(item.item_id)}
                  className={`cursor-pointer rounded-xl border p-4 transition-all flex items-start gap-3.5 ${
                    isChecked
                      ? "border-emerald-500/40 bg-emerald-500/5 text-foreground"
                      : "border-border/70 bg-card hover:border-border"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => {}}
                    className="mt-0.5 h-4 w-4 rounded border-border text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className={`text-xs font-bold ${isChecked ? "line-through text-muted-foreground" : "text-foreground"}`}>
                        {item.title}
                      </h4>
                      <span className="text-[10px] font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
                        {item.required_for}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
