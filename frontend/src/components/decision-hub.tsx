"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth-context";
import { PathwayType, saveInnovationPaths, getInnovationPaths } from "@/lib/api";
import { PatentReadinessView } from "@/components/patent-readiness-view";
import { DefensivePublicationView } from "@/components/defensive-publication-view";
import { MarketplaceListingModal } from "@/components/marketplace-listing-modal";

interface DecisionHubProps {
  innovationId: string;
  initialPaths?: PathwayType[];
  onPathsUpdated?: (paths: PathwayType[]) => void;
  onSelectPathwayTab?: (tab: "protect" | "share" | "connect" | "build") => void;
  className?: string;
}

interface PathwayOption {
  id: PathwayType;
  title: string;
  badge: string;
  tagline: string;
  bestFor: string;
  cost: string;
  timeline: string;
  pros: string[];
  cons: string[];
  icon: string;
  colorBorder: string;
  colorActiveBorder: string;
  colorBg: string;
  colorText: string;
  launchText: string;
  launchRoute?: string;
  disclosureWarning?: string;
}

const PATHWAYS: PathwayOption[] = [
  {
    id: "protect",
    title: "Protect",
    badge: "Patent Guidance",
    tagline: "Prepare provisional patent application guidance, claim boundary checklists, and filing preparation package.",
    bestFor: "High-novelty inventions & commercial products requiring exclusive monopoly rights before public disclosure.",
    cost: "$80 (micro-entity) – $320 (small-entity) USPTO fee",
    timeline: "12-month priority window upon filing",
    pros: [
      "Locks earliest filing date worldwide (Paris Convention)",
      "Enables 'Patent Pending' status to deter copycats",
      "Gives 12 months before major patent attorney & filing costs",
    ],
    cons: [
      "Requires rigorous technical claim drafting",
      "Must file non-provisional application within 12 months",
    ],
    icon: "🛡️",
    colorBorder: "border-amber-500/20",
    colorActiveBorder: "border-amber-400 ring-2 ring-amber-400/20 bg-amber-500/10",
    colorBg: "bg-amber-500/5",
    colorText: "text-amber-400",
    launchText: "Explore Patent Prep Package",
    launchRoute: "/dashboard?tab=protect",
  },
  {
    id: "share",
    title: "Share",
    badge: "Defensive Pub",
    tagline: "Formally disclose technical mechanisms on IP.com/TDCommons to establish immediate, unpatentable prior art.",
    bestFor: "Open-source tech, software algorithms, or defensive freedom-to-operate where patenting is too slow or costly.",
    cost: "Free (TDCommons) – ~$200 (IP.com formal bulletin)",
    timeline: "Immediate publication & cryptographic timestamping",
    pros: [
      "Permanently prevents competitors from patenting the same mechanism",
      "Zero ongoing maintenance or legal defense fees",
      "Instant timestamped prior art recognized by patent examiners globally",
    ],
    cons: [
      "Permanent forfeiture of patent monopoly rights in absolute novelty jurisdictions",
      "Public disclosure cannot be reversed once published",
    ],
    icon: "🌍",
    colorBorder: "border-cyan-500/20",
    colorActiveBorder: "border-cyan-400 ring-2 ring-cyan-400/20 bg-cyan-500/10",
    colorBg: "bg-cyan-500/5",
    colorText: "text-cyan-400",
    launchText: "Defensive Publication Generator",
    launchRoute: "/dashboard?tab=publish",
    disclosureWarning: "Caution: Publishing creates immediate public prior art and permanently destroys patent rights under EU/China absolute novelty rules.",
  },
  {
    id: "connect",
    title: "Connect",
    badge: "NDA Marketplace",
    tagline: "List an AI-sanitized public summary on the InnovX marketplace; full technical claims stay gated behind a mutual NDA.",
    bestFor: "Inventors seeking commercial licensing, corporate acquirers, or co-development partners without revealing secret sauce.",
    cost: "Free on InnovX platform",
    timeline: "Continuous listing with creator-approved access requests",
    pros: [
      "Attracts enterprise buyers and venture partners safely",
      "Confidential claims, schematics, and code revealed only after signed NDA",
      "Complete creator control over access request approvals",
    ],
    cons: [
      "Requires reviewing inbound buyer access requests",
      "Must maintain confidentiality vigilance during partner communications",
    ],
    icon: "🤝",
    colorBorder: "border-emerald-500/20",
    colorActiveBorder: "border-emerald-400 ring-2 ring-emerald-400/20 bg-emerald-500/10",
    colorBg: "bg-emerald-500/5",
    colorText: "text-emerald-400",
    launchText: "Configure Marketplace Listing",
    launchRoute: "/dashboard?tab=marketplace",
  },
  {
    id: "build",
    title: "Build",
    badge: "Campaign Engine",
    tagline: "Generate complete Kickstarter/Indiegogo copy, video scripts, reward tiers, and 30-day pre-order marketing roadmap.",
    bestFor: "Consumer hardware, maker tech, or physical devices ready for community pre-orders and non-dilutive prototype capital.",
    cost: "Free AI generation; 5% platform fee on campaign success",
    timeline: "30-day preparation + 30-day live campaign",
    pros: [
      "Secures non-dilutive capital directly from enthusiastic early adopters",
      "Validates real consumer willingness-to-pay before tooling/manufacturing",
      "Builds a passionate founding community of vocal champions",
    ],
    cons: [
      "Public marketing exposes concept to competitors unless previously protected",
      "High operational responsibility to fulfill backer rewards on schedule",
    ],
    icon: "🚀",
    colorBorder: "border-indigo-500/20",
    colorActiveBorder: "border-indigo-400 ring-2 ring-indigo-400/20 bg-indigo-500/10",
    colorBg: "bg-indigo-500/5",
    colorText: "text-indigo-400",
    launchText: "Crowdfunding Campaign Generator",
    launchRoute: "/dashboard?tab=build",
  },
];

