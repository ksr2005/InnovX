"use client";

import React from "react";

export function HowItWorks() {
  const steps = [
    {
      number: "01",
      badge: "AI Decomposition",
      title: "Technical Feature Extraction",
      description:
        "Paste your technical concept or rough invention notes. Gemini decomposes your idea into discrete mechanical, chemical, or algorithmic features and formulates targeted prior-art query vectors.",
      icon: "⚡",
      gradient: "from-blue-500/20 to-indigo-500/10",
      accent: "text-blue-400",
      border: "border-blue-500/30",
    },
    {
      number: "02",
      badge: "Deep Search",
      title: "250M+ Global Triangulation",
      description:
        "Parallel real-time search across 250M+ academic works (OpenAlex), 2.4M+ preprints (arXiv), and 10M+ patent grants (USPTO PatentsView) to uncover both published research and issued IP claims.",
      icon: "🌐",
      gradient: "from-emerald-500/20 to-teal-500/10",
      accent: "text-emerald-400",
      border: "border-emerald-500/30",
    },
    {
      number: "03",
      badge: "Evidence First",
      title: "Sentence-Level Evidence & Scoring",
      description:
        "Local sentence-transformers rank semantic overlap. Verbatim evidence sentences are extracted directly from literature — zero hallucinations. We score your innovation across 6 quantitative dimensions.",
      icon: "🔬",
      gradient: "from-purple-500/20 to-pink-500/10",
      accent: "text-purple-400",
      border: "border-purple-500/30",
    },
    {
      number: "04",
      badge: "Execution",
      title: "The 4 Commercialization Paths",
      description:
        "Transform validation into reality: Generate provisional patent filing packages (Protect), publish defensive disclosures (Share), license via NDA-gated marketplace (Connect), or launch on Kickstarter (Build).",
      icon: "🚀",
      gradient: "from-amber-500/20 to-orange-500/10",
      accent: "text-amber-400",
      border: "border-amber-500/30",
    },
  ];

  const dataSources = [
    {
      name: "OpenAlex",
      count: "250M+",
      label: "Scholarly Works & Journals",
      desc: "Comprehensive global academic index covering peer-reviewed science, engineering, and medicine.",
      badge: "Academic Index",
      color: "border-blue-500/40 text-blue-400 bg-blue-500/10",
    },
    {
      name: "arXiv",
      count: "2.4M+",
      label: "Research Preprints",
      desc: "Bleeding-edge open-access preprints in Computer Science, EE, Physics, AI, and Mathematics.",
      badge: "Preprint Archive",
      color: "border-rose-500/40 text-rose-400 bg-rose-500/10",
    },
    {
      name: "USPTO PatentsView",
      count: "10M+",
      label: "Patent Grants & Claims",
      desc: "Official United States Patent and Trademark Office database with full claim boundaries and classification codes.",
      badge: "Patent Database",
      color: "border-emerald-500/40 text-emerald-400 bg-emerald-500/10",
    },
  ];

  return (
    <section className="space-y-12 py-8">
      {/* Section Title */}
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <span className="text-[11px] font-mono uppercase font-bold tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
          Workflow Architecture
        </span>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          How InnovX Validates &amp; Launches Innovations
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
          From an unrefined technical concept to sentence-level prior-art evidence and execution-ready commercial deliverables.
        </p>
      </div>

      {/* 4 Steps Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {steps.map((step) => (
          <div
            key={step.number}
            className={`rounded-2xl border ${step.border} bg-gradient-to-b ${step.gradient} p-6 space-y-4 shadow-sm hover:shadow-md transition-all relative overflow-hidden group`}
          >
            <div className="flex items-center justify-between">
              <span className="text-2xl p-2.5 rounded-xl bg-background/80 border border-border/60 shadow-inner">
                {step.icon}
              </span>
              <span className="text-2xl font-mono font-black text-muted-foreground/30 group-hover:text-muted-foreground/60 transition-colors">
                {step.number}
              </span>
            </div>

            <div className="space-y-1.5">
              <span className={`text-[10px] font-mono uppercase font-bold tracking-wider ${step.accent}`}>
                {step.badge}
              </span>
              <h3 className="text-base font-bold text-foreground tracking-tight">
                {step.title}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {step.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Real-Time Data Sources Showcase */}
      <div className="rounded-2xl border border-border/80 bg-card/60 backdrop-blur-sm p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/40">
          <div>
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <span>Triangulated Knowledge Sources</span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                100% Free &bull; Zero Hallucination
              </span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              InnovX queries the world's most authoritative scientific and patent repositories simultaneously.
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground shrink-0">
            <div>
              <span className="text-lg font-bold text-foreground">262M+</span>
              <span className="text-[10px] block text-muted-foreground">Total Indexed Records</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {dataSources.map((source, idx) => (
            <div
              key={idx}
              className="p-5 rounded-xl border border-border/60 bg-background/70 space-y-3 hover:border-border transition-all"
            >
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded border ${source.color}`}>
                  {source.badge}
                </span>
                <span className="text-xl font-mono font-bold text-foreground">
                  {source.count}
                </span>
              </div>

              <div>
                <h4 className="text-sm font-bold text-foreground">{source.name}</h4>
                <span className="text-[11px] text-muted-foreground block font-medium">
                  {source.label}
                </span>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                {source.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
