"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";

interface SlideData {
  id: string;
  badge: string;
  title: string;
  subtitle: string;
  category: string;
  bullets: {
    headline: string;
    detail: string;
    icon: string;
  }[];
  statBox?: {
    value: string;
    label: string;
    sublabel: string;
  };
  visualType: "architecture" | "metrics" | "pathways" | "provenance" | "benchmarks" | "problem";
}

const SLIDES: SlideData[] = [
  {
    id: "vision",
    badge: "Capstone Executive Presentation",
    title: "InnovX: AI-Powered Innovation Discovery & Commercialization",
    subtitle: "Eliminating the 'Valley of Death' for academic, scientific, and independent inventors.",
    category: "Executive Overview",
    visualType: "problem",
    bullets: [
      {
        icon: "🔍",
        headline: "The Prior-Art Blindspot",
        detail: "Over 250M+ academic works and patents exist worldwide, yet manual search is fractured, slow, and cost-prohibitive for creators.",
      },
      {
        icon: "⚠️",
        headline: "The Generative AI Hallucination Barrier",
        detail: "Standard conversational LLMs fabricate citations, DOIs, and patent claim language, creating severe legal and liability hazards.",
      },
      {
        icon: "🚀",
        headline: "The Execution Void",
        detail: "Existing research search engines stop at a list of papers. InnovX automatically generates 4 concrete execution paths: Protect, Share, Connect, and Build.",
      },
    ],
    statBox: {
      value: "250M+",
      label: "Indexed Works",
      sublabel: "OpenAlex · arXiv · USPTO",
    },
  },
  {
    id: "architecture",
    badge: "System Architecture & Triangulation",
    title: "Triangulated Multi-Database Prior Art Search",
    subtitle: "Concurrently querying global academic and patent indices with zero hallucination.",
    category: "Technical Architecture",
    visualType: "architecture",
    bullets: [
      {
        icon: "⚡",
        headline: "Sub-2s Concurrent Dispatch",
        detail: "Dispatches search queries concurrently across OpenAlex (250M+ works), arXiv (preprints), and USPTO PatentsView using asyncio.gather().",
      },
      {
        icon: "🔬",
        headline: "Verbatim Evidence Extraction",
        detail: "Extracts direct sentence-level quotes from candidate abstracts with verifiable DOI and patent office links.",
      },
      {
        icon: "🛡️",
        headline: "Resilient Fallback Guardrails",
        detail: "Gracefully handles API rate limits, non-JSON patent payloads, and redirects with automatic status degradation reporting.",
      },
    ],
    statBox: {
      value: "3x–4x",
      label: "Search Speedup",
      sublabel: "via asyncio Concurrency",
    },
  },
  {
    id: "rrf-engine",
    badge: "Hybrid Ranking Algorithms",
    title: "Reciprocal Rank Fusion (RRF, k=60) & MiniLM",
    subtitle: "Fusing local dense semantic vectors with sparse Okapi BM25 keyword relevance.",
    category: "Machine Learning & IR",
    visualType: "metrics",
    bullets: [
      {
        icon: "🧠",
        headline: "Local CPU Semantic Embeddings",
        detail: "Pre-warmed all-MiniLM-L6-v2 transformer (384 dimensions) runs locally in ~10ms with zero external API fees or rate limits.",
      },
      {
        icon: "⚖️",
        headline: "Information Retrieval Benchmark Standard",
        detail: "Fuses semantic cosine similarity with BM25 (k1=1.5, b=0.75) using reciprocal rank fusion smoothing (k=60).",
      },
      {
        icon: "📊",
        headline: "Search Transparency Audit",
        detail: "Live modal exposes exact queries dispatched, lexical vs. semantic ranks, and per-source document yields.",
      },
    ],
    statBox: {
      value: "<10ms",
      label: "Embedding Inference",
      sublabel: "Local CPU Execution",
    },
  },
  {
    id: "metrics-engine",
    badge: "Evaluation Framework",
    title: "6 Objective Innovation Assessment Metrics",
    subtitle: "Evidence-grounded scoring calibrated without speculative 'patentability scores'.",
    category: "Assessment Engine",
    visualType: "metrics",
    bullets: [
      {
        icon: "📊",
        headline: "Prior Art Density & Feature Novelty",
        detail: "Measures concentration of literature and identifies specific atomic features with low existing coverage.",
      },
      {
        icon: "🧬",
        headline: "Combination Distinctiveness & Freshness",
        detail: "Evaluates multi-modal feature coupling and publication recency across the 2024–2026 academic window.",
      },
      {
        icon: "🎯",
        headline: "Evidence Strength & Search Confidence",
        detail: "Scores verbatim sentence match quality and cross-database triangulation completeness.",
      },
    ],
    statBox: {
      value: "6",
      label: "Objective Metrics",
      sublabel: "Rule 1 Compliant",
    },
  },
  {
    id: "pathways",
    badge: "Commercialization Pathways",
    title: "Post-Report Decision Hub: The 4 Creator Paths",
    subtitle: "Bridging the gap from validation to commercial protection and distribution.",
    category: "Commercialization",
    visualType: "pathways",
    bullets: [
      {
        icon: "🛡️",
        headline: "Protect (Patent Preparation Package)",
        detail: "Suggests CPC classifications, drafts independent claim boundaries with fallback limitations, and generates branded PDF filing briefs.",
      },
      {
        icon: "🌍",
        headline: "Share (Defensive Publication Engine)",
        detail: "Produces formal disclosures formatted for IP.com & TDCommons with alternative embodiments to secure Freedom-to-Operate (FTO).",
      },
      {
        icon: "🤝",
        headline: "Connect (NDA-Gated Marketplace)",
        detail: "AI Sanitizer resolves the disclosure paradox with public teasers; full technical claims unlock only upon Mutual NDA execution.",
      },
      {
        icon: "🚀",
        headline: "Build (Crowdfunding Campaign Generator)",
        detail: "Generates formatted launch briefs for Kickstarter, Indiegogo, and Crowd Supply with tiered rewards, video scripts, and BOM budgets.",
      },
    ],
    statBox: {
      value: "4",
      label: "Execution Paths",
      sublabel: "Tailored to Creator Goals",
    },
  },
  {
    id: "provenance",
    badge: "Data Integrity & Cryptography",
    title: "Private by Default & SHA-256 Provenance Chains",
    subtitle: "Tamper-evident version evolution without speculative cryptocurrency or blockchain overhead.",
    category: "Security & Provenance",
    visualType: "provenance",
    bullets: [
      {
        icon: "🔒",
        headline: "Private by Default Architecture",
        detail: "Every innovation, note, and attachment is strictly isolated by PostgreSQL Row-Level Security (RLS) to the authenticated creator.",
      },
      {
        icon: "⛓️",
        headline: "Deterministic Version Hash Linking",
        detail: "Each iteration calculates H_n = SHA-256(Snapshot_n || H_{n-1}), establishing an immutable timeline of inventorship.",
      },
      {
        icon: "✅",
        headline: "5-Millisecond Audit Verification",
        detail: "Creators and attorneys can audit the cryptographic chain on-demand, flagging corrupted or tampered records instantly.",
      },
    ],
    statBox: {
      value: "100%",
      label: "Tamper Detection",
      sublabel: "Mathematical Proof",
    },
  },
  {
    id: "benchmarks",
    badge: "Quality Assurance & Performance",
    title: "Verification Proofs, Regression & Production Status",
    subtitle: "Zero regressions across all 6 core user flows with sub-10s execution latency.",
    category: "Verification & Testing",
    visualType: "benchmarks",
    bullets: [
      {
        icon: "🧪",
        headline: "Automated Day 27 Master Regression Suite",
        detail: "100% test pass rate across analysis, streaming PDF export, protect/share/connect/build pathways, and provenance verification.",
      },
      {
        icon: "⚡",
        headline: "Total Pipeline Runtime: 6.2 Seconds",
        detail: "Concurrent search queries and parallel Gemini evidence extraction satisfy the sub-45s pipeline response threshold.",
      },
      {
        icon: "☁️",
        headline: "Production Ready on Render & Vercel",
        detail: "FastAPI Docker container with pre-warmed embeddings + Next.js Turbopack edge distribution with strict security headers.",
      },
    ],
    statBox: {
      value: "6.2s",
      label: "Suite Runtime",
      sublabel: "0 Regressions Found",
    },
  },
];

