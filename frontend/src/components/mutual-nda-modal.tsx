"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth-context";
import { requestListingAccess, type MarketplaceListingItem } from "@/lib/api";

interface MutualNdaModalProps {
  listing: MarketplaceListingItem;
  token: string;
  onClose: () => void;
  onRequestSubmitted: () => void;
}

export function MutualNdaModal({
  listing,
  token,
  onClose,
  onRequestSubmitted,
}: MutualNdaModalProps) {
  const { user } = useAuth();
  const [signerName, setSignerName] = useState(
    user?.user_metadata?.full_name || user?.email?.split("@")[0] || ""
  );
  const [organization, setOrganization] = useState("");
  const [intendedUse, setIntendedUse] = useState("Commercial Licensing Evaluation");
  const [hasAgreed, setHasAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasAgreed) {
      setError("You must acknowledge and accept the Mutual NDA terms before proceeding.");
      return;
    }
    if (!signerName.trim()) {
      setError("Signer name is required for digital execution.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await requestListingAccess(listing.id, token, {
        organization: organization.trim() || undefined,
        intended_use: intendedUse.trim(),
      });
      onRequestSubmitted();
    } catch (err: any) {
      setError(err.message || "Failed to submit NDA access request.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-6">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Modal Header */}
        <div className="border-b border-border/60 pb-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">📜</span>
            <h3 className="text-xl font-bold text-foreground">
              Mutual Non-Disclosure Agreement (NDA)
            </h3>
            <span className="text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
              Standard Tech Transfer Form
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Gated access to full patent claim boundaries, proprietary algorithms, and architectural specifications for{" "}
            <span className="text-foreground font-semibold">"{listing.public_title}"</span>.
          </p>
        </div>

        {error && (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3.5 text-xs text-destructive flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Legal Text Scroll Container */}
        <div className="rounded-xl border border-border bg-background p-4 text-[11px] leading-relaxed text-muted-foreground max-h-56 overflow-y-auto font-mono space-y-3">
          <p className="font-bold text-foreground uppercase tracking-wide">
            STANDARD MUTUAL CONFIDENTIALITY AND NON-DISCLOSURE AGREEMENT
          </p>
          <p>
            This Mutual Non-Disclosure Agreement ("Agreement") is executed by and between the verified Disclosing
            Creator ("Discloser") and the undersigned requesting entity or individual ("Recipient"), collectively
            the "Parties", via the InnovX Intellectual Property Commercialization Platform.
          </p>
          <p>
            <strong className="text-foreground">1. Definition of Confidential Information:</strong> Confidential
            Information includes all unpublished technical specifications, patent claim outlines, algorithmic logic,
            flowcharts, mathematical formulations, software source files, hardware component lists, and benchmark
            measurements associated with Innovation ID: <code>{listing.innovation_id}</code>.
          </p>
          <p>
            <strong className="text-foreground">2. Permitted Purpose:</strong> Recipient agrees to utilize the
            Confidential Information solely for evaluating potential commercial collaboration, patent licensing,
            technology acquisition, or joint development ("Permitted Purpose").
          </p>
          <p>
            <strong className="text-foreground">3. Duty of Non-Disclosure:</strong> Recipient shall maintain the
            confidentiality of the Discloser's information with at least the same degree of care utilized to protect its
            own proprietary assets, but no less than reasonable care. Recipient shall not reverse-engineer,
            decompile, or file patent applications incorporating any element disclosed herein.
          </p>
          <p>
            <strong className="text-foreground">4. Non-Circumvention:</strong> Recipient covenants not to circumvent the
            Discloser by developing, commercializing, or deploying identical or substantially derivative solutions
            derived from the confidential disclosure.
          </p>
          <p>
            <strong className="text-foreground">5. Term:</strong> The obligations of confidentiality hereunder shall
            remain in effect for a period of three (3) years from the timestamp of digital execution.
          </p>
        </div>

        {/* Digital Signature & Intended Purpose Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-semibold text-foreground block mb-1">
                Authorized Signer Full Name *
              </label>
              <input
                type="text"
                required
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                placeholder="e.g., Dr. Jane Doe"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="font-semibold text-foreground block mb-1">
                Organization / Company / Fund (Optional)
              </label>
              <input
                type="text"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                placeholder="e.g., Apex Ventures / TechCorp R&D"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-foreground block mb-1">
              Intended Commercial Purpose / Evaluation Scope
            </label>
            <select
              value={intendedUse}
              onChange={(e) => setIntendedUse(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="Commercial Licensing Evaluation">Commercial Licensing Evaluation</option>
              <option value="Asset Acquisition Due Diligence">Outright Asset / Patent Acquisition Due Diligence</option>
              <option value="Joint Engineering Co-Development">Joint Engineering Co-Development Evaluation</option>
              <option value="Strategic Seed / Growth Investment">Strategic Seed / Growth Investment Review</option>
            </select>
          </div>

          {/* Mandatory Checkbox */}
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 flex items-start gap-3">
            <input
              type="checkbox"
              id="nda-checkbox"
              checked={hasAgreed}
              onChange={(e) => setHasAgreed(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-border accent-emerald-600 focus:ring-emerald-500 cursor-pointer"
            />
            <label htmlFor="nda-checkbox" className="text-xs text-foreground/90 cursor-pointer leading-relaxed">
              <strong className="text-emerald-400">Digital Execution &amp; Consent:</strong> I acknowledge that I am
              authorized to bind myself or my organization to the confidentiality duties herein. I understand that
              unauthorized disclosure or competitive circumvention triggers statutory remedies under the Uniform Trade
              Secrets Act and international IP law.
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/60">
            <Button type="button" variant="outline" onClick={onClose} className="text-xs">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!hasAgreed || submitting}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-sm flex items-center gap-1.5"
            >
              {submitting ? "Signing & Submitting..." : "✍️ Execute Mutual NDA & Submit Request"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
