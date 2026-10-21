"use client";

import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth-context";
import { Navbar } from "@/components/navbar";
import { AuthModal } from "@/components/auth-modal";
import { Button } from "@/components/ui/button";
import {
  getUserInnovations,
  getCreatorStats,
  deleteInnovation,
  downloadReportPdf,
  saveInnovationPaths,
  type InnovationListItem,
  type CreatorStats,
  type PathwayType,
} from "@/lib/api";

import { ProvenanceTimeline } from "@/components/provenance-timeline";
import { VaultFiles } from "@/components/vault-files";
import { DevelopmentNotes } from "@/components/development-notes";
import { IdeaReanalyzer } from "@/components/idea-reanalyzer";
import { DecisionHub } from "@/components/decision-hub";
import { PatentReadinessView } from "@/components/patent-readiness-view";
import { DefensivePublicationView } from "@/components/defensive-publication-view";
import { MarketplaceListingModal } from "@/components/marketplace-listing-modal";
import { CampaignGeneratorView } from "@/components/campaign-generator-view";
import { InboundAccessRequests } from "@/components/inbound-access-requests";
import { CreatorListingsPanel } from "@/components/creator-listings-panel";
import { BuyerUnlockedVault } from "@/components/buyer-unlocked-vault";
import { MessageThreadsPanel } from "@/components/message-threads-panel";

