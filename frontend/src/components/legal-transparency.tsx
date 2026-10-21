"use client";

import React, { useState } from "react";

export function LegalTransparency() {
  const [activeDisclaimer, setActiveDisclaimer] = useState<string | null>("patent");

  const disclaimers = [
    {
      id: "patent",
      title: "1. Rule 1: Prior Art Density vs. Legal Patentability",
      badge: "Statutory Rule",
      icon: "⚖️",
      content:
        "InnovX computes statistical 'Prior Art Density' and 'Feature Novelty Signals' derived from 250M+ scientific and patent documents. InnovX does NOT issue legal patentability determinations or legal opinions. Patentability under 35 U.S.C. §§ 101, 102, 103, and 112 requires subjective human examination by a registered patent examiner or attorney licensed in your jurisdiction.",
    },
    {
      id: "evidence",
      title: "2. Rule 2: Evidence-Bound Zero Hallucination",
      badge: "Evidence Integrity",
      icon: "🔬",
      content:
        "Every prior-art match and similarity score produced by InnovX is strictly tethered to verbatim evidence sentences extracted from real papers in OpenAlex, arXiv preprints, or USPTO PatentsView grants. If an idea feature is genuinely novel and has no matching literature, InnovX transparently assigns a 0% coverage rating without hallucinating citations.",
    },
    {
      id: "privacy",
      title: "3. Rule 4: Private by Default Architecture",
      badge: "Confidentiality",
      icon: "🔒",
      content:
        "All ideas, technical structuring data, files, and reports are private by default, secured behind Supabase Row-Level Security (RLS) policies. Your technical descriptions are never added to public training corpora or made searchable by search engines. No third party can view your innovation unless you explicitly publish a sanitized NDA-gated marketplace listing.",
    },
    {
      id: "disclosure",
      title: "4. Rule 6: The Disclosure Paradox & Mutual NDA Shield",
      badge: "IP Preservation",
      icon: "🛡️",
      content:
        "Under international patent treaties (such as the European Patent Convention Art. 54 and Chinese Patent Law), launching or publishing an idea destroys patent novelty worldwide immediately with zero grace period. InnovX protects creators through dual-sided digital Mutual NDAs and AI-sanitized teasers to explore commercial partnerships without risking foreign patent forfeiture.",
    },
    {
      id: "provenance",
      title: "5. Rule 5: Deterministic SHA-256 Provenance",
      badge: "Tamper Evidence",
      icon: "🔗",
      content:
        "InnovX establishes immutable proof of invention timing via chained SHA-256 cryptographic hashes and server-certified UTC timestamps. We do not use speculative blockchain networks, cryptocurrencies, or NFTs — our verification is 100% reproducible with standard open-source cryptographic toolchains.",
    },
  ];

  return (
    <section className="space-y-6 pt-6 pb-12 border-t border-border/60">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-[10px] font-mono uppercase font-bold tracking-wider text-muted-foreground bg-muted px-2.5 py-0.5 rounded">
            Legal Transparency &bull; Ethical AI Principles
          </span>
          <h3 className="text-lg font-bold text-foreground mt-1">
            Methodology, Privacy &amp; Statutory Disclaimers
          </h3>
        </div>
        <span className="text-xs text-muted-foreground font-mono">
          Compliant with USPTO, EPO &amp; WIPO Frameworks
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {disclaimers.map((item) => {
          const isSelected = activeDisclaimer === item.id;
          return (
            <div
              key={item.id}
              onClick={() => setActiveDisclaimer(isSelected ? null : item.id)}
              className={`p-4 rounded-xl border transition-all cursor-pointer select-none ${
                isSelected
                  ? "border-emerald-500/40 bg-card shadow-sm"
                  : "border-border/60 bg-card/40 hover:border-border hover:bg-card/70"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-base">{item.icon}</span>
                  <h4 className="text-xs font-bold text-foreground">{item.title}</h4>
                </div>
                <span className="text-[9px] font-mono uppercase font-semibold text-muted-foreground bg-muted/60 px-2 py-0.5 rounded">
                  {item.badge}
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {item.content}
              </p>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-border/40 bg-muted/20 p-4 text-center text-xs text-muted-foreground leading-relaxed">
        <p>
          InnovX provides analytical and preparatory research tools for creators, researchers, and technical founders. 
          Use of this service does not establish an attorney-client relationship. Prior to filing formal patent documentation or executing commercial licenses, consultation with a registered patent attorney or technology transfer officer is strongly recommended.
        </p>
      </div>
    </section>
  );
}