export default function PresentationPage() {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const currentSlide = SLIDES[currentSlideIndex];

  const nextSlide = useCallback(() => {
    setCurrentSlideIndex((prev) => Math.min(prev + 1, SLIDES.length - 1));
  }, []);

  const prevSlide = useCallback(() => {
    setCurrentSlideIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") {
        e.preventDefault();
        nextSlide();
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        prevSlide();
      } else if (e.key === "Home") {
        e.preventDefault();
        setCurrentSlideIndex(0);
      } else if (e.key === "End") {
        e.preventDefault();
        setCurrentSlideIndex(SLIDES.length - 1);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [nextSlide, prevSlide]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between selection:bg-emerald-500/20">
      {!isFullscreen && <Navbar />}

      {/* Main Presentation Stage */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8 flex flex-col justify-center">
        {/* Top Control Bar */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-border/60">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {currentSlide.badge}
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              Slide {currentSlideIndex + 1} of {SLIDES.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleFullscreen}
              className="h-8 text-xs gap-1.5"
            >
              {isFullscreen ? "Exit Fullscreen" : "⛶ Fullscreen Mode"}
            </Button>
            <Link href="/?tour=true">
              <Button size="sm" className="h-8 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold gap-1.5">
                <span>🚀</span>
                <span>Launch Live Product Tour</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Slide Canvas */}
        <div className="bg-card/90 border border-border/80 rounded-3xl p-8 sm:p-12 shadow-2xl relative overflow-hidden backdrop-blur min-h-[500px] flex flex-col justify-between animate-in fade-in duration-300">
          {/* Subtle Ambient Gradient Glow */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

          {/* Slide Header */}
          <div className="space-y-3 relative z-10">
            <div className="text-xs font-mono uppercase tracking-widest text-emerald-400 font-semibold">
              {currentSlide.category}
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground leading-tight">
              {currentSlide.title}
            </h1>
            <p className="text-base text-muted-foreground max-w-3xl leading-relaxed">
              {currentSlide.subtitle}
            </p>
          </div>

          {/* Slide Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 my-8 relative z-10">
            {/* Bullets List */}
            <div className="lg:col-span-2 space-y-4">
              {currentSlide.bullets.map((bullet, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-4 p-4 rounded-2xl bg-secondary/40 border border-border/60 hover:bg-secondary/70 transition-colors"
                >
                  <span className="text-2xl p-2 rounded-xl bg-background/80 border border-border/80 shrink-0">
                    {bullet.icon}
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">
                      {bullet.headline}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      {bullet.detail}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Stat Callout Card */}
            {currentSlide.statBox && (
              <div className="flex flex-col justify-center items-center p-8 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-card to-secondary/30 border border-emerald-500/30 text-center relative overflow-hidden">
                <div className="text-5xl sm:text-6xl font-black text-emerald-400 tracking-tight font-mono">
                  {currentSlide.statBox.value}
                </div>
                <div className="text-sm font-bold text-foreground mt-2">
                  {currentSlide.statBox.label}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {currentSlide.statBox.sublabel}
                </div>
              </div>
            )}
          </div>

          {/* Slide Footer Navigation */}
          <div className="flex items-center justify-between pt-6 border-t border-border/60 relative z-10">
            <div className="flex items-center gap-1.5">
              {SLIDES.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setCurrentSlideIndex(i)}
                  className={`h-2 rounded-full transition-all ${
                    i === currentSlideIndex
                      ? "w-8 bg-emerald-500"
                      : "w-2 bg-muted hover:bg-muted-foreground/40"
                  }`}
                  aria-label={`Go to slide ${i + 1}`}
                />
              ))}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={prevSlide}
                disabled={currentSlideIndex === 0}
                className="h-9 px-4 text-xs font-semibold gap-1"
              >
                ← Previous
              </Button>
              <Button
                size="sm"
                onClick={nextSlide}
                disabled={currentSlideIndex === SLIDES.length - 1}
                className="h-9 px-4 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white gap-1"
              >
                Next Slide →
              </Button>
            </div>
          </div>
        </div>

        {/* Keyboard Shortcut Guidance */}
        <div className="mt-4 text-center text-[11px] text-muted-foreground">
          Use <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border/80 font-mono text-[10px]">←</kbd> and{" "}
          <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border/80 font-mono text-[10px]">→</kbd> or{" "}
          <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border/80 font-mono text-[10px]">Space</kbd> to navigate slides.
        </div>
      </main>
    </div>
  );
}
