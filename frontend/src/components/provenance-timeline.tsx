"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  getInnovationProvenance,
  verifyInnovationChain,
  createInnovationVersion,
  type ProvenanceChainResponse,
  type ChainVerificationResponse,
} from "@/lib/api";

interface ProvenanceTimelineProps {
  innovationId: string;
  token: string;
  currentTitle: string;
  onVersionCreated?: () => void;
}

export function ProvenanceTimeline({
  innovationId,
  token,
  currentTitle,
  onVersionCreated,
}: ProvenanceTimelineProps) {
  const [data, setData] = useState<ProvenanceChainResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Verification state
  const [verifying, setVerifying] = useState(false);
  const [auditResult, setAuditResult] = useState<ChainVerificationResponse | null>(null);
  const [showAuditModal, setShowAuditModal] = useState(false);

  // New Revision state
  const [showNewRevisionModal, setShowNewRevisionModal] = useState(false);
  const [revisionText, setRevisionText] = useState("");
  const [revisionTitle, setRevisionTitle] = useState(currentTitle);
  const [creatingRevision, setCreatingRevision] = useState(false);
  const [revisionError, setRevisionError] = useState<string | null>(null);

  // Copied hash state
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const fetchTimeline = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getInnovationProvenance(innovationId, token);
      setData(res);
      // Pre-fill revision text from latest snapshot if available
      if (res.records.length > 0) {
        const latest = res.records[res.records.length - 1];
        setRevisionText(String(latest.snapshot?.raw_input || ""));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load provenance chain");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (innovationId && token) {
      fetchTimeline();
    }
  }, [innovationId, token]);

  const handleVerify = async () => {
    setVerifying(true);
    try {
      const res = await verifyInnovationChain(innovationId, token);
      setAuditResult(res);
      setShowAuditModal(true);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setVerifying(false);
    }
  };

  const handleCreateRevision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revisionText.trim()) return;

    setCreatingRevision(true);
    setRevisionError(null);
    try {
      await createInnovationVersion(
        innovationId,
        {
          raw_input: revisionText,
          title: revisionTitle,
        },
        token
      );
      setShowNewRevisionModal(false);
      await fetchTimeline();
      if (onVersionCreated) onVersionCreated();
    } catch (err) {
      setRevisionError(err instanceof Error ? err.message : "Failed to create revision");
    } finally {
      setCreatingRevision(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(text);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  if (loading) {
    return (
      <div className="p-8 text-center space-y-3">
        <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
        <p className="text-xs text-muted-foreground">Auditing cryptographic provenance chain...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive text-center">
        {error}
      </div>
    );
  }

  const records = data?.records || [];

  return (
    <div className="space-y-6">
      {/* Top Header & Audit Controls */}
      <div className="rounded-2xl border border-border/70 bg-card p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                SHA-256 HASH CHAIN
              </span>
              <span className="text-xs text-muted-foreground">
                {records.length} {records.length === 1 ? "Version" : "Versions"} Recorded
              </span>
            </div>
            <h3 className="text-lg font-bold text-foreground mt-1">Cryptographic Audit Timeline</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Each version is linked to its ancestor by SHA-256 digest, providing tamper-evident proof of prior creation.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={handleVerify}
              disabled={verifying}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition-all"
            >
              {verifying ? (
                <>
                  <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent mr-1.5" />
                  Auditing Chain...
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  Verify Integrity
                </>
              )}
            </Button>

            <Button
              variant="outline"
              onClick={() => setShowNewRevisionModal(true)}
              className="text-xs font-medium border-border/80 hover:bg-muted"
            >
              + New Revision
            </Button>
          </div>
        </div>

        {/* Status Badge */}
        <div className="mt-4 pt-4 border-t border-border/50 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-emerald-400">
              {data?.is_chain_intact ? "Chain Integrity: 100% Intact" : "Chain Integrity: Compromised"}
            </span>
          </div>
          {data?.latest_hash && (
            <div className="flex items-center gap-1.5 text-muted-foreground font-mono text-[11px]">
              <span>Latest Hash:</span>
              <span className="text-foreground font-semibold">{data.latest_hash.slice(0, 12)}...{data.latest_hash.slice(-6)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Timeline Steps */}
      <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-border/60">
        {records.map((rec, idx) => {
          const isGenesis = rec.version === 1;
          const isLatest = idx === records.length - 1;

          return (
            <div key={rec.id} className="relative group">
              {/* Timeline Node Dot */}
              <div
                className={`absolute -left-6 sm:-left-8 top-1.5 h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all ${
                  isLatest
                    ? "bg-emerald-500 border-emerald-400 text-white shadow-sm shadow-emerald-500/20"
                    : "bg-card border-border text-muted-foreground"
                }`}
              >
                <span className="text-[10px] font-bold font-mono">v{rec.version}</span>
              </div>

              {/* Version Card */}
              <div className="rounded-xl border border-border/70 bg-card p-5 shadow-sm transition-all hover:border-emerald-500/40">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full font-mono ${
                        isGenesis
                          ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                          : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      }`}
                    >
                      {isGenesis ? "Genesis Record (v1)" : `Revision (v${rec.version})`}
                    </span>
                    {isLatest && (
                      <span className="text-[10px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded">
                        Current Head
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground font-mono">
                    {new Date(rec.created_at).toLocaleString()}
                  </span>
                </div>

                {/* Hashes Grid */}
                <div className="space-y-2 bg-background p-3 rounded-lg border border-border/50 text-xs font-mono">
                  <div>
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
                      <span>Document SHA-256 Hash</span>
                      <button
                        onClick={() => copyToClipboard(rec.document_hash)}
                        className="text-emerald-400 hover:text-emerald-300 font-sans text-[11px] transition-colors"
                      >
                        {copiedHash === rec.document_hash ? "✓ Copied" : "Copy Hash"}
                      </button>
                    </div>
                    <div className="p-2 rounded bg-card/60 border border-border/40 text-emerald-400 break-all select-all text-[11px]">
                      {rec.document_hash}
                    </div>
                  </div>

                  <div>
                    <div className="text-[11px] text-muted-foreground mb-1">
                      <span>Previous Version Link</span>
                    </div>
                    <div className="p-2 rounded bg-card/60 border border-border/40 text-muted-foreground break-all text-[11px] flex items-center gap-1.5">
                      {isGenesis ? (
                        <span>None (Genesis Block)</span>
                      ) : (
                        <>
                          <span className="text-emerald-400">🔗</span>
                          <span>{rec.previous_hash}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Idea Snapshot Preview */}
                {Boolean(rec.snapshot?.raw_input) && (
                  <div className="mt-3 pt-3 border-t border-border/40">
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                      Innovation State at v{rec.version}
                    </p>
                    <p className="text-xs text-foreground/90 line-clamp-2 leading-relaxed">
                      {String(rec.snapshot.raw_input)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Audit Modal */}
      {showAuditModal && auditResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-xl rounded-2xl border border-border/80 bg-card p-6 shadow-2xl space-y-5">
            <button
              onClick={() => setShowAuditModal(false)}
              className="absolute right-4 top-4 rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              ✕
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">Cryptographic Audit Certificate</h3>
                <p className="text-xs text-muted-foreground">
                  Audited at {new Date(auditResult.verified_at).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-background border border-border/60 space-y-2 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Chain Status:</span>
                <span className="font-bold text-emerald-400">
                  {auditResult.is_valid ? "SEALED & VERIFIED" : "VERIFICATION FAILED"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Versions:</span>
                <span className="text-foreground">{auditResult.total_versions}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Genesis Hash:</span>
                <span className="text-foreground">{auditResult.genesis_hash ? auditResult.genesis_hash.slice(0, 16) + "..." : "None"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Latest Hash:</span>
                <span className="text-foreground">{auditResult.latest_hash ? auditResult.latest_hash.slice(0, 16) + "..." : "None"}</span>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Audit Verification Trail
              </p>
              <div className="p-3 rounded-lg bg-background border border-border/40 font-mono text-xs space-y-1 max-h-48 overflow-y-auto">
                {auditResult.audit_log.map((log, i) => (
                  <div
                    key={i}
                    className={
                      log.startsWith("[OK]")
                        ? "text-emerald-400"
                        : log.startsWith("[FAIL]")
                        ? "text-destructive font-bold"
                        : "text-muted-foreground"
                    }
                  >
                    {log}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-border/40">
              <Button
                onClick={() => setShowAuditModal(false)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
              >
                Close Audit Report
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* New Revision Modal */}
      {showNewRevisionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-xl rounded-2xl border border-border/80 bg-card p-6 shadow-2xl space-y-5">
            <button
              onClick={() => setShowNewRevisionModal(false)}
              className="absolute right-4 top-4 rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              ✕
            </button>

            <div>
              <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                VERSION v{records.length + 1}
              </span>
              <h3 className="text-lg font-bold text-foreground mt-2">Append New Revision</h3>
              <p className="text-xs text-muted-foreground">
                Creates a new tamper-evident version in the hash chain linked to Document Hash{" "}
                <span className="font-mono text-emerald-400">{data?.latest_hash?.slice(0, 10)}...</span>
              </p>
            </div>

            {revisionError && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive text-center">
                {revisionError}
              </div>
            )}

            <form onSubmit={handleCreateRevision} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Revision Title
                </label>
                <input
                  type="text"
                  required
                  value={revisionTitle}
                  onChange={(e) => setRevisionTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Updated Technical Description / Raw Text
                </label>
                <textarea
                  required
                  rows={6}
                  value={revisionText}
                  onChange={(e) => setRevisionText(e.target.value)}
                  placeholder="Describe your updated technical features, parameters, or prototypes..."
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-y"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowNewRevisionModal(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={creatingRevision}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
                >
                  {creatingRevision ? "Computing Hash & Chaining..." : "Commit Revision v" + (records.length + 1)}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
