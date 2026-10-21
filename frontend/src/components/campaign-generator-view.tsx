"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  type CrowdfundingCampaign,
  type CampaignRewardTier,
  type CampaignVideoScene,
  type CampaignRoadmapMilestone,
  type CampaignFaqItem,
  type PlatformGuide,
  getCrowdfundingCampaign,
  generateCrowdfundingCampaign,
  updateCrowdfundingCampaign,
  exportCampaignMarkdown,
  downloadCampaignPdf,
  getCrowdfundingGuides,
} from "@/lib/api";

interface CampaignGeneratorViewProps {
  innovationId: string;
  token: string;
  className?: string;
  isPathSelected?: boolean;
  onTogglePath?: () => void;
  onNavigateToProtect?: () => void;
  onNavigateToShare?: () => void;
}

export function CampaignGeneratorView({
  innovationId,
  token,
  className = "",
  isPathSelected,
  onTogglePath,
  onNavigateToProtect,
  onNavigateToShare,
}: CampaignGeneratorViewProps) {
  const [campaign, setCampaign] = useState<CrowdfundingCampaign | null>(null);
  const [guides, setGuides] = useState<Record<string, PlatformGuide> | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [exportingMd, setExportingMd] = useState(false);
  const [copiedMd, setCopiedMd] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Active Tab & Target Platform
  const [activeTab, setActiveTab] = useState<"story" | "tiers" | "video" | "roadmap" | "allocation" | "checklist">("story");
  const [platform, setPlatform] = useState<"kickstarter" | "indiegogo" | "crowd_supply">("kickstarter");

  // Export Modal State
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<"kickstarter" | "indiegogo" | "crowdsupply">("kickstarter");
  const [exportedContent, setExportedContent] = useState<string>("");
  const [exportedWordCount, setExportedWordCount] = useState<number>(0);

  // Pre-Launch IP Disclosure Acknowledgment (stored in localStorage)
  const [ipAcknowledged, setIpAcknowledged] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(`innovx_ip_ack_${innovationId}`) === "true";
  });

  // Interactive Checklist State (stored in localStorage per innovation and platform)
  const [checkedTasks, setCheckedTasks] = useState<Record<string, boolean>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const stored = localStorage.getItem(`innovx_chk_${innovationId}`);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  // Editable fields
  const [title, setTitle] = useState("");
  const [tagline, setTagline] = useState("");
  const [fundingGoal, setFundingGoal] = useState<number>(15000);
  const [originStory, setOriginStory] = useState("");
  const [technicalPitch, setTechnicalPitch] = useState("");
  const [isEditingStory, setIsEditingStory] = useState(false);

  // Load campaign & platform guides
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    Promise.all([
      getCrowdfundingCampaign(innovationId, token, platform),
      getCrowdfundingGuides(token).catch(() => null),
    ])
      .then(([campRes, guidesRes]) => {
        if (!isMounted) return;
        setCampaign(campRes.campaign);
        setTitle(campRes.campaign.title);
        setTagline(campRes.campaign.tagline);
        setFundingGoal(campRes.campaign.funding_goal);
        setOriginStory(campRes.campaign.origin_story);
        setTechnicalPitch(campRes.campaign.technical_mechanism_pitch);

        if (guidesRes && guidesRes.guides) {
          setGuides(guidesRes.guides);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Failed to load campaign data");
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [innovationId, token, platform]);

  const handleToggleIpAck = (val: boolean) => {
    setIpAcknowledged(val);
    if (typeof window !== "undefined") {
      localStorage.setItem(`innovx_ip_ack_${innovationId}`, String(val));
    }
  };

  const handleToggleChecklistTask = (taskId: string) => {
    setCheckedTasks((prev) => {
      const next = { ...prev, [taskId]: !prev[taskId] };
      if (typeof window !== "undefined") {
        localStorage.setItem(`innovx_chk_${innovationId}`, JSON.stringify(next));
      }
      return next;
    });
  };

  const handleRegenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await generateCrowdfundingCampaign(innovationId, token, platform);
      setCampaign(res.campaign);
      setTitle(res.campaign.title);
      setTagline(res.campaign.tagline);
      setFundingGoal(res.campaign.funding_goal);
      setOriginStory(res.campaign.origin_story);
      setTechnicalPitch(res.campaign.technical_mechanism_pitch);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Regeneration failed");
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveEdits = async () => {
    if (!campaign) return;
    setSaving(true);
    setError(null);
    try {
      const res = await updateCrowdfundingCampaign(
        innovationId,
        {
          title,
          tagline,
          funding_goal: Number(fundingGoal),
          origin_story: originStory,
          technical_mechanism_pitch: technicalPitch,
          platform,
        },
        token
      );
      setCampaign(res.campaign);
      setIsEditingStory(false);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save edits");
    } finally {
      setSaving(false);
    }
  };

  // Launch Multi-Format Export Modal
  const handleOpenExportModal = async (format: "kickstarter" | "indiegogo" | "crowdsupply") => {
    setExportFormat(format);
    setExportingMd(true);
    setExportModalOpen(true);
    try {
      const res = await exportCampaignMarkdown(innovationId, token, format);
      setExportedContent(res.markdown_content);
      setExportedWordCount(res.word_count);
    } catch (err) {
      setExportedContent(err instanceof Error ? err.message : "Failed to export formatted campaign");
    } finally {
      setExportingMd(false);
    }
  };

  const handleCopyExportedMarkdown = async () => {
    if (!exportedContent) return;
    await navigator.clipboard.writeText(exportedContent);
    setCopiedMd(true);
    setTimeout(() => setCopiedMd(false), 2500);
  };

  // Download ReportLab PDF
  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    setError(null);
    try {
      const filename = `InnovX_Campaign_${(title || "hardware").replace(/[^a-zA-Z0-9]/g, "_").slice(0, 24)}_${platform}.pdf`;
      await downloadCampaignPdf(token, innovationId, filename);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to download campaign PDF");
    } finally {
      setDownloadingPdf(false);
    }
  };

  // Current platform guide for checklist tab
  const currentGuideKey = platform === "crowd_supply" ? "crowdsupply" : platform;
  const currentGuide = guides ? guides[currentGuideKey] : null;

  const checklistStats = useMemo(() => {
    if (!currentGuide || !currentGuide.checklist) return { total: 0, completed: 0, percent: 0 };
    const total = currentGuide.checklist.length;
    const completed = currentGuide.checklist.filter((item) => checkedTasks[item.id]).length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, percent };
  }, [currentGuide, checkedTasks]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-border/80 bg-card p-12 text-center space-y-4">
        <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-400 rounded-full animate-spin mx-auto" />
        <h3 className="text-sm font-semibold text-foreground">
          Synthesizing AI Crowdfunding Campaign &amp; Platform Guides...
        </h3>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
          Formulating Kickstarter/Indiegogo pitch story, reward pricing tiers, 60-second video script, and platform submission checklists.
        </p>
      </div>
    );
  }

  if (error && !campaign) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center space-y-4">
        <p className="text-xs text-destructive font-medium">{error}</p>
        <Button
          onClick={handleRegenerate}
          disabled={generating}
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2"
        >
          {generating ? "Generating Campaign..." : "Generate Crowdfunding Campaign"}
        </Button>
      </div>
    );
  }

  if (!campaign) return null;

  return (
    <div className={`space-y-6 w-full max-w-full min-w-0 ${className}`}>
      {/* ── Pre-Launch IP Shield Banner (Subtask 23-3) ── */}
      <div className="rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-500/15 via-card to-background p-5 sm:p-6 shadow-md">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl shrink-0 p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              🛡️
            </span>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                  Pre-Launch IP Disclosure Advisory
                </span>
                <span className="text-[10px] font-mono bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30 font-semibold">
                  Statutory Rule 4
                </span>
              </div>
              <p className="text-xs text-foreground/90 leading-relaxed max-w-2xl">
                Publicly launching on Kickstarter or Indiegogo constitutes an <b>enabling public disclosure</b>.
                In absolute novelty regions (Europe EPC Art. 54, China, Japan), public crowdfunding permanently forfeits your patent rights unless a provisional or priority application is filed before launch. In the US, it starts a strict 1-year grace period clock.
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {onNavigateToProtect && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={onNavigateToProtect}
                    className="h-7 text-[11px] border-amber-500/40 text-amber-300 hover:bg-amber-500/20 bg-amber-500/10"
                  >
                    <span>🛡️ Review Patent Prep Package</span>
                  </Button>
                )}
                {onNavigateToShare && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={onNavigateToShare}
                    className="h-7 text-[11px] border-border/80 text-muted-foreground hover:text-foreground"
                  >
                    <span>🌍 Defensive Publication Option</span>
                  </Button>
                )}
              </div>
            </div>
          </div>

          <label className="flex items-center gap-2 shrink-0 cursor-pointer text-[11px] text-muted-foreground bg-background/60 p-2.5 rounded-xl border border-border/40 hover:border-amber-500/30 transition-all">
            <input
              type="checkbox"
              checked={ipAcknowledged}
              onChange={(e) => handleToggleIpAck(e.target.checked)}
              className="rounded border-border text-amber-500 focus:ring-amber-500"
            />
            <span className={ipAcknowledged ? "text-emerald-400 font-medium" : ""}>
              {ipAcknowledged ? "IP Disclosure Verified" : "Acknowledge IP Deadlines"}
            </span>
          </label>
        </div>
      </div>

      {/* ── Main Campaign Header Banner ── */}
      <div className="rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-indigo-500/10 via-card to-background p-6 sm:p-7 shadow-lg">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 min-w-0">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <span>🚀</span>
                <span>Build Path • Day 23</span>
              </span>
              <span className="text-xs text-muted-foreground font-mono">
                AI Crowdfunding &amp; Multi-Platform Exporter
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground truncate">
              {title || campaign.title}
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-2xl line-clamp-2">
              {tagline || campaign.tagline}
            </p>
          </div>

          {/* Action Button Bar */}
          <div className="flex flex-wrap items-center gap-2">
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

            {/* PDF Exporter Button (Subtask 23-1) */}
            <Button
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
              className="text-xs h-9 bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-sm transition-all"
            >
              {downloadingPdf ? (
                <>
                  <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent mr-1.5" />
                  Generating PDF...
                </>
              ) : (
                <>
                  <span className="mr-1.5">📄</span>
                  Download Campaign PDF
                </>
              )}
            </Button>

            {/* Multi-Platform Export Selector */}
            <Button
              onClick={() => handleOpenExportModal(platform === "crowd_supply" ? "crowdsupply" : platform)}
              variant="outline"
              className="text-xs h-9 border-indigo-500/40 text-indigo-300 hover:bg-indigo-500/15"
            >
              <span className="mr-1.5">📋</span>
              Export Formatted Pitch
            </Button>

            <Button
              onClick={handleRegenerate}
              disabled={generating}
              variant="outline"
              className="text-xs h-9 border-border/80 hover:bg-muted text-foreground"
            >
              {generating ? (
                <>
                  <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent mr-1.5" />
                  Synthesizing...
                </>
              ) : (
                <>
                  <span className="mr-1.5">⚡</span>
                  Re-Synthesize
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Platform Selector & Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-6 pt-5 border-t border-border/40 min-w-0">
          <div className="bg-background/60 p-3 rounded-xl border border-border/40 min-w-0">
            <span className="text-[10px] text-muted-foreground uppercase font-medium block">
              Target Funding Goal
            </span>
            <span className="text-base font-bold text-foreground mt-0.5 block font-mono truncate">
              ${fundingGoal.toLocaleString()} {campaign.currency}
            </span>
          </div>
          <div className="bg-background/60 p-3 rounded-xl border border-border/40 min-w-0">
            <span className="text-[10px] text-muted-foreground uppercase font-medium block">
              Optimal Window
            </span>
            <span className="text-base font-bold text-foreground mt-0.5 block font-mono truncate">
              {campaign.duration_days} Days Live
            </span>
          </div>
          <div className="bg-background/60 p-3 rounded-xl border border-border/40 min-w-0">
            <span className="text-[10px] text-muted-foreground uppercase font-medium block">
              Reward Tiers
            </span>
            <span className="text-base font-bold text-indigo-400 mt-0.5 block font-mono truncate">
              {campaign.reward_tiers.length} Structured Tiers
            </span>
          </div>
          <div className="bg-background/60 p-3 rounded-xl border border-border/40 min-w-0">
            <span className="text-[10px] text-muted-foreground uppercase font-medium block mb-1">
              Target Platform
            </span>
            <div className="grid grid-cols-3 gap-1 bg-background/90 p-1 rounded-lg border border-border/40">
              <button
                type="button"
                onClick={() => setPlatform("kickstarter")}
                className={`text-[10px] font-semibold py-1 px-1 rounded text-center truncate transition-all ${
                  platform === "kickstarter"
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Kickstarter"
              >
                Kickstarter
              </button>
              <button
                type="button"
                onClick={() => setPlatform("indiegogo")}
                className={`text-[10px] font-semibold py-1 px-1 rounded text-center truncate transition-all ${
                  platform === "indiegogo"
                    ? "bg-pink-500/20 text-pink-400 border border-pink-500/30 shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Indiegogo"
              >
                Indiegogo
              </button>
              <button
                type="button"
                onClick={() => setPlatform("crowd_supply")}
                className={`text-[10px] font-semibold py-1 px-1 rounded text-center truncate transition-all ${
                  platform === "crowd_supply"
                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Crowd Supply"
              >
                Crowd Supply
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Sub-Navigation Tabs ── */}
      <div className="flex items-center gap-4 border-b border-border/80 pb-2 text-xs font-medium overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab("story")}
          className={`pb-2 transition-all whitespace-nowrap ${
            activeTab === "story"
              ? "border-b-2 border-indigo-400 text-indigo-400 font-bold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          📖 Story &amp; Pitch
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("tiers")}
          className={`pb-2 transition-all whitespace-nowrap ${
            activeTab === "tiers"
              ? "border-b-2 border-indigo-400 text-indigo-400 font-bold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          🎁 Reward Tiers ({campaign.reward_tiers.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("video")}
          className={`pb-2 transition-all whitespace-nowrap ${
            activeTab === "video"
              ? "border-b-2 border-indigo-400 text-indigo-400 font-bold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          🎬 60s Video Script ({campaign.video_script.length} Scenes)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("roadmap")}
          className={`pb-2 transition-all whitespace-nowrap ${
            activeTab === "roadmap"
              ? "border-b-2 border-indigo-400 text-indigo-400 font-bold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          🗺️ 30-Day Launch Roadmap
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("allocation")}
          className={`pb-2 transition-all whitespace-nowrap ${
            activeTab === "allocation"
              ? "border-b-2 border-indigo-400 text-indigo-400 font-bold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          📊 Budget &amp; FAQ
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("checklist")}
          className={`pb-2 transition-all whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === "checklist"
              ? "border-b-2 border-indigo-400 text-indigo-400 font-bold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <span>📋</span>
          <span>Submission Checklist &amp; Guidelines</span>
          {checklistStats.total > 0 && (
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              {checklistStats.completed}/{checklistStats.total}
            </span>
          )}
        </button>
      </div>

      {/* ── TAB 1: STORY & PITCH ── */}
      {activeTab === "story" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
              Campaign Pitch &amp; Origin Narrative
            </h3>
            <div className="flex items-center gap-2">
              {savedSuccess && (
                <span className="text-xs text-emerald-400 font-medium animate-pulse">
                  ✓ Saved successfully
                </span>
              )}
              {isEditingStory ? (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsEditingStory(false)}
                    className="h-7 text-xs border-border/80"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveEdits}
                    disabled={saving}
                    className="h-7 text-xs bg-indigo-600 hover:bg-indigo-500 text-white"
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsEditingStory(true)}
                  className="h-7 text-xs border-border/80 text-foreground"
                >
                  ✏️ Edit Pitch Story
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-xl border border-border/80 bg-card p-5 space-y-3">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                Origin Story &bull; The "Why"
              </span>
              {isEditingStory ? (
                <textarea
                  value={originStory}
                  onChange={(e) => setOriginStory(e.target.value)}
                  rows={6}
                  className="w-full text-xs font-sans p-3 rounded-lg bg-background border border-border focus:ring-1 focus:ring-indigo-500 outline-none leading-relaxed"
                />
              ) : (
                <p className="text-xs text-foreground/90 leading-relaxed whitespace-pre-wrap">
                  {originStory || campaign.origin_story}
                </p>
              )}
            </div>

            <div className="rounded-xl border border-border/80 bg-card p-5 space-y-3">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                Technical Mechanism &bull; How It Works
              </span>
              {isEditingStory ? (
                <textarea
                  value={technicalPitch}
                  onChange={(e) => setTechnicalPitch(e.target.value)}
                  rows={6}
                  className="w-full text-xs font-sans p-3 rounded-lg bg-background border border-border focus:ring-1 focus:ring-indigo-500 outline-none leading-relaxed"
                />
              ) : (
                <p className="text-xs text-foreground/90 leading-relaxed whitespace-pre-wrap">
                  {technicalPitch || campaign.technical_mechanism_pitch}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: REWARD TIERS MATRIX ── */}
      {activeTab === "tiers" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
              Structured 4-Tier Rewards System
            </h3>
            <span className="text-xs text-muted-foreground">
              Designed to drive early surge and maximize backer average pledge
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {campaign.reward_tiers.map((tier) => (
              <div
                key={tier.tier_id}
                className={`rounded-xl border p-5 space-y-3 relative overflow-hidden transition-all ${
                  tier.is_featured
                    ? "border-indigo-500/50 bg-indigo-500/5 shadow-md"
                    : "border-border/80 bg-card"
                }`}
              >
                {tier.is_featured && (
                  <div className="absolute top-0 right-0 bg-indigo-500 text-white text-[10px] font-bold px-3 py-0.5 rounded-bl-lg uppercase tracking-wider">
                    Most Popular
                  </div>
                )}

                <div className="flex items-baseline justify-between gap-2">
                  <h4 className="text-sm font-bold text-foreground">{tier.title}</h4>
                  <div className="text-right">
                    <span className="text-lg font-mono font-bold text-indigo-400">
                      ${tier.pledge_amount}
                    </span>
                    <span className="text-xs text-muted-foreground ml-1">
                      {tier.currency}
                    </span>
                    {tier.retail_price && (
                      <span className="text-xs text-muted-foreground line-through ml-2">
                        ${tier.retail_price}
                      </span>
                    )}
                  </div>
                </div>

                {tier.discount_percentage ? (
                  <span className="inline-block text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                    Save {tier.discount_percentage}% off retail
                  </span>
                ) : null}

                <p className="text-xs text-muted-foreground leading-relaxed">
                  {tier.description}
                </p>

                <div className="pt-2 border-t border-border/40">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-1.5">
                    What Backers Receive:
                  </span>
                  <ul className="space-y-1">
                    {tier.items_included.map((item, idx) => (
                      <li key={idx} className="text-xs text-foreground/80 flex items-center gap-1.5">
                        <span className="text-indigo-400 text-[10px]">&bull;</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-border/40 text-[11px] text-muted-foreground">
                  <span>Est. Delivery: <b className="text-foreground">{tier.estimated_delivery}</b></span>
                  {tier.backer_limit && (
                    <span className="font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                      Limit: {tier.backer_limit} Backers
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB 3: VIDEO STORYBOARD ── */}
      {activeTab === "video" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
              60-Second Campaign Video Cue Sheet
            </h3>
            <span className="text-xs text-muted-foreground font-mono">
              Total Duration: 60 Seconds
            </span>
          </div>

          <div className="space-y-3">
            {campaign.video_script.map((scene) => (
              <div
                key={scene.scene_number}
                className="rounded-xl border border-border/80 bg-card p-4 grid grid-cols-1 md:grid-cols-12 gap-3 items-center"
              >
                <div className="md:col-span-2 flex md:flex-col items-center md:items-start justify-between gap-1">
                  <span className="text-xs font-bold text-indigo-400 font-mono">
                    Scene #{scene.scene_number}
                  </span>
                  <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded font-mono">
                    {scene.timestamp_range}
                  </span>
                </div>

                <div className="md:col-span-5 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">
                    Visual Action
                  </span>
                  <p className="text-xs text-foreground/90 leading-relaxed">
                    {scene.visual_description}
                  </p>
                  {scene.on_screen_text && (
                    <span className="inline-block text-[10px] font-mono text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                      On-Screen: "{scene.on_screen_text}"
                    </span>
                  )}
                </div>

                <div className="md:col-span-5 space-y-1 border-t md:border-t-0 md:border-l border-border/40 pt-2 md:pt-0 md:pl-4">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">
                    Voiceover Audio Script
                  </span>
                  <p className="text-xs text-foreground/80 italic leading-relaxed">
                    "{scene.voiceover_script}"
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB 4: 30-DAY ROADMAP ── */}
      {activeTab === "roadmap" && (
        <div className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
              30-Day Campaign Launch Roadmap
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {campaign.campaign_milestones.map((milestone, idx) => (
                <div key={idx} className="rounded-xl border border-border/80 bg-card p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">
                      {milestone.phase_name}
                    </span>
                    <span className="text-[10px] font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded font-semibold">
                      {milestone.days_range}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    <b>Objective:</b> {milestone.focus_goal}
                  </p>
                  <div className="pt-2 border-t border-border/40 space-y-1.5">
                    {milestone.tactics.map((tactic, tIdx) => (
                      <div key={tIdx} className="text-xs text-foreground/80 flex items-start gap-2">
                        <span className="text-emerald-400 text-xs font-bold">✓</span>
                        <span>{tactic}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-border/40">
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
              <span>⚠️</span>
              <span>Risks, Challenges &amp; Mitigations</span>
            </h3>
            <div className="rounded-xl border border-border/80 bg-card p-4 space-y-2">
              {campaign.risks_and_challenges.map((risk, idx) => (
                <div key={idx} className="text-xs text-muted-foreground flex items-start gap-2.5">
                  <span className="text-amber-400 font-bold shrink-0">&bull;</span>
                  <span className="leading-relaxed">{risk}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 5: ALLOCATION & FAQ ── */}
      {activeTab === "allocation" && (
        <div className="space-y-6">
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
              Budget Allocation &bull; Use of Funds
            </h3>
            <div className="rounded-xl border border-border/80 bg-card p-5 space-y-3">
              <div className="space-y-2.5">
                {campaign.fund_allocation_breakdown.map((item, idx) => {
                  const pct = item.percentage || 0;
                  const dollar = Math.round(campaign.funding_goal * (pct / 100));
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-foreground">{item.category}</span>
                        <span className="font-mono text-muted-foreground">
                          {pct}% (${dollar.toLocaleString()})
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
              Frequently Asked Questions (FAQ)
            </h3>
            <div className="space-y-2">
              {campaign.faq_items.map((faq, idx) => (
                <div key={idx} className="rounded-xl border border-border/80 bg-card p-4 space-y-1">
                  <h4 className="text-xs font-bold text-foreground">Q: {faq.question}</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">A: {faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 6: SUBMISSION CHECKLIST & GUIDES (Subtask 23-2) ── */}
      {activeTab === "checklist" && (
        <div className="space-y-6">
          {currentGuide ? (
            <div className="space-y-6">
              {/* Platform Overview Card */}
              <div className="rounded-xl border border-border/80 bg-card p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/40">
                  <div>
                    <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                      <span>{currentGuide.platform_name} Official Creator Guidelines</span>
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {currentGuide.tagline}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-mono text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/20">
                      Duration: {currentGuide.recommended_duration}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-3 rounded-lg bg-background border border-border/40">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">
                      Funding Model
                    </span>
                    <p className="text-foreground font-medium">{currentGuide.funding_model}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-background border border-border/40">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">
                      Platform Fee Structure
                    </span>
                    <p className="text-foreground font-medium">{currentGuide.fee_structure}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                    Essential Platform Rules:
                  </span>
                  <div className="space-y-1.5">
                    {currentGuide.key_rules.map((rule, idx) => (
                      <div key={idx} className="text-xs text-foreground/80 flex items-start gap-2">
                        <span className="text-indigo-400 font-bold shrink-0">&bull;</span>
                        <span className="leading-relaxed">{rule}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Interactive Checklist & Progress Bar */}
              <div className="rounded-xl border border-border/80 bg-card p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
                      Pre-Submission Readiness Checklist
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Track your readiness prior to submitting the campaign review application
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-mono font-bold text-emerald-400">
                      {checklistStats.percent}% Complete
                    </span>
                    <span className="text-[10px] text-muted-foreground block">
                      ({checklistStats.completed} of {checklistStats.total} verified)
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-300"
                    style={{ width: `${checklistStats.percent}%` }}
                  />
                </div>

                {/* Tasks List */}
                <div className="space-y-2 pt-2">
                  {currentGuide.checklist.map((item) => {
                    const isChecked = Boolean(checkedTasks[item.id]);
                    return (
                      <div
                        key={item.id}
                        onClick={() => handleToggleChecklistTask(item.id)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
                          isChecked
                            ? "border-emerald-500/40 bg-emerald-500/5 text-foreground"
                            : "border-border/60 bg-background/50 hover:border-border text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}} // handled by div onClick
                          className="mt-0.5 rounded border-border text-emerald-500 focus:ring-emerald-500 shrink-0"
                        />
                        <div className="space-y-0.5 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-foreground">
                              {item.task}
                            </span>
                            {item.mandatory && (
                              <span className="text-[9px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.2 rounded uppercase">
                                Mandatory
                              </span>
                            )}
                            <span className="text-[10px] text-muted-foreground font-mono">
                              [{item.category}]
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground leading-relaxed">
                            {item.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-muted-foreground">
              Loading platform guidelines...
            </div>
          )}
        </div>
      )}

      {/* ── Multi-Platform Markdown Export Modal (Subtask 23-1) ── */}
      {exportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="rounded-2xl border border-indigo-500/40 bg-card p-6 max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border/40">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <span>Formatted Campaign Pitch Exporter</span>
                  <span className="text-[10px] font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded uppercase">
                    {exportFormat}
                  </span>
                </h3>
                <p className="text-xs text-muted-foreground">
                  Ready to copy and paste directly into {exportFormat.toUpperCase()}'s campaign story editor
                </p>
              </div>

              <button
                type="button"
                onClick={() => setExportModalOpen(false)}
                className="text-muted-foreground hover:text-foreground text-lg px-2 py-1"
              >
                ✕
              </button>
            </div>

            {/* Format Switcher Pills */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground font-medium">Export Format:</span>
              <button
                type="button"
                onClick={() => handleOpenExportModal("kickstarter")}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  exportFormat === "kickstarter"
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : "text-muted-foreground hover:text-foreground border border-border/60"
                }`}
              >
                Kickstarter Markdown
              </button>
              <button
                type="button"
                onClick={() => handleOpenExportModal("indiegogo")}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  exportFormat === "indiegogo"
                    ? "bg-pink-500/20 text-pink-400 border border-pink-500/30"
                    : "text-muted-foreground hover:text-foreground border border-border/60"
                }`}
              >
                Indiegogo Pitch
              </button>
              <button
                type="button"
                onClick={() => handleOpenExportModal("crowdsupply")}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  exportFormat === "crowdsupply"
                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                    : "text-muted-foreground hover:text-foreground border border-border/60"
                }`}
              >
                Crowd Supply Spec
              </button>
            </div>

            {/* Markdown Display Box */}
            <div className="flex-1 overflow-y-auto bg-background/80 border border-border/60 rounded-xl p-4 font-mono text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed select-all max-h-[50vh]">
              {exportingMd ? (
                <div className="flex items-center justify-center p-8 text-muted-foreground">
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent mr-2" />
                  Generating platform-specific markdown...
                </div>
              ) : (
                exportedContent
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs">
              <span className="text-muted-foreground font-mono">
                {exportedWordCount.toLocaleString()} Words &bull; UTF-8 Markdown
              </span>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setExportModalOpen(false)}
                  className="h-8 text-xs border-border/80 text-muted-foreground"
                >
                  Close
                </Button>
                <Button
                  size="sm"
                  onClick={handleCopyExportedMarkdown}
                  className="h-8 text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
                >
                  {copiedMd ? "✓ Copied to Clipboard!" : "Copy Full Markdown"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