const PATHWAY_BADGE_CONFIGS: Record<string, { label: string; icon: string; style: string }> = {
  protect: { label: "Protect", icon: "🛡️", style: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
  share: { label: "Share", icon: "🌍", style: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20" },
  connect: { label: "Connect", icon: "🤝", style: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
  build: { label: "Build", icon: "🚀", style: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20" },
};

export default function DashboardPage() {
  const { user, token, loading: authLoading, openAuthModal } = useAuth();
  const [innovations, setInnovations] = useState<InnovationListItem[]>([]);
  const [stats, setStats] = useState<CreatorStats>({
    total_innovations: 0,
    average_novelty: 0,
    private_count: 0,
    active_analyses: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "high_novelty">("all");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedInnovation, setSelectedInnovation] = useState<InnovationListItem | null>(null);
  const [modalTab, setModalTab] = useState<
    "overview" | "paths" | "protect" | "share" | "connect" | "build" | "files" | "notes" | "reanalyze" | "provenance"
  >("overview");
  const [isModalMaximized, setIsModalMaximized] = useState(true);
  const [visitedTabs, setVisitedTabs] = useState<Record<string, boolean>>({ overview: true });
  const [dashboardTab, setDashboardTab] = useState<"portfolio" | "marketplace" | "requests" | "messages" | "buyer_vault">("portfolio");
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

  const tabsContainerRef = useRef<HTMLDivElement>(null);

  // Reset visited tabs when selected innovation changes
  useEffect(() => {
    if (selectedInnovation) {
      setVisitedTabs({ overview: true, [modalTab]: true });
    }
  }, [selectedInnovation?.id]);

  // Keep newly activated tabs mounted for instantaneous tab switching
  useEffect(() => {
    if (selectedInnovation && !visitedTabs[modalTab]) {
      setVisitedTabs((prev) => ({ ...prev, [modalTab]: true }));
    }
  }, [modalTab, selectedInnovation, visitedTabs]);

  // Smooth mouse wheel scrolling on horizontal tab strip
  const handleTabsWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    if (e.deltaY !== 0 && tabsContainerRef.current) {
      tabsContainerRef.current.scrollLeft += e.deltaY;
    }
  }, []);

  // Tab scroll navigation buttons
  const scrollTabs = useCallback((direction: "left" | "right") => {
    if (tabsContainerRef.current) {
      const amount = direction === "left" ? -220 : 220;
      tabsContainerRef.current.scrollBy({ left: amount, behavior: "smooth" });
    }
  }, []);


  // Load user's innovations and portfolio stats
  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [innoRes, statsRes] = await Promise.all([
          getUserInnovations(token),
          getCreatorStats(token),
        ]);
        setInnovations(innoRes.innovations || []);
        setStats(statsRes);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token]);

  // Handle PDF Download
  const handleDownload = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDownloadingId(id);
    try {
      await downloadReportPdf(id);
    } catch (err) {
      alert(err instanceof Error ? err.message : "PDF download failed");
    } finally {
      setDownloadingId(null);
    }
  };

  // Handle Delete
  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!token) return;
    if (!confirm("Are you sure you want to permanently delete this innovation? This action cannot be undone.")) {
      return;
    }

    setDeletingId(id);
    try {
      await deleteInnovation(id, token);
      setInnovations((prev) => prev.filter((i) => i.id !== id));
      setStats((prev) => ({
        ...prev,
        total_innovations: Math.max(0, prev.total_innovations - 1),
      }));
      if (selectedInnovation?.id === id) {
        setSelectedInnovation(null);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeletingId(null);
    }
  };

  // Filter innovations
  const filteredInnovations = useMemo(() => {
    return innovations.filter((item) => {
      const matchesSearch =
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.raw_input.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.structured_data?.domain || "").toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (filterType === "high_novelty") {
        return (item.scores?.feature_novelty || 0) >= 70;
      }

      return true;
    });
  }, [innovations, searchQuery, filterType]);

  // Stable handler for updating pathway strategy without triggering render storms
  const handlePathsUpdated = useCallback(
    (updatedPaths: PathwayType[]) => {
      setSelectedInnovation((prev) => {
        if (!prev) return null;
        if (!prev.structured_data) return prev;
        return {
          ...prev,
          structured_data: {
            ...prev.structured_data,
            selected_paths: updatedPaths,
          },
        };
      });
      setInnovations((prev) =>
        prev.map((i) =>
          i.id === selectedInnovation?.id && i.structured_data
            ? {
                ...i,
                structured_data: {
                  ...i.structured_data,
                  selected_paths: updatedPaths,
                },
              }
            : i
        )
      );
    },
    [selectedInnovation?.id]
  );

  // Directly toggle an individual commercialization pathway from any view
  const handleTogglePath = useCallback(
    async (path: PathwayType) => {
      if (!selectedInnovation || !token) return;
      const current = (selectedInnovation.structured_data?.selected_paths as PathwayType[]) || [];
      const next = current.includes(path)
        ? current.filter((p) => p !== path)
        : [...current, path];

      handlePathsUpdated(next);

      try {
        await saveInnovationPaths(selectedInnovation.id, next, token);
      } catch (err) {
        console.warn("Notice: Pathway auto-saved locally:", err);
      }
    },
    [selectedInnovation, token, handlePathsUpdated]
  );

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />
      <AuthModal />

      <main className="flex-1 mx-auto max-w-6xl w-full px-6 py-10">
        {/* Unauthenticated View */}
        {!authLoading && !user && (
          <div className="flex flex-col items-center justify-center py-20 text-center max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-6">
              <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold tracking-tight mb-3">Private Innovation Vault</h1>
            <p className="text-sm text-muted-foreground mb-8">
              Sign in to manage your technical innovation portfolio, inspect 6-metric novelty assessments, and export verified PDF reports.
            </p>
            <div className="flex items-center gap-4">
              <Button
                onClick={openAuthModal}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-6 py-2.5 rounded-lg shadow-sm"
              >
                Sign In to Vault
              </Button>
              <Link href="/">
                <Button variant="outline" className="text-sm">
                  Run Public Discovery
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Authenticated Dashboard */}
        {user && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Header & Quick Action */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-6">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Creator Portfolio</h1>
                  <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full font-medium">
                    Private Vault
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  Secure workspace for <span className="text-foreground font-medium">{user.email}</span>
                </p>
              </div>

              <Link href="/">
                <Button className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-sm transition-all flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Analyze New Idea
                </Button>
              </Link>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="rounded-xl border border-border/80 bg-card p-5">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Innovations
                </span>
                <div className="text-2xl sm:text-3xl font-bold mt-1 text-foreground">
                  {stats.total_innovations}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">Active portfolio records</p>
              </div>

              <div className="rounded-xl border border-border/80 bg-card p-5">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Avg Novelty
                </span>
                <div className="text-2xl sm:text-3xl font-bold mt-1 text-emerald-400">
                  {stats.average_novelty > 0 ? `${stats.average_novelty}%` : "—"}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">AI novelty signal mean</p>
              </div>

              <div className="rounded-xl border border-border/80 bg-card p-5">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Access Level
                </span>
                <div className="text-2xl sm:text-3xl font-bold mt-1 text-foreground">
                  Private
                </div>
                <p className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Restricted to creator
                </p>
              </div>

              <div className="rounded-xl border border-border/80 bg-card p-5">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Provenance
                </span>
                <div className="text-2xl sm:text-3xl font-bold mt-1 text-foreground">
                  SHA-256
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">Cryptographic integrity</p>
              </div>
            </div>

            {/* Dashboard Section Switcher */}
            <div className="flex items-center gap-3 sm:gap-6 border-b border-border/60 pb-2 text-xs font-semibold overflow-x-auto">
              <button
                type="button"
                onClick={() => setDashboardTab("portfolio")}
                className={`pb-2 transition-all flex items-center gap-2 whitespace-nowrap ${
                  dashboardTab === "portfolio"
                    ? "border-b-2 border-emerald-500 text-emerald-400"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>📁</span>
                <span>Portfolio ({innovations.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setDashboardTab("marketplace")}
                className={`pb-2 transition-all flex items-center gap-2 whitespace-nowrap ${
                  dashboardTab === "marketplace"
                    ? "border-b-2 border-emerald-500 text-emerald-400"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>🏪</span>
                <span>My Listings</span>
              </button>

              <button
                type="button"
                onClick={() => setDashboardTab("requests")}
                className={`pb-2 transition-all flex items-center gap-2 whitespace-nowrap ${
                  dashboardTab === "requests"
                    ? "border-b-2 border-emerald-500 text-emerald-400"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>📬</span>
                <span>Inbound Requests</span>
                {pendingRequestsCount > 0 && (
                  <span className="bg-amber-500 text-black font-bold text-[10px] px-1.5 py-0.2 rounded-full">
                    {pendingRequestsCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setDashboardTab("messages")}
                className={`pb-2 transition-all flex items-center gap-2 whitespace-nowrap ${
                  dashboardTab === "messages"
                    ? "border-b-2 border-emerald-500 text-emerald-400"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>💬</span>
                <span>Messages</span>
              </button>

              <button
                type="button"
                onClick={() => setDashboardTab("buyer_vault")}
                className={`pb-2 transition-all flex items-center gap-2 whitespace-nowrap ${
                  dashboardTab === "buyer_vault"
                    ? "border-b-2 border-emerald-500 text-emerald-400"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>🔓</span>
                <span>Buyer Vault</span>
              </button>
            </div>

            {dashboardTab === "marketplace" ? (
              <CreatorListingsPanel
                token={token!}
                onNavigateToRequests={() => setDashboardTab("requests")}
              />
            ) : dashboardTab === "requests" ? (
              <InboundAccessRequests
                token={token!}
                onRequestCountChange={(c) => setPendingRequestsCount(c)}
              />
            ) : dashboardTab === "messages" ? (
              <MessageThreadsPanel token={token!} />
            ) : dashboardTab === "buyer_vault" ? (
              <BuyerUnlockedVault token={token!} />
            ) : (
              <>
                {/* Search and Filters */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-2">
              <div className="relative flex-1 max-w-md">
                <svg
                  className="absolute left-3.5 top-3 w-4 h-4 text-muted-foreground"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search innovations by keyword, title, domain..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm rounded-lg bg-card border border-border text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFilterType("all")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    filterType === "all"
                      ? "bg-emerald-600 text-white font-semibold"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  All ({innovations.length})
                </button>
                <button
                  onClick={() => setFilterType("high_novelty")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    filterType === "high_novelty"
                      ? "bg-emerald-600 text-white font-semibold"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  High Novelty (≥70%)
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-xs sm:text-sm text-destructive text-center">
                {error}
              </div>
            )}

            {/* Loading Skeleton */}
            {loading && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-48 rounded-xl border border-border/60 bg-card/40 animate-pulse" />
                ))}
              </div>
            )}

            {/* Empty State */}
            {!loading && filteredInnovations.length === 0 && (
              <div className="rounded-2xl border border-dashed border-border/80 p-12 text-center bg-card/20">
                <div className="w-12 h-12 rounded-xl bg-muted mx-auto flex items-center justify-center text-muted-foreground mb-4">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-base font-semibold text-foreground">
                  {searchQuery ? "No matching innovations found" : "No innovations saved in portfolio yet"}
                </h3>
                <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1 mb-6">
                  {searchQuery
                    ? "Try adjusting your search terms or filter."
                    : "Run an AI prior-art analysis in the Discovery Engine and save it to your private portfolio."}
                </p>
                <Link href="/">
                  <Button className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold">
                    Launch Discovery Engine
                  </Button>
                </Link>
              </div>
            )}

            {/* Innovations Grid */}
            {!loading && filteredInnovations.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {filteredInnovations.map((item) => {
                  const novelty = item.scores?.feature_novelty ?? null;
                  const density = item.scores?.prior_art_density ?? null;
                  const freshness = item.scores?.research_freshness ?? null;
                  const domain = item.structured_data?.domain || "Technology";

                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedInnovation(item)}
                      className="group cursor-pointer rounded-xl border border-border/70 hover:border-emerald-500/50 bg-card p-6 shadow-xs hover:shadow-md transition-[border-color,box-shadow] duration-150 flex flex-col justify-between"
                    >
                      <div>
                        {/* Top Meta Line */}
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                            {domain}
                          </span>
                          <div className="flex items-center gap-2">
                            {item.visibility === "marketplace" ? (
                              <span className="text-[10px] font-semibold text-emerald-300 bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <span>🤝</span>
                                <span>Marketplace Listed</span>
                              </span>
                            ) : (
                              <span className="text-[10px] text-muted-foreground uppercase font-mono">
                                v{item.current_version} • {item.visibility}
                              </span>
                            )}
                            <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                              #{item.id.slice(0, 8)}
                            </span>
                          </div>
                        </div>

                        {/* Title */}
                        <h3 className="text-base font-bold text-foreground group-hover:text-emerald-400 transition-colors line-clamp-2">
                          {item.title}
                        </h3>

                        {/* Problem Excerpt */}
                        <p className="text-xs text-muted-foreground mt-2 line-clamp-2 leading-relaxed">
                          {item.structured_data?.problem_statement || item.raw_input}
                        </p>

                        {/* Commercial Pathways Badges */}
                        {item.structured_data?.selected_paths && item.structured_data.selected_paths.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                            {item.structured_data.selected_paths.map((p: string) => {
                              const cfg = PATHWAY_BADGE_CONFIGS[p] || { label: p, icon: "•", style: "text-muted-foreground bg-muted border-border" };
                              return (
                                <span
                                  key={p}
                                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border flex items-center gap-1 ${cfg.style}`}
                                >
                                  <span>{cfg.icon}</span>
                                  <span>{cfg.label}</span>
                                </span>
                              );
                            })}
                          </div>
                        )}

                        {/* Score Metric Badges */}
                        {item.scores && (
                          <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-border/50">
                            <div className="rounded-lg bg-background p-2 text-center border border-border/40">
                              <span className="block text-[10px] text-muted-foreground uppercase font-medium">
                                Novelty
                              </span>
                              <span className="text-xs font-bold text-emerald-400">
                                {novelty !== null ? `${Math.round(novelty)}%` : "—"}
                              </span>
                            </div>
                            <div className="rounded-lg bg-background p-2 text-center border border-border/40">
                              <span className="block text-[10px] text-muted-foreground uppercase font-medium">
                                Prior Art
                              </span>
                              <span className="text-xs font-bold text-cyan-400">
                                {density !== null ? `${Math.round(density)}%` : "—"}
                              </span>
                            </div>
                            <div className="rounded-lg bg-background p-2 text-center border border-border/40">
                              <span className="block text-[10px] text-muted-foreground uppercase font-medium">
                                Freshness
                              </span>
                              <span className="text-xs font-bold text-amber-400">
                                {freshness !== null ? `${Math.round(freshness)}%` : "—"}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Card Footer Actions */}
                      <div className="flex items-center justify-between gap-2 mt-5 pt-4 border-t border-border/50">
                        <span className="text-[11px] text-muted-foreground">
                          {item.created_at ? new Date(item.created_at).toLocaleDateString() : ""}
                        </span>

                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => handleDownload(item.id, e)}
                            disabled={downloadingId === item.id}
                            className="text-xs h-8 px-2.5 hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/30"
                          >
                            {downloadingId === item.id ? (
                              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent mr-1" />
                            ) : (
                              <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                            )}
                            PDF
                          </Button>

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => handleDelete(item.id, e)}
                            disabled={deletingId === item.id}
                            className="text-xs h-8 px-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            title="Delete innovation"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
              </>
            )}
          </div>
        )}

        {/* Selected Innovation Inspection Workstation Modal */}
        {selectedInnovation && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 animate-in fade-in duration-150">
            <div
              className={`relative w-full border border-border/80 bg-card shadow-2xl flex flex-col transition-[inset,max-width,max-height] duration-200 ease-out ${
                isModalMaximized
                  ? "fixed inset-2 sm:inset-4 md:inset-6 z-50 rounded-2xl max-w-none max-h-none h-[calc(100vh-1rem)] sm:h-[calc(100vh-2rem)] md:h-[calc(100vh-3rem)]"
                  : "max-w-6xl max-h-[90vh] rounded-2xl"
              }`}
            >
              {/* Workstation Header Bar */}
              <div className="px-6 pt-5 pb-3 border-b border-border/60 bg-card shrink-0 flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                      {selectedInnovation.structured_data?.domain || "Technology"}
                    </span>
                    <span className="text-xs text-muted-foreground font-mono">
                      ID: {selectedInnovation.id}
                    </span>
                    <span className="text-xs bg-muted/60 text-muted-foreground border border-border/60 px-2 py-0.5 rounded-full font-mono">
                      v{selectedInnovation.current_version || 1}
                    </span>
                    {selectedInnovation.visibility && (
                      <span className="text-xs bg-background/80 text-foreground/80 border border-border/60 px-2 py-0.5 rounded-full uppercase tracking-wider text-[10px] font-semibold">
                        🔒 {selectedInnovation.visibility}
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-foreground truncate" title={selectedInnovation.title}>
                    {selectedInnovation.title}
                  </h2>
                </div>

                {/* Window Controls */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsModalMaximized(!isModalMaximized)}
                    className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors border border-border/40 hover:border-border/80 cursor-pointer"
                    title={isModalMaximized ? "Restore window view" : "Maximize workstation"}
                    aria-label={isModalMaximized ? "Restore window view" : "Maximize workstation"}
                  >
                    {isModalMaximized ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 14h6m0 0v6m0-6L3 21m17-7h-6m0 0v6m0-6l7 7M10 10H4m6 0V4m0 6L3 3m14 7h6m-6 0V4m0 6l7-7" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0-4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                      </svg>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedInnovation(null)}
                    className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors border border-border/40 hover:border-border/80 cursor-pointer"
                    title="Close workstation"
                    aria-label="Close workstation"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Workstation Tabs Navigation Bar with Horizontal Controls */}
              <div className="relative border-b border-border/60 bg-muted/20 shrink-0 flex items-center">
                <button
                  type="button"
                  onClick={() => scrollTabs("left")}
                  className="h-10 px-2.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors hidden sm:flex items-center justify-center border-r border-border/40 shrink-0 select-none cursor-pointer"
                  title="Scroll tabs left"
                  aria-label="Scroll tabs left"
                >
                  <span className="text-base font-bold leading-none">‹</span>
                </button>

                <div
                  ref={tabsContainerRef}
                  onWheel={handleTabsWheel}
                  className="flex-1 px-4 flex gap-2 sm:gap-3 text-xs font-semibold overflow-x-auto pt-2 pb-1.5 smooth-scroll-x no-scrollbar select-none"
                >
                  <button
                    type="button"
                    onClick={() => setModalTab("overview")}
                    className={`pb-2 transition-colors whitespace-nowrap cursor-pointer ${
                      modalTab === "overview"
                        ? "border-b-2 border-emerald-500 text-emerald-400"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Overview &amp; Features
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalTab("paths")}
                    className={`pb-2 flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
                      modalTab === "paths"
                        ? "border-b-2 border-emerald-500 text-emerald-400 font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span>🧭</span>
                    <span>
                      Commercial Pathways
                      {selectedInnovation.structured_data?.selected_paths?.length
                        ? ` (${selectedInnovation.structured_data.selected_paths.length})`
                        : ""}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalTab("protect")}
                    className={`pb-2 flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
                      modalTab === "protect"
                        ? "border-b-2 border-amber-400 text-amber-400 font-bold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span>🛡️</span>
                    <span>Patent Prep</span>
                    {selectedInnovation.structured_data?.selected_paths?.includes("protect") && (
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.2 rounded-full font-bold">
                        Active
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalTab("share")}
                    className={`pb-2 flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
                      modalTab === "share"
                        ? "border-b-2 border-cyan-400 text-cyan-400 font-bold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span>🌍</span>
                    <span>Defensive Pub</span>
                    {selectedInnovation.structured_data?.selected_paths?.includes("share") && (
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.2 rounded-full font-bold">
                        Active
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalTab("connect")}
                    className={`pb-2 flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
                      modalTab === "connect"
                        ? "border-b-2 border-emerald-400 text-emerald-400 font-bold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span>🤝</span>
                    <span>Marketplace</span>
                    {selectedInnovation.structured_data?.selected_paths?.includes("connect") && (
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.2 rounded-full font-bold">
                        Active
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalTab("build")}
                    className={`pb-2 flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
                      modalTab === "build"
                        ? "border-b-2 border-indigo-400 text-indigo-400 font-bold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span>🚀</span>
                    <span>Campaign Engine</span>
                    {selectedInnovation.structured_data?.selected_paths?.includes("build") && (
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.2 rounded-full font-bold">
                        Active
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalTab("files")}
                    className={`pb-2 flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
                      modalTab === "files"
                        ? "border-b-2 border-emerald-500 text-emerald-400"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span>📁</span>
                    <span>Files &amp; Vault</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalTab("notes")}
                    className={`pb-2 flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
                      modalTab === "notes"
                        ? "border-b-2 border-emerald-500 text-emerald-400"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span>📝</span>
                    <span>Lab Notes</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalTab("reanalyze")}
                    className={`pb-2 flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
                      modalTab === "reanalyze"
                        ? "border-b-2 border-emerald-500 text-emerald-400"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span>🔄</span>
                    <span>Re-Analyze Idea</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalTab("provenance")}
                    className={`pb-2 flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
                      modalTab === "provenance"
                        ? "border-b-2 border-emerald-500 text-emerald-400"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span>🔐</span>
                    <span>Provenance (v{selectedInnovation.current_version})</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => scrollTabs("right")}
                  className="h-10 px-2.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors hidden sm:flex items-center justify-center border-l border-border/40 shrink-0 select-none cursor-pointer"
                  title="Scroll tabs right"
                  aria-label="Scroll tabs right"
                >
                  <span className="text-base font-bold leading-none">›</span>
                </button>
              </div>

              {/* Scrollable Workstation Content Canvas with Tab Keep-Alive */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-6">
                {/* Overview Panel */}
                <div className={modalTab === "overview" ? "space-y-6 animate-in fade-in duration-150" : "hidden"}>
                  {selectedInnovation.structured_data && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-background border border-border/60">
                      <div>
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                          Problem Statement
                        </h4>
                        <p className="text-xs text-foreground leading-relaxed">
                          {selectedInnovation.structured_data.problem_statement}
                        </p>
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                          Proposed Solution
                        </h4>
                        <p className="text-xs text-foreground leading-relaxed">
                          {selectedInnovation.structured_data.proposed_solution}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Key Features Breakdown */}
                  {selectedInnovation.structured_data?.key_features && (
                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Decomposed Features ({selectedInnovation.structured_data.key_features.length})
                      </h4>
                      <div className="space-y-2">
                        {selectedInnovation.structured_data.key_features.map((feat) => (
                          <div
                            key={feat.id}
                            className="p-3 rounded-lg bg-background border border-border/40 flex items-start gap-3"
                          >
                            <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                              {feat.id}
                            </span>
                            <div>
                              <p className="text-xs font-medium text-foreground">{feat.description}</p>
                              <span className="text-[10px] text-muted-foreground uppercase">{feat.category}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Assessment Summary */}
                  {selectedInnovation.scores?.summary_text && (
                    <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                      <h4 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1">
                        AI Assessment Summary
                      </h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {selectedInnovation.scores.summary_text}
                      </p>
                    </div>
                  )}
                </div>

                {/* Paths Panel */}
                {visitedTabs["paths"] && (
                  <div className={modalTab === "paths" ? "space-y-4 animate-in fade-in duration-150" : "hidden"}>
                    <DecisionHub
                      innovationId={selectedInnovation.id}
                      initialPaths={(selectedInnovation.structured_data?.selected_paths as PathwayType[]) || []}
                      onPathsUpdated={handlePathsUpdated}
                      onSelectPathwayTab={(tab) => setModalTab(tab)}
                    />
                  </div>
                )}

                {/* Protect Panel */}
                {visitedTabs["protect"] && (
                  <div className={modalTab === "protect" ? "space-y-4 animate-in fade-in duration-150" : "hidden"}>
                    <PatentReadinessView
                      innovationId={selectedInnovation.id}
                      token={token!}
                      isPathSelected={(selectedInnovation.structured_data?.selected_paths || []).includes("protect")}
                      onTogglePath={() => handleTogglePath("protect")}
                    />
                  </div>
                )}

                {/* Share Panel */}
                {visitedTabs["share"] && (
                  <div className={modalTab === "share" ? "space-y-4 animate-in fade-in duration-150" : "hidden"}>
                    <DefensivePublicationView
                      innovationId={selectedInnovation.id}
                      token={token!}
                      isPathSelected={(selectedInnovation.structured_data?.selected_paths || []).includes("share")}
                      onTogglePath={() => handleTogglePath("share")}
                    />
                  </div>
                )}

                {/* Connect Panel */}
                {visitedTabs["connect"] && (
                  <div className={modalTab === "connect" ? "space-y-4 animate-in fade-in duration-150" : "hidden"}>
                    <MarketplaceListingModal
                      innovationId={selectedInnovation.id}
                      token={token!}
                      isPathSelected={(selectedInnovation.structured_data?.selected_paths || []).includes("connect")}
                      onTogglePath={() => handleTogglePath("connect")}
                      onListingUpdated={async () => {
                        if (token) {
                          const res = await getUserInnovations(token);
                          setInnovations(res.innovations || []);
                        }
                      }}
                    />
                  </div>
                )}

                {/* Build Panel */}
                {visitedTabs["build"] && (
                  <div className={modalTab === "build" ? "space-y-4 animate-in fade-in duration-150" : "hidden"}>
                    <CampaignGeneratorView
                      innovationId={selectedInnovation.id}
                      token={token!}
                      isPathSelected={(selectedInnovation.structured_data?.selected_paths || []).includes("build")}
                      onTogglePath={() => handleTogglePath("build")}
                      onNavigateToProtect={() => setModalTab("protect")}
                      onNavigateToShare={() => setModalTab("share")}
                    />
                  </div>
                )}

                {/* Files Panel */}
                {visitedTabs["files"] && (
                  <div className={modalTab === "files" ? "space-y-4 animate-in fade-in duration-150" : "hidden"}>
                    <VaultFiles innovationId={selectedInnovation.id} token={token!} />
                  </div>
                )}

                {/* Notes Panel */}
                {visitedTabs["notes"] && (
                  <div className={modalTab === "notes" ? "space-y-4 animate-in fade-in duration-150" : "hidden"}>
                    <DevelopmentNotes innovationId={selectedInnovation.id} token={token!} />
                  </div>
                )}

                {/* Reanalyze Panel */}
                {visitedTabs["reanalyze"] && (
                  <div className={modalTab === "reanalyze" ? "space-y-4 animate-in fade-in duration-150" : "hidden"}>
                    <IdeaReanalyzer
                      innovation={selectedInnovation}
                      token={token!}
                      onReanalyzed={async (updated) => {
                        setSelectedInnovation(updated);
                        setInnovations((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
                        if (token) {
                          const statsRes = await getCreatorStats(token);
                          setStats(statsRes);
                        }
                      }}
                    />
                  </div>
                )}

                {/* Provenance Panel */}
                {visitedTabs["provenance"] && (
                  <div className={modalTab === "provenance" ? "space-y-4 animate-in fade-in duration-150" : "hidden"}>
                    <ProvenanceTimeline
                      innovationId={selectedInnovation.id}
                      token={token!}
                      currentTitle={selectedInnovation.title}
                      onVersionCreated={async () => {
                        if (token) {
                          const res = await getUserInnovations(token);
                          setInnovations(res.innovations || []);
                          const updatedSelected = res.innovations.find((i) => i.id === selectedInnovation.id);
                          if (updatedSelected) {
                            setSelectedInnovation(updatedSelected);
                          }
                        }
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Workstation Footer Actions Bar */}
              <div className="px-6 py-3.5 border-t border-border/60 bg-card shrink-0 flex items-center justify-between gap-4">
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span className="font-mono text-[11px] text-foreground/80">InnovX Enterprise Workstation Active</span>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setSelectedInnovation(null)}
                    className="text-xs h-8 px-3"
                  >
                    Close
                  </Button>
                  <Button
                    onClick={(e) => handleDownload(selectedInnovation.id, e)}
                    disabled={downloadingId === selectedInnovation.id}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold h-8 px-4"
                  >
                    {downloadingId === selectedInnovation.id ? "Preparing PDF..." : "Download Full PDF Report"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
