"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  getSanitizedDraft,
  createMarketplaceListing,
  getMyMarketplaceListings,
  updateMarketplaceListing,
  deleteMarketplaceListing,
  type SanitizedListingDraft,
  type MarketplaceListingItem,
} from "@/lib/api";

interface MarketplaceListingModalProps {
  innovationId: string;
  token: string;
  onClose?: () => void;
  onListingUpdated?: (listing: MarketplaceListingItem | null) => void;
  isPathSelected?: boolean;
  onTogglePath?: () => void;
}

const STAGES = [
  { id: "concept", label: "Concept / Theory", desc: "Formulated architecture and theoretical validation" },
  { id: "detailed_design", label: "Detailed Design", desc: "Complete schematics, claim boundaries, and simulation data" },
  { id: "prototype", label: "Working Prototype", desc: "Functional bench prototype with benchmark results" },
  { id: "mvp", label: "Production MVP", desc: "Field-tested minimum viable product ready for pilot deployment" },
];

const AVAILABILITY_OPTIONS = [
  { id: "license", label: "Patent License", icon: "📜", desc: "Exclusive or non-exclusive royalty licensing" },
  { id: "sale", label: "Asset Sale", icon: "💼", desc: "Outright IP and source asset acquisition" },
  { id: "co_development", label: "Co-Development", icon: "🤝", desc: "Joint engineering partnership or custom adaptation" },
  { id: "investment", label: "Strategic Investment", icon: "📈", desc: "Equity or non-dilutive co-funding" },
];

