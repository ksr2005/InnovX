"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  DefensivePublication,
  getDefensivePublication,
  generateDefensivePublication,
  downloadDefensivePubPdf,
  downloadDefensivePubText,
} from "@/lib/api";

interface DefensivePublicationViewProps {
  innovationId: string;
  token: string;
  className?: string;
  isPathSelected?: boolean;
  onTogglePath?: () => void;
}

export function DefensivePublicationView({
  innovationId,
  token,
  className = "",
  isPathSelected,
  onTogglePath,
}: DefensivePublicationViewProps) {
  const [pub, setPub] = useState<DefensivePublication | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingText, setDownloadingText] = useState(false);
  const [copiedHash, setCopiedHash] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    getDefensivePublication(innovationId, token)
      .then((res) => {
        if (isMounted) {
          setPub(res.publication);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Failed to load defensive publication");
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
      const res = await generateDefensivePublication(innovationId, token);
      setPub(res.publication);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate defensive publication");
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    setError(null);
    try {
      await downloadDefensivePubPdf(innovationId, token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "PDF download failed");
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleDownloadText = async () => {
    setDownloadingText(true);
    setError(null);
    try {
      await downloadDefensivePubText(innovationId, token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Text download failed");
    } finally {
      setDownloadingText(false);
    }
  };

  const handleCopyHash = () => {
    if (pub) {
      navigator.clipboard.writeText(pub.publication_hash);
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 2500);
    }
  };

  const handleCopyFullText = () => {
    if (!pub) return;
    const text = `# ${pub.title}
SHA-256: ${pub.publication_hash}
Date (UTC): ${pub.timestamp}
CPC: ${pub.cpc_classes.join(", ")}

WARNING: ${pub.forfeiture_warning}

ABSTRACT:
${pub.abstract}

1. TECHNICAL FIELD:
${pub.technical_field}

2. BACKGROUND:
${pub.background}

3. DETAILED SPECIFICATION:
${pub.detailed_description.join("\n\n")}

4. EMBODIMENT VARIANTS:
${pub.embodiment_variants.join("\n")}

5. ADVANTAGES:
${pub.advantages.join("\n")}
`;
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2500);
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-border/80 bg-card p-12 text-center space-y-4">
        <div className="w-10 h-10 border-4 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin mx-auto" />
        <h3 className="text-sm font-semibold text-foreground">
          Formulating Defensive Publication Document...
        </h3>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
          Drafting enabling technical specifications in IBM Technical Disclosure Bulletin &amp; IP.com standards.
        </p>
      </div>
    );
  }

  if (error && !pub) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center space-y-4">
        <p className="text-xs text-destructive font-medium">{error}</p>
        <Button
          onClick={handleRegenerate}
          disabled={generating}
          className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold px-4 py-2"
        >
          {generating ? "Generating Publication..." : "Generate Defensive Publication"}
        </Button>
      </div>
    );
  }

  if (!pub) return null;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header Banner */}
      <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-cyan-500/10 via-card to-background p-6 sm:p-7 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <span>🌍</span>
                <span>Share Path • Day 17</span>
              </span>
              <span className="text-xs text-muted-foreground font-mono">
                IBM TDB &amp; IP.com Standard
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Defensive Technical Publication Generator
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-2xl">
              Establish immediate, unassailable prior art to permanently protect your Freedom to Operate (FTO) and prevent competitor patent blockades.
            </p>
          </div>

          {/* Action Export Buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
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
              onClick={handleCopyFullText}
              variant="outline"
              className="text-xs h-9 border-border/80 hover:bg-muted"
            >
              {copiedText ? (
                <>
                  <svg className="w-3.5 h-3.5 mr-1.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                  Copy Text
                </>
              )}
            </Button>

            <Button
              onClick={handleDownloadText}
              disabled={downloadingText}
              variant="outline"
              className="text-xs h-9 border-border/80 hover:bg-muted"
            >
              <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Markdown (.md)
            </Button>

            <Button
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
              className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold h-9 px-4 shadow-sm"
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
                  Download PDF
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Cryptographic Hash Bar */}
        <div className="mt-5 p-3 rounded-xl bg-background/80 border border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="text-emerald-400 font-bold shrink-0">SHA-256:</span>
            <span className="font-mono text-[11px] text-muted-foreground truncate" title={pub.publication_hash}>
              {pub.publication_hash}
            </span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="text-[11px] text-muted-foreground font-mono">
              {pub.timestamp.slice(0, 19).replace("T", " ")} UTC
            </span>
            <button
              type="button"
              onClick={handleCopyHash}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold"
            >
              {copiedHash ? "Copied Hash!" : "Copy Hash"}
            </button>
          </div>
        </div>

        {/* Mandatory IP Forfeiture Warning */}
        <div className="mt-4 p-3.5 rounded-xl bg-red-500/10 border border-red-500/25 flex items-start gap-2.5 text-xs text-red-300 leading-relaxed">
          <span className="text-base shrink-0">⚠️</span>
          <div>
            <strong className="font-semibold text-red-200">Statutory Patent Forfeiture Warning:</strong>{" "}
            Publishing this technical disclosure establishes permanent, public prior art. In absolute novelty jurisdictions (including the European Patent Office, China, Japan, and the UK), publishing forfeits any future patent rights for both you and competitors. This is deliberate: it ensures permanent, open freedom to operate for the public domain.
          </div>
        </div>
      </div>

      {/* Main Document Content */}
      <div className="rounded-xl border border-border/70 bg-card p-6 sm:p-8 space-y-6 shadow-sm">
        {/* Title & Classification */}
        <div className="border-b border-border/50 pb-5 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold tracking-wider text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded">
              Prior Art Disclosure
            </span>
            <div className="flex flex-wrap gap-1.5">
              {pub.cpc_classes.map((cpc, i) => (
                <span key={i} className="text-[10px] font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
                  {cpc}
                </span>
              ))}
            </div>
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-foreground tracking-tight">
            {pub.title}
          </h3>
        </div>

        {/* Abstract */}
        <div className="p-4 rounded-xl bg-background/60 border border-border/50 space-y-1.5">
          <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Abstract</h4>
          <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed">
            {pub.abstract}
          </p>
        </div>

        {/* Technical Field */}
        <div className="space-y-1.5">
          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            1. Technical Field
          </h4>
          <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed">
            {pub.technical_field}
          </p>
        </div>

        {/* Background & Deficiencies */}
        <div className="space-y-1.5">
          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            2. Background &amp; Prior Art Deficiencies
          </h4>
          <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed whitespace-pre-line">
            {pub.background}
          </p>
        </div>

        {/* Detailed Enabling Specification */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            3. Detailed Enabling Specification
          </h4>
          <div className="space-y-2.5">
            {pub.detailed_description.map((sec, idx) => (
              <div key={idx} className="p-3.5 rounded-lg bg-background border border-border/40 text-xs sm:text-sm text-foreground/90 leading-relaxed">
                {sec}
              </div>
            ))}
          </div>
        </div>

        {/* Embodiment Variants (Design-Around Prevention) */}
        <div className="space-y-3 p-5 rounded-xl bg-cyan-500/5 border border-cyan-500/20">
          <div className="flex items-center gap-2">
            <span className="text-base">🛡️</span>
            <h4 className="text-xs font-bold text-cyan-300 uppercase tracking-wider">
              4. Alternative Embodiments &amp; Structural Variants (Design-Around Deterrence)
            </h4>
          </div>
          <p className="text-xs text-muted-foreground">
            Disclosing these secondary implementations ensures competitors cannot bypass this disclosure with minor modifications:
          </p>
          <ul className="space-y-2 text-xs sm:text-sm text-foreground/90">
            {pub.embodiment_variants.map((v, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-cyan-400 font-bold">•</span>
                <span>{v}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Advantages */}
        <div className="space-y-2.5">
          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            5. Technical Advantages &amp; Utility
          </h4>
          <ul className="space-y-2 text-xs sm:text-sm text-foreground/90">
            {pub.advantages.map((adv, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>{adv}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Recognized Registries Directory */}
      <div className="rounded-xl border border-border/70 bg-card p-6 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <span>🌐</span>
            <span>Recognized Defensive Publication Registries</span>
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Submit your downloaded Markdown or PDF to these registries to ensure indexing by global patent examination offices:
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {pub.submission_portals.map((portal, idx) => (
            <div key={idx} className="p-4 rounded-xl bg-background border border-border/50 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <h4 className="text-xs font-bold text-foreground">{portal.name}</h4>
                  <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded">
                    {portal.cost_info}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {portal.description}
                </p>
              </div>

              <div className="flex items-center justify-between gap-2 border-t border-border/40 pt-2.5 text-[11px]">
                <span className="text-muted-foreground">Indexing: {portal.indexing_speed}</span>
                <a
                  href={portal.portal_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-cyan-400 hover:text-cyan-300 font-semibold underline flex items-center gap-1"
                >
                  <span>Portal Link</span>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