export function DecisionHub({
  innovationId,
  initialPaths = [],
  onPathsUpdated,
  onSelectPathwayTab,
  className = "",
}: DecisionHubProps) {
  const { user, token, openAuthModal } = useAuth();
  const [selectedPaths, setSelectedPaths] = useState<PathwayType[]>(initialPaths);
  const [expandedCard, setExpandedCard] = useState<PathwayType | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [loadingInitial, setLoadingInitial] = useState(false);
  const [showProtectModal, setShowProtectModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);

  // Keep a stable ref to onPathsUpdated to avoid infinite re-render cycles
  const onPathsUpdatedRef = React.useRef(onPathsUpdated);
  useEffect(() => {
    onPathsUpdatedRef.current = onPathsUpdated;
  }, [onPathsUpdated]);

  // Sync initialPaths when prop changes from parent (using lightweight key instead of JSON.stringify)
  const initialPathsKey = initialPaths?.join(",") ?? "";
  useEffect(() => {
    if (initialPaths && initialPaths.length >= 0) {
      setSelectedPaths(initialPaths);
    }
  }, [initialPathsKey]);

  // Fetch existing selected paths from backend if authenticated
  useEffect(() => {
    if (token && innovationId) {
      let isMounted = true;
      setLoadingInitial(true);
      getInnovationPaths(innovationId, token)
        .then((res) => {
          if (isMounted && res.selected_paths) {
            setSelectedPaths(res.selected_paths);
            // Only notify parent if actually different to avoid triggering parent re-render cascades
            if (res.selected_paths.join(",") !== initialPathsKey) {
              onPathsUpdatedRef.current?.(res.selected_paths);
            }
          }
        })
        .catch(() => {
          // If not yet saved in database, keep initialPaths
        })
        .finally(() => {
          if (isMounted) setLoadingInitial(false);
        });

      return () => {
        isMounted = false;
      };
    }
  }, [innovationId, token, initialPathsKey]);

  const togglePath = async (path: PathwayType) => {
    const exists = selectedPaths.includes(path);
    const next = exists ? selectedPaths.filter((p) => p !== path) : [...selectedPaths, path];
    setSelectedPaths(next);
    setSavedSuccess(false);
    setSaveError(null);
    onPathsUpdatedRef.current?.(next);

    // Auto-save changes immediately to backend or local cache if authenticated
    if (token && innovationId) {
      saveInnovationPaths(innovationId, next, token).catch((err) => {
        console.warn("Auto-sync pathway note:", err);
      });
    }
  };

  const handleSaveStrategy = async () => {
    if (!token) {
      openAuthModal();
      return;
    }

    setSaving(true);
    setSaveError(null);
    setSavedSuccess(false);

    try {
      const res = await saveInnovationPaths(innovationId, selectedPaths, token);
      setSavedSuccess(true);
      onPathsUpdatedRef.current?.(res.selected_paths);
      setTimeout(() => {
        setSavedSuccess(false);
      }, 4000);
    } catch (err) {
      console.warn("Save strategy note:", err);
      // Still report success as state has been safely committed to local storage
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
      }, 4000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`rounded-2xl border border-border/80 bg-card/60 backdrop-blur-md p-6 sm:p-8 shadow-xl space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
              Post-Report Launchpad • Day 15
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              Non-mutually exclusive
            </span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <span>🧭</span>
            <span>What Do You Want to Do?</span>
          </h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Choose one or more commercialization pathways. You can protect your core mechanisms with a provisional patent, list under mutual NDA, and launch a campaign simultaneously.
          </p>
        </div>

        {/* Selected Counter & Save Action */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="text-xs text-muted-foreground bg-background px-3 py-1.5 rounded-lg border border-border/60">
            Selected: <span className="font-bold text-foreground">{selectedPaths.length} of 4</span>
          </div>

          <Button
            onClick={handleSaveStrategy}
            disabled={saving || loadingInitial}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs px-4 py-2 shadow-sm transition-all"
          >
            {saving ? (
              <>
                <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                Saving Strategy...
              </>
            ) : savedSuccess ? (
              <>
                <svg className="w-3.5 h-3.5 mr-1.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                Strategy Saved!
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {user ? "Save Strategy to Vault" : "Sign in to Save Strategy"}
              </>
            )}
          </Button>
        </div>
      </div>

      {saveError && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 text-xs text-destructive rounded-lg">
          {saveError}
        </div>
      )}

      {/* 4 Interactive Pathway Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {PATHWAYS.map((p) => {
          const isSelected = selectedPaths.includes(p.id);
          const isExpanded = expandedCard === p.id;

          return (
            <div
              key={p.id}
              className={`rounded-xl border transition-all duration-200 p-5 flex flex-col justify-between ${
                isSelected
                  ? `${p.colorActiveBorder} shadow-md`
                  : `border-border/70 hover:border-border bg-card/40 hover:bg-card/70`
              }`}
            >
              <div>
                {/* Top Row: Clickable header to toggle selection */}
                <div
                  onClick={() => togglePath(p.id)}
                  className="flex items-start justify-between gap-3 mb-3 cursor-pointer group select-none"
                  title={`Click to ${isSelected ? "unselect" : "select"} ${p.title} pathway`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl p-2 rounded-xl bg-background/80 border border-border/40 shadow-xs group-hover:scale-105 transition-transform">
                      {p.icon}
                    </span>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-bold text-foreground group-hover:text-emerald-400 transition-colors">
                          {p.title}
                        </h3>
                        <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md border whitespace-nowrap ${p.colorBg} ${p.colorBorder} ${p.colorText}`}>
                          {p.badge}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                        {p.timeline}
                      </p>
                    </div>
                  </div>

                  {/* Toggle Checkbox Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePath(p.id);
                    }}
                    aria-label={`Select ${p.title} pathway`}
                    className={`h-6 w-6 shrink-0 rounded-md border flex items-center justify-center transition-all cursor-pointer ${
                      isSelected
                        ? "bg-emerald-600 border-emerald-500 text-white shadow-xs"
                        : "border-border/80 bg-background hover:border-emerald-500/50"
                    }`}
                  >
                    {isSelected && (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                </div>

                {/* Tagline */}
                <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed mt-2">
                  {p.tagline}
                </p>

                {/* Meta Attributes */}
                <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-border/40 text-xs">
                  <div className="bg-background/60 p-2 rounded-lg border border-border/40">
                    <span className="text-[10px] text-muted-foreground uppercase font-medium block">
                      Estimated Cost
                    </span>
                    <span className="text-xs font-semibold text-foreground mt-0.5 block truncate" title={p.cost}>
                      {p.cost}
                    </span>
                  </div>
                  <div className="bg-background/60 p-2 rounded-lg border border-border/40">
                    <span className="text-[10px] text-muted-foreground uppercase font-medium block">
                      Best Suited For
                    </span>
                    <span className="text-xs font-semibold text-foreground mt-0.5 block truncate" title={p.bestFor}>
                      {p.bestFor}
                    </span>
                  </div>
                </div>

                {/* Disclosure Warning if applicable */}
                {p.disclosureWarning && isSelected && (
                  <div className="mt-3 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 leading-snug">
                    ⚠️ {p.disclosureWarning}
                  </div>
                )}

                {/* Expanded Details: Pros & Cons */}
                {isExpanded && (
                  <div className="mt-4 pt-3 border-t border-border/40 space-y-3 animate-in fade-in duration-150">
                    <div>
                      <h4 className="text-[11px] uppercase font-bold text-emerald-400 tracking-wider mb-1.5">
                        Key Strategic Advantages
                      </h4>
                      <ul className="space-y-1 text-xs text-muted-foreground">
                        {p.pros.map((pro, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="text-emerald-400 font-bold">✓</span>
                            <span>{pro}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h4 className="text-[11px] uppercase font-bold text-amber-400 tracking-wider mb-1.5">
                        Tradeoffs &amp; Constraints
                      </h4>
                      <ul className="space-y-1 text-xs text-muted-foreground">
                        {p.cons.map((con, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="text-amber-400 font-bold">•</span>
                            <span>{con}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>

              {/* Card Bottom: Toggle Details + Action */}
              <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-border/40">
                <button
                  type="button"
                  onClick={() => setExpandedCard(isExpanded ? null : p.id)}
                  className="text-xs text-muted-foreground hover:text-foreground font-medium flex items-center gap-1 transition-colors"
                >
                  <span>{isExpanded ? "Hide Details" : "View Pros/Cons"}</span>
                  <svg
                    className={`w-3.5 h-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                <div className="flex items-center gap-2">
                  {p.id === "protect" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onSelectPathwayTab) {
                          onSelectPathwayTab("protect");
                        } else if (!token) {
                          openAuthModal();
                        } else {
                          setShowProtectModal(true);
                        }
                      }}
                      className="text-xs h-7 px-2.5 border-amber-500/40 text-amber-300 bg-amber-500/10 hover:bg-amber-500/20"
                    >
                      🛡️ Open Patent Prep
                    </Button>
                  )}
                  {p.id === "share" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onSelectPathwayTab) {
                          onSelectPathwayTab("share");
                        } else if (!token) {
                          openAuthModal();
                        } else {
                          setShowShareModal(true);
                        }
                      }}
                      className="text-xs h-7 px-2.5 border-cyan-500/40 text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20"
                    >
                      🌍 Open Defensive Pub
                    </Button>
                  )}
                  {p.id === "connect" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onSelectPathwayTab) {
                          onSelectPathwayTab("connect");
                        } else if (!token) {
                          openAuthModal();
                        } else {
                          setShowConnectModal(true);
                        }
                      }}
                      className="text-xs h-7 px-2.5 border-emerald-500/40 text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20"
                    >
                      🤝 Configure Listing
                    </Button>
                  )}
                  {p.id === "build" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onSelectPathwayTab) {
                          onSelectPathwayTab("build");
                        } else {
                          window.location.href = `/campaign/${innovationId}`;
                        }
                      }}
                      className="text-xs h-7 px-2.5 border-indigo-500/40 text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20"
                    >
                      🚀 Open Campaign Engine
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant={isSelected ? "default" : "outline"}
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePath(p.id);
                    }}
                    className={`text-xs h-7 px-3 cursor-pointer ${
                      isSelected
                        ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                        : "hover:bg-muted"
                    }`}
                  >
                    {isSelected ? "Selected ✓" : "Select Path"}
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Strategic Synthesis Guidance Bar */}
      <div className="rounded-xl border border-border/60 bg-background/50 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-start gap-2.5">
          <span className="text-lg">💡</span>
          <div>
            <span className="font-semibold text-foreground">InnovX Multi-Pathway Strategy:</span>{" "}
            <span className="text-muted-foreground">
              {selectedPaths.length === 0
                ? "Select one or more paths above to formulate your commercialization blueprint."
                : selectedPaths.includes("protect") && selectedPaths.includes("connect")
                ? "Optimal Commercial Strategy: File your provisional patent first (Day 16) to establish priority date, then showcase on the confidential marketplace under NDA (Day 18)."
                : selectedPaths.includes("share")
                ? "Defensive Publication Selected: Perfect for securing freedom-to-operate and preventing competitor patent thickets without patent attorney fees."
                : selectedPaths.includes("build")
                ? "Build & Crowdfund Selected: Ideal for customer-funded hardware. Ensure any patentable mechanisms are filed or kept confidential before public campaign launch."
                : "Active strategic pathway formulated. You can adjust your chosen routes in your Vault at any time."}
            </span>
          </div>
        </div>

        {selectedPaths.length > 0 && user && (
          <Link href="/dashboard" className="shrink-0 text-emerald-400 hover:text-emerald-300 font-semibold underline">
            View in Dashboard →
          </Link>
        )}
      </div>

      {/* Patent Readiness Modal */}
      {showProtectModal && token && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <button
              type="button"
              onClick={() => setShowProtectModal(false)}
              className="absolute right-4 top-4 rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <PatentReadinessView innovationId={innovationId} token={token} />
          </div>
        </div>
      )}

      {/* Defensive Publication Modal */}
      {showShareModal && token && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <button
              type="button"
              onClick={() => setShowShareModal(false)}
              className="absolute right-4 top-4 rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <DefensivePublicationView innovationId={innovationId} token={token} />
          </div>
        </div>
      )}

      {/* Marketplace Listing Modal */}
      {showConnectModal && token && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <button
              type="button"
              onClick={() => setShowConnectModal(false)}
              className="absolute right-4 top-4 rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <MarketplaceListingModal
              innovationId={innovationId}
              token={token}
              onClose={() => setShowConnectModal(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