export function MarketplaceListingModal({
  innovationId,
  token,
  onClose,
  onListingUpdated,
  isPathSelected,
  onTogglePath,
}: MarketplaceListingModalProps) {
  const [loading, setLoading] = useState(true);
  const [sanitizing, setSanitizing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [existingListing, setExistingListing] = useState<MarketplaceListingItem | null>(null);
  const [sanitizedDraft, setSanitizedDraft] = useState<SanitizedListingDraft | null>(null);

  // Form State
  const [publicTitle, setPublicTitle] = useState("");
  const [publicDescription, setPublicDescription] = useState("");
  const [domain, setDomain] = useState("Technology");
  const [stage, setStage] = useState("concept");
  const [availableFor, setAvailableFor] = useState<string[]>(["license", "co_development"]);
  const [preferredTerms, setPreferredTerms] = useState("");
  const [previewMode, setPreviewMode] = useState(false);

  // Load existing listing if any
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        const myListings = await getMyMarketplaceListings(token);
        const match = myListings.listings.find((l) => l.innovation_id === innovationId);

        if (isMounted && match) {
          setExistingListing(match);
          setPublicTitle(match.public_title);
          setPublicDescription(match.public_description);
          setDomain(match.domain || "Technology");
          setStage(match.stage || "concept");
          setAvailableFor(match.available_for || ["license", "co_development"]);
          setPreferredTerms(match.preferred_terms || "");
        } else if (isMounted) {
          // If no existing listing, auto-generate draft
          await handleGenerateDraft();
        }
      } catch (err: any) {
        if (isMounted) setError(err.message || "Failed to load listing details");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [innovationId, token]);

  const handleGenerateDraft = async () => {
    try {
      setSanitizing(true);
      setError(null);
      const res = await getSanitizedDraft(innovationId, token);
      setSanitizedDraft(res.draft);
      setPublicTitle(res.draft.public_title);
      setPublicDescription(res.draft.public_description);
      setDomain(res.draft.domain || "Technology");
      setStage(res.draft.suggested_stage || "concept");
      setAvailableFor(res.draft.suggested_availability || ["license", "co_development"]);
    } catch (err: any) {
      setError(err.message || "Failed to generate AI-sanitized summary");
    } finally {
      setSanitizing(false);
    }
  };

  const toggleAvailability = (optId: string) => {
    setAvailableFor((prev) =>
      prev.includes(optId) ? prev.filter((id) => id !== optId) : [...prev, optId]
    );
  };

  const handleSaveListing = async () => {
    if (!publicTitle.trim()) {
      setError("Public title is required.");
      return;
    }
    if (!publicDescription.trim() || publicDescription.trim().length < 20) {
      setError("Please provide a descriptive non-confidential public overview (min 20 chars).");
      return;
    }
    if (availableFor.length === 0) {
      setError("Please select at least one commercial availability model.");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccessMsg(null);

      const saved = await createMarketplaceListing(
        {
          innovation_id: innovationId,
          public_title: publicTitle.trim(),
          public_description: publicDescription.trim(),
          domain: domain.trim(),
          stage,
          available_for: availableFor,
          preferred_terms: preferredTerms.trim() || undefined,
          target_market: sanitizedDraft?.target_market,
          commercial_value_prop: sanitizedDraft?.commercial_value_prop,
          withheld_confidential_elements: sanitizedDraft?.withheld_confidential_elements,
        },
        token
      );

      setExistingListing(saved);
      setSuccessMsg("Confidential listing published to Marketplace successfully!");
      if (onListingUpdated) onListingUpdated(saved);
    } catch (err: any) {
      setError(err.message || "Failed to save marketplace listing");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!existingListing) return;
    try {
      setSaving(true);
      const newStatus = existingListing.status === "active" ? "paused" : "active";
      const updated = await updateMarketplaceListing(
        existingListing.id,
        { status: newStatus },
        token
      );
      setExistingListing(updated);
      setSuccessMsg(`Listing is now ${newStatus.toUpperCase()}`);
      if (onListingUpdated) onListingUpdated(updated);
    } catch (err: any) {
      setError(err.message || "Failed to update status");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteListing = async () => {
    if (!existingListing) return;
    if (!confirm("Are you sure you want to remove this listing from the marketplace?")) return;

    try {
      setSaving(true);
      await deleteMarketplaceListing(existingListing.id, token);
      setExistingListing(null);
      setSuccessMsg("Listing removed. Innovation returned to Private Vault.");
      if (onListingUpdated) onListingUpdated(null);
    } catch (err: any) {
      setError(err.message || "Failed to remove listing");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🤝</span>
            <h3 className="text-lg font-bold text-foreground">
              NDA-Gated Marketplace Listing
            </h3>
            <span className="text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
              Confidentiality Shield Active
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Publish an AI-sanitized public teaser. Proprietary mechanisms, claim boundaries, and source data stay confidential until a mutual NDA is signed.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onTogglePath !== undefined && (
            <Button
              type="button"
              variant="outline"
              onClick={onTogglePath}
              className={`text-xs h-8 px-3 border transition-all ${
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

          {existingListing && (
            <span
              className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                existingListing.status === "active"
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                  : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
              }`}
            >
              Status: {existingListing.status.toUpperCase()}
            </span>
          )}
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3.5 text-xs text-destructive flex items-center gap-2">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3.5 text-xs text-emerald-400 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span>✅</span>
            <span>{successMsg}</span>
          </div>
        </div>
      )}

      {/* Confidentiality Warning & Redaction Summary */}
      <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4 text-xs space-y-3">
        <div className="flex items-start gap-2.5">
          <span className="text-base text-cyan-400 shrink-0">🛡️</span>
          <div>
            <span className="font-semibold text-cyan-300">
              Rule 6 Guardrail (Confidentiality Protection):
            </span>{" "}
            <span className="text-muted-foreground">
              Public buyers will ONLY see the high-level operational problem, domain, and commercial engagement terms.
              Patent claim boundaries, mathematical equations, and raw implementation code remain private.
            </span>
          </div>
        </div>

        {sanitizedDraft?.withheld_confidential_elements &&
          sanitizedDraft.withheld_confidential_elements.length > 0 && (
            <div className="pt-2 border-t border-cyan-500/15">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                Automatically Withheld Proprietary Elements:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {sanitizedDraft.withheld_confidential_elements.map((elem, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 text-[11px] bg-background/80 border border-border text-foreground px-2 py-0.5 rounded-md"
                  >
                    <span className="text-red-400">🔒</span>
                    {elem}
                  </span>
                ))}
              </div>
            </div>
          )}
      </div>

      {/* Mode Toggle: Edit vs Public Buyer Preview */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPreviewMode(false)}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
              !previewMode
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            ✏️ Listing Configuration
          </button>
          <button
            type="button"
            onClick={() => setPreviewMode(true)}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
              previewMode
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            👁️ Buyer Teaser Preview
          </button>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={handleGenerateDraft}
          disabled={sanitizing || saving}
          className="text-xs h-8 text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/10"
        >
          {sanitizing ? "Sanitizing..." : "✨ Regenerate AI Summary"}
        </Button>
      </div>

      {/* Main Panel */}
      {loading ? (
        <div className="py-12 text-center text-xs text-muted-foreground">
          Loading marketplace listing data...
        </div>
      ) : previewMode ? (
        /* Buyer Teaser Preview Card */
        <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-lg">
          <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-3">
            <span className="text-xs text-muted-foreground font-mono">
              Marketplace Preview &bull; Public Catalog View
            </span>
            <span className="text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">
              Full Details Behind Mutual NDA
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-semibold bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full">
                {domain}
              </span>
              <span className="text-xs text-muted-foreground capitalize">
                Stage: {stage.replace("_", " ")}
              </span>
            </div>
            <h4 className="text-xl font-bold text-foreground">
              {publicTitle || "Untitled Technology"}
            </h4>
          </div>

          <p className="text-xs text-foreground/90 leading-relaxed whitespace-pre-wrap">
            {publicDescription}
          </p>

          {sanitizedDraft?.commercial_value_prop && (
            <div className="p-3 rounded-lg bg-muted/40 border border-border/60 text-xs">
              <span className="font-semibold text-foreground">Commercial Advantage:</span>{" "}
              <span className="text-muted-foreground">
                {sanitizedDraft.commercial_value_prop}
              </span>
            </div>
          )}

          <div className="pt-2 border-t border-border/40 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div>
              <span className="text-muted-foreground block text-[11px] mb-1">Available For:</span>
              <div className="flex flex-wrap gap-1.5">
                {availableFor.map((opt) => (
                  <span
                    key={opt}
                    className="capitalize text-[11px] bg-background border border-border px-2 py-0.5 rounded-md font-medium"
                  >
                    {opt.replace("_", " ")}
                  </span>
                ))}
              </div>
            </div>

            {preferredTerms && (
              <div className="text-right">
                <span className="text-muted-foreground block text-[11px] mb-0.5">Indicative Terms:</span>
                <span className="font-medium text-foreground text-xs">{preferredTerms}</span>
              </div>
            )}
          </div>

          <div className="rounded-lg bg-background border border-dashed border-border/80 p-3 text-center">
            <span className="text-xs text-muted-foreground">
              Interested corporate buyers will click <strong className="text-foreground">"Request Access (Sign Mutual NDA)"</strong> to initiate licensing discussions.
            </span>
          </div>
        </div>
      ) : (
        /* Configuration Form */
        <div className="space-y-4 text-xs">
          {/* Public Title */}
          <div>
            <label className="font-semibold text-foreground block mb-1">
              Public Non-Confidential Title
            </label>
            <input
              type="text"
              value={publicTitle}
              onChange={(e) => setPublicTitle(e.target.value)}
              placeholder="e.g., Autonomous Subterranean Navigation and Sensor Fusion Platform"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Domain & Stage */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-semibold text-foreground block mb-1">
                Domain / Industry
              </label>
              <input
                type="text"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="e.g., Robotics, Medical Devices, Clean Energy"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="font-semibold text-foreground block mb-1">
                Development Stage
              </label>
              <select
                value={stage}
                onChange={(e) => setStage(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                {STAGES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label} ({s.desc})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Commercial Availability Checkboxes */}
          <div>
            <label className="font-semibold text-foreground block mb-1.5">
              Available For Commercial Collaboration
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {AVAILABILITY_OPTIONS.map((opt) => {
                const checked = availableFor.includes(opt.id);
                return (
                  <button
                    type="button"
                    key={opt.id}
                    onClick={() => toggleAvailability(opt.id)}
                    className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-left transition-all ${
                      checked
                        ? "border-emerald-500/40 bg-emerald-500/10 text-foreground"
                        : "border-border/60 bg-background/50 text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <span className="text-base">{opt.icon}</span>
                    <div>
                      <div className="font-semibold text-foreground text-xs flex items-center gap-1.5">
                        <span>{opt.label}</span>
                        {checked && <span className="text-emerald-400 text-[10px]">✓ Selected</span>}
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                        {opt.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Public Description */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-semibold text-foreground">
                Sanitized Non-Confidential Overview
              </label>
              <span className="text-[11px] text-muted-foreground">
                Describe the problem and capability &bull; DO NOT disclose secret sauce
              </span>
            </div>
            <textarea
              rows={5}
              value={publicDescription}
              onChange={(e) => setPublicDescription(e.target.value)}
              placeholder="Describe the operational challenge, why existing solutions fail, and the high-level breakthrough..."
              className="w-full rounded-lg border border-border bg-background p-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500 leading-relaxed font-sans"
            />
          </div>

          {/* Preferred Terms */}
          <div>
            <label className="font-semibold text-foreground block mb-1">
              Preferred Commercial Terms &amp; Expectations (Optional)
            </label>
            <input
              type="text"
              value={preferredTerms}
              onChange={(e) => setPreferredTerms(e.target.value)}
              placeholder="e.g., Seeking non-exclusive royalty license ($50k upfront + 3.5% royalty); open to trial pilot"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>
      )}

      {/* Action Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-border/60">
        <div>
          {existingListing && (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleToggleStatus}
                disabled={saving}
                className="text-xs h-8 text-amber-400 hover:bg-amber-500/10"
              >
                {existingListing.status === "active" ? "⏸️ Pause Listing" : "▶️ Activate Listing"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDeleteListing}
                disabled={saving}
                className="text-xs h-8 text-destructive hover:bg-destructive/10"
              >
                🗑️ Remove
              </Button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onClose && (
            <Button size="sm" variant="outline" onClick={onClose} className="text-xs h-8">
              Close
            </Button>
          )}
          <Button
            size="sm"
            onClick={handleSaveListing}
            disabled={saving || sanitizing}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs h-8 shadow-sm"
          >
            {saving
              ? "Publishing..."
              : existingListing
              ? "💾 Update Marketplace Listing"
              : "🚀 Publish to Marketplace"}
          </Button>
        </div>
      </div>
    </div>
  );
}
