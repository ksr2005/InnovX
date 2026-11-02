"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import {
  Shield,
  Search,
  FileText,
  Lock,
  Cpu,
  Share2,
  Users,
  Rocket,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Database,
  Terminal,
  Sparkles,
  ChevronDown,
  Layers,
  Award,
  Zap,
} from "lucide-react";

export default function AboutPage() {
  const [activePipelineStep, setActivePipelineStep] = useState(0);
  const [activeRuleCategory, setActiveRuleCategory] = useState<"all" | "ip" | "trust" | "ethics">("all");
  const [activePathway, setActivePathway] = useState<"protect" | "share" | "connect" | "build">("protect");
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // ── PIPELINE STEPS DATA ──
  const pipelineSteps = [
    {
      id: "decomposition",
      badge: "Step 01 &bull; Decomposition",
      title: "Technological Feature Decomposition",
      tagline: "Breaking monolithic ideas into atomic testable engineering vectors.",
      description:
        "Generative LLMs fail at prior-art search because whole-idea queries are noisy and vague. InnovX extracts explicit technological features, domain taxonomy, problem-solution vectors, and potential novelty vectors before initiating any external query.",
      inputSample: "Autonomous underwater drone for microplastic collection using acoustic acoustic-trapping and solar-powered inductive buoyancy control.",
      outputBullets: [
        "Feature 1: Megasonic & acoustic acoustic-trapping of sub-millimeter particles in liquid",
        "Feature 2: Inductive buoyancy-driven continuous vertical displacement engine",
        "Feature 3: Solar-harvesting autonomous surface docking and particulate compacting chamber",
      ],
      metrics: "3 to 6 distinct technical vectors extracted per idea",
    },
    {
      id: "triangulation",
      badge: "Step 02 &bull; Triangulation",
      title: "Multi-Repository Global Triangulation",
      tagline: "Concurrent query execution across 250M+ scientific and patent corpora.",
      description:
        "We fire asynchronous targeted queries across three orthogonal global data lakes without centralizing or compromising inventor IP. We query OpenAlex (peer-reviewed scientific literature), arXiv (cutting-edge preprints), and USPTO PatentsView (active patents and published grants).",
      inputSample: "Query targets: OpenAlex API + arXiv Export API + USPTO PatentsView Engine",
      outputBullets: [
        "250M+ Peer-Reviewed Journals & Conference Proceedings (OpenAlex)",
        "2.4M+ Cutting-Edge STEM Preprints (arXiv)",
        "15M+ Granted US Patents & Published Applications (USPTO)",
      ],
      metrics: "Triple-repository coverage with zero paywalled walled gardens",
    },
    {
      id: "alignment",
      badge: "Step 03 &bull; Semantic Vector Alignment",
      title: "Cloud-Hosted High-Dimensional Embedding",
      tagline: "3072-dimensional vector cosine similarity with 0 MB server memory footprint.",
      description:
        "Rather than relying on brittle keyword matching or heavy local neural weights that crash server memory, InnovX leverages cloud-hosted Google Gemini Embeddings (3072 dimensions) with mathematical cosine distance projection. Documents are ranked by conceptual proximity, not superficial vocabulary.",
      inputSample: "Cosine Alignment Matrix: dot(Norm(Feature_i), Norm(Document_j))",
      outputBullets: [
        "Dense 3072-dimensional semantic concept projection",
        "Zero server RAM consumption (eliminates Out-Of-Memory backend crashes)",
        "Deterministic mathematical cosine similarity rankings",
      ],
      metrics: "0 MB server RAM footprint &bull; Sub-second vector projection",
    },
    {
      id: "evidence",
      badge: "Step 04 &bull; Evidence Extraction",
      title: "Sentence-Level Evidence Extraction",
      tagline: "Strict zero-hallucination constraint with verbatim quotation & DOIs.",
      description:
        "InnovX never lets an LLM guess or hallucinate prior art. For every high-similarity candidate, our constrained evidence engine extracts verbatim sentences from the actual paper abstract or patent specification, assigning a verified coverage level (None, Partial, Substantial, Full).",
      inputSample: "Verbatim Match Rule: Extracted claim must exist verbatim in retrieved abstract",
      outputBullets: [
        "Sentence-level verbatim quotations from verified source documents",
        "Direct hyperlinks to official DOIs, arXiv URLs, and USPTO patent numbers",
        "Explicit classification of coverage: None (0%), Partial (<40%), Substantial (40-75%), Full (>75%)",
      ],
      metrics: "100% Citation Grounding &bull; 0% Hallucinated Prior Art",
    },
  ];

  // ── THE 6 STATUTORY RULES (Properly Numbered 1 to 6) ──
  const rules = [
    {
      number: 1,
      name: "Prior Art Density Signal",
      category: "ip",
      ruleTag: "Terminological Integrity",
      principle: "Never call any algorithmic metric a 'patentability score.'",
      detail:
        "Algorithmic systems cannot predict patent grant outcomes. Whether an innovation is legally patentable depends on non-obviousness under 35 U.S.C. § 103, patent eligibility under 35 U.S.C. § 101, and formal examination by a licensed patent examiner. InnovX reports 'Prior Art Density' and 'Feature Novelty Signal' to reflect factual document retrieval, preserving legal integrity.",
      badgeColor: "emerald",
    },
    {
      number: 2,
      name: "Evidence-Bound Zero Hallucination",
      category: "ethics",
      ruleTag: "Algorithmic Grounding",
      principle: "Every comparative claim must be anchored to a linked verbatim evidence sentence.",
      detail:
        "Standard LLMs fabricate citations, imaginary DOIs, and non-existent patent numbers. InnovX strictly forbids speculative claims. Every prior-art finding in the Feature Matrix is linked directly to an exact quoted sentence from an authentic OpenAlex, arXiv, or USPTO document, paired with a permanent clickable citation URL.",
      badgeColor: "cyan",
    },
    {
      number: 3,
      name: "Search Scope Limitations & Disclaimers",
      category: "ip",
      ruleTag: "Statutory Disclaimers",
      principle: "Explicitly disclose search boundaries on every report.",
      detail:
        "Prior art search is never complete: pending patent applications are held confidential for 18 months under 35 U.S.C. § 122(b); foreign databases in non-English languages are outside scope; and unindexed trade literature may exist. InnovX explicitly attaches a Search Limitations notice to every report, ensuring inventors understand search boundaries.",
      badgeColor: "amber",
    },
    {
      number: 4,
      name: "Private by Default Architecture",
      category: "trust",
      ruleTag: "IP Shielding",
      principle: "Your innovation is invisible to everyone unless explicitly published.",
      detail:
        "Premature public disclosure can destroy patent rights globally under 35 U.S.C. § 102 (and absolute novelty requirements under European Patent Convention Article 54). InnovX isolates every user submission inside an encrypted cryptographic vault with Supabase Row-Level Security (RLS). No third party, competitor, or automated crawler can view your work.",
      badgeColor: "purple",
    },
    {
      number: 5,
      name: "Deterministic SHA-256 Provenance",
      category: "trust",
      ruleTag: "Immutable Cryptography",
      principle: "Establish provable conception priority using SHA-256 without tokens or blockchain.",
      detail:
        "Blockchain tokens, NFTs, and cryptocurrency gas fees are unnecessary and legally volatile. InnovX computes deterministic cryptographic SHA-256 hash chains across your raw technical input, structured features, and ISO timestamps. This creates an unforgeable digital audit trail to support conception priority under the America Invents Act (AIA).",
      badgeColor: "indigo",
    },
    {
      number: 6,
      name: "The Disclosure Paradox & Mutual NDA Shield",
      category: "trust",
      ruleTag: "Commercialization Security",
      principle: "Never reveal technical specifications without cryptographic mutual confidentiality acceptance.",
      detail:
        "Inventors need collaborators and licensees, but disclosing details risks theft. InnovX's Marketplace resolves this 'Disclosure Paradox' using automated AI sanitization: only a non-confidential teaser is public. Detailed claims, schematics, and code are locked behind an electronically executed, timestamped Mutual NDA.",
      badgeColor: "rose",
    },
  ];

  const filteredRules =
    activeRuleCategory === "all"
      ? rules
      : rules.filter((r) => r.category === activeRuleCategory);

  // ── THE 4 PATHWAYS ──
  const pathways = {
    protect: {
      title: "Protect — Patent Filing Guidance & Prep Package",
      badge: "Intellectual Property Fortress",
      icon: "🛡️",
      tagline: "Scaffold provisional patent applications with structured claims before spending $10k+ on attorneys.",
      features: [
        "35 U.S.C. § 112 compliant specification structure (Abstract, Field, Background, Detailed Description)",
        "Independent and dependent claim drafting scaffold highlighting your unique novelty vectors",
        "Prior art disclosure statement (IDS) package compiling retrieved OpenAlex & USPTO references",
        "Instant educational export to Markdown and PDF for seamless attorney review",
      ],
      recommendation: "Recommended when Feature Novelty Signal is High (>70%) and commercial value warrants patent exclusivity.",
    },
    share: {
      title: "Share — Defensive Publication Generator",
      badge: "Prior-Art Inoculation",
      icon: "📜",
      tagline: "Permanently block patent trolls and competitors from patenting your discovery.",
      features: [
        "Generates formal Defensive Publications formatted for research registries and open journals",
        "Establishes immediate statutory prior art under 35 U.S.C. § 102(a)(1) worldwide",
        "Cryptographically anchored with SHA-256 timestamp hash to prove exact date of public disclosure",
        "One-click export ready for submission to IP.com, ResearchGate, or Zenodo",
      ],
      recommendation: "Recommended for open-source software, academic researchers, and protocols where freedom-to-operate beats exclusivity.",
    },
    connect: {
      title: "Connect — Confidential NDA-Gated Marketplace",
      badge: "The Disclosure Paradox Solved",
      icon: "🤝",
      tagline: "Attract enterprise buyers and licensing partners without exposing trade secrets.",
      features: [
        "AI Sanitizer creates non-confidential public teasers removing proprietary implementation details",
        "Full technical blueprints, source code, and CAD models locked behind a legally binding Mutual NDA",
        "Dual-role verified access requests: inventors review partner credentials before approving access",
        "Encrypted in-platform confidential inquiry channels for structured licensing negotiations",
      ],
      recommendation: "Recommended for commercial prototypes, enterprise B2B solutions, and deep-tech inventions seeking capital or acquisition.",
    },
    build: {
      title: "Build — Crowdfunding & Federal Grant Studio",
      badge: "Commercial Execution",
      icon: "🚀",
      tagline: "Launch on Kickstarter/Indiegogo and match with US SBIR/STTR non-dilutive grants.",
      features: [
        "Multi-tier reward structures, backer personas, and pitch scripts optimized for Kickstarter & Indiegogo",
        "Comprehensive 30-day pre-launch and campaign execution calendar with risk disclosures",
        "Algorithmic US SBIR/STTR Federal Grant matching (NSF, DOE, DOD, NIH, DARPA Phase I/II eligibility)",
        "Venture Capital and angel thesis matching based on technology taxonomy and market opportunity",
      ],
      recommendation: "Recommended for hardware devices, consumer physical innovations, and breakthrough applied scientific research.",
    },
  };

  // ── FAQS ──
  const faqs = [
    {
      q: "Does InnovX provide legal advice or formally file patents?",
      a: "No. InnovX is an educational, analytical, and workflow automation platform. We provide deep prior-art intelligence, feature-level evidence extraction, and drafting scaffolds to dramatically reduce legal prep costs. We do not provide legal counsel, nor do we file patents with government bodies. Always have an authorized patent attorney review your materials prior to official filing.",
    },
    {
      q: "Why did you transition from local SentenceTransformers to Google Cloud Embeddings?",
      a: "Local PyTorch and SentenceTransformer weights consumed between 450 MB and 570 MB of memory on server instances, exceeding the 512 MiB limit on cloud hosting tiers and causing Out-Of-Memory (OOM) crashes during concurrent queries. By integrating Google's cloud-hosted Gemini Embedding 001 model (3072 dimensions), our backend memory footprint dropped to under 70 MB (0 MB model RAM), enabling lightning-fast, ultra-stable vector ranking with zero server crashes.",
    },
    {
      q: "How does InnovX eliminate AI hallucinations in prior art search?",
      a: "Standard generative AI models hallucinate because they attempt to 'recall' literature from memory. InnovX never asks the LLM to recall papers. Instead, we query verified external public APIs (OpenAlex, arXiv, USPTO), retrieve the authentic text, compute mathematical vector similarities, and instruct the LLM strictly to quote verbatim sentences from the fetched text. If a claim is not in the text, it is marked as unverified.",
    },
    {
      q: "Is my idea kept confidential and private?",
      a: "Yes. By statutory principle and architectural design, InnovX is Private by Default. Your idea is encrypted in transit and stored in a private cryptographic vault governed by Supabase Row-Level Security (RLS). Nobody—not other users, not web scrapers, and not public search engines—can view your submissions unless you explicitly list a sanitized teaser on the Marketplace.",
    },
    {
      q: "Why do you use SHA-256 hashing instead of blockchain or NFTs?",
      a: "Blockchain tokens, gas fees, and NFTs introduce unnecessary financial volatility, complex wallet requirements, and questionable legal utility in statutory patent tribunals. Standard SHA-256 cryptographic hashing provides mathematically irrefutable, deterministic proof of document state and timestamp priority recognized under international digital evidence standards.",
    },
    {
      q: "What is the 'Disclosure Paradox' and how does the Marketplace solve it?",
      a: "The Disclosure Paradox (Arrow's Information Paradox) states that an innovator cannot sell or license an idea without revealing its value, but once revealed, the recipient has no incentive to pay for it. InnovX solves this by generating an AI-sanitized teaser that explains what the technology accomplishes without revealing how it works. Proprietary details remain locked until the prospective buyer signs a binding Mutual NDA.",
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-emerald-500/30">
      <Navbar />

      <main className="flex-1 w-full mx-auto max-w-6xl px-4 sm:px-6 py-10 sm:py-16 space-y-24">
        {/* ── HERO SECTION ── */}
        <section className="text-center space-y-6 animate-in fade-in duration-500 pt-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-semibold shadow-sm">
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            <span>The Operating System for Technical Creators &bull; Architecture &amp; Methodology</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight max-w-4xl mx-auto leading-tight sm:leading-none">
            Democratizing Prior-Art Discovery &amp;
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
              Commercial Breakthroughs
            </span>
          </h1>

          <p className="text-sm sm:text-base text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            InnovX eliminates the <b>&quot;Valley of Death&quot;</b> for inventors, researchers, and scientific founders.
            We decompose technical concepts into atomic features, triangulate across <b>250M+ papers and patents</b> with
            zero hallucination, secure cryptographic conception priority, and guide you across 4 concrete pathways:
            <span className="text-foreground font-semibold"> Protect</span>,
            <span className="text-foreground font-semibold"> Share</span>,
            <span className="text-foreground font-semibold"> Connect</span>, and
            <span className="text-foreground font-semibold"> Build</span>.
          </p>

          {/* Quick Metrics Ribbon */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-4xl mx-auto pt-6">
            <div className="p-4 rounded-2xl bg-card border border-border/80 text-left shadow-sm">
              <div className="text-2xl font-black text-emerald-400">250M+</div>
              <div className="text-xs font-semibold text-foreground mt-0.5">Academic Works</div>
              <div className="text-[11px] text-muted-foreground">Indexed via OpenAlex</div>
            </div>
            <div className="p-4 rounded-2xl bg-card border border-border/80 text-left shadow-sm">
              <div className="text-2xl font-black text-cyan-400">15M+</div>
              <div className="text-xs font-semibold text-foreground mt-0.5">USPTO Patents</div>
              <div className="text-[11px] text-muted-foreground">Full patent corpus</div>
            </div>
            <div className="p-4 rounded-2xl bg-card border border-border/80 text-left shadow-sm">
              <div className="text-2xl font-black text-indigo-400">0 MB</div>
              <div className="text-xs font-semibold text-foreground mt-0.5">Server Model RAM</div>
              <div className="text-[11px] text-muted-foreground">Cloud Gemini Embeddings</div>
            </div>
            <div className="p-4 rounded-2xl bg-card border border-border/80 text-left shadow-sm">
              <div className="text-2xl font-black text-amber-400">100%</div>
              <div className="text-xs font-semibold text-foreground mt-0.5">Private by Default</div>
              <div className="text-[11px] text-muted-foreground">Supabase RLS &amp; Vault</div>
            </div>
          </div>
        </section>

        {/* ── INTERACTIVE 4-STAGE TRIANGULATION ENGINE ── */}
        <section className="space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-secondary text-foreground text-xs font-mono font-semibold">
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              <span>THE 4-STAGE TRIANGULATION PIPELINE</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              How the Deep Analysis Engine Operates
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl mx-auto">
              Click through each pipeline phase below to see how raw technical descriptions undergo rigorous mathematical decomposition, multi-repository search, and grounded evidence extraction.
            </p>
          </div>

          {/* Interactive Steps Navigation */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 border border-border/70 p-1.5 rounded-2xl bg-card/60 backdrop-blur-sm">
            {pipelineSteps.map((step, idx) => (
              <button
                key={step.id}
                onClick={() => setActivePipelineStep(idx)}
                className={`py-3 px-3 rounded-xl text-left transition-all cursor-pointer flex flex-col gap-1 ${
                  activePipelineStep === idx
                    ? "bg-secondary border border-emerald-500/40 text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400">
                    Phase 0{idx + 1}
                  </span>
                  {activePipelineStep === idx && (
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                  )}
                </div>
                <div className="text-xs font-bold truncate">{step.title}</div>
              </button>
            ))}
          </div>

          {/* Active Step Interactive Showcase Card */}
          <div className="border border-border/80 rounded-2xl p-6 sm:p-8 bg-card shadow-sm space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/50 pb-4">
              <div>
                <span
                  className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider"
                  dangerouslySetInnerHTML={{ __html: pipelineSteps[activePipelineStep].badge }}
                />
                <h3 className="text-xl sm:text-2xl font-bold text-foreground mt-0.5">
                  {pipelineSteps[activePipelineStep].title}
                </h3>
                <p className="text-xs text-muted-foreground font-medium mt-0.5">
                  {pipelineSteps[activePipelineStep].tagline}
                </p>
              </div>

              <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold shrink-0">
                {pipelineSteps[activePipelineStep].metrics}
              </div>
            </div>

            <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed">
              {pipelineSteps[activePipelineStep].description}
            </p>

            {/* Simulated Data Execution Box */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-muted/40 border border-border/60 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-muted-foreground">
                  <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                  <span>SYSTEM EXECUTION SIGNATURE</span>
                </div>
                <p className="text-xs font-mono text-cyan-300/90 bg-background/80 p-3 rounded-lg border border-border/40">
                  {pipelineSteps[activePipelineStep].inputSample}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-muted/40 border border-border/60 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-muted-foreground">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>KEY VERIFIED DELIVERABLES</span>
                </div>
                <ul className="space-y-1.5 text-xs text-foreground/90">
                  {pipelineSteps[activePipelineStep].outputBullets.map((bullet, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-emerald-400 font-bold">&bull;</span>
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ── THE 6 STATUTORY & ETHICAL AI RULES (PROPERLY NUMBERED 1 TO 6) ── */}
        <section className="space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-secondary text-foreground text-xs font-mono font-semibold">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>THE 6 NON-NEGOTIABLE CANONS</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Ethical &amp; Statutory Core Architecture
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl mx-auto">
              Every query, metric, and report strictly conforms to these 6 engineering mandates. Filter by category to understand why InnovX is trusted by academic inventors and institutional researchers.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            {[
              { id: "all", label: "All 6 Rules" },
              { id: "ip", label: "Patent & Legal Integrity" },
              { id: "trust", label: "Security & Provenance" },
              { id: "ethics", label: "Algorithmic Grounding" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveRuleCategory(tab.id as typeof activeRuleCategory)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                  activeRuleCategory === tab.id
                    ? "bg-emerald-600 text-white shadow-sm font-semibold"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Rules Grid (Strictly numbered 1 to 6) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRules.map((rule) => (
              <div
                key={rule.number}
                className="border border-border/80 rounded-2xl p-5 bg-card hover:border-emerald-500/40 transition-all flex flex-col justify-between space-y-4 shadow-sm"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                      Rule 0{rule.number}
                    </span>
                    <span className="text-[10px] uppercase font-mono text-muted-foreground">
                      {rule.ruleTag}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-foreground">
                    {rule.name}
                  </h3>

                  <div className="p-2.5 rounded-xl bg-muted/60 border border-border/60 text-xs font-semibold text-emerald-300">
                    &quot;{rule.principle}&quot;
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {rule.detail}
                  </p>
                </div>

                <div className="pt-2 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Enforced by Backend Guardrails</span>
                  <span className="text-emerald-400 font-bold">✓ Active</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── THE 4 COMMERCIALIZATION PATHWAYS ── */}
        <section className="space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-secondary text-foreground text-xs font-mono font-semibold">
              <Rocket className="w-3.5 h-3.5 text-cyan-400" />
              <span>WHAT TO DO NEXT</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              The 4 Creator Execution Pathways
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl mx-auto">
              Research tools leave you stranded with a bibliography. InnovX gives you 4 actionable commercial routes directly post-report.
            </p>
          </div>

          {/* Pathway Selector */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              { id: "protect", label: "Protect", icon: "🛡️", sub: "Patent Prep" },
              { id: "share", label: "Share", icon: "📜", sub: "Defensive Pub" },
              { id: "connect", label: "Connect", icon: "🤝", sub: "NDA Marketplace" },
              { id: "build", label: "Build", icon: "🚀", sub: "Campaign & Grants" },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setActivePathway(p.id as typeof activePathway)}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                  activePathway === p.id
                    ? "bg-secondary border-emerald-500/50 shadow-md text-foreground"
                    : "border-border/60 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{p.icon}</span>
                  <span className="text-xs font-bold">{p.label}</span>
                </div>
                <span className="text-[10px] text-muted-foreground">{p.sub}</span>
              </button>
            ))}
          </div>

          {/* Active Pathway Deep Dive */}
          <div className="border border-border/80 rounded-2xl p-6 sm:p-8 bg-card shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/50 pb-4">
              <div>
                <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">
                  {pathways[activePathway].badge}
                </span>
                <h3 className="text-xl sm:text-2xl font-bold text-foreground mt-0.5">
                  {pathways[activePathway].title}
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  {pathways[activePathway].tagline}
                </p>
              </div>

              <div className="text-3xl p-3 rounded-2xl bg-secondary/80 border border-border/60 shrink-0">
                {pathways[activePathway].icon}
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Core Capabilities &amp; Artifacts Delivered
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {pathways[activePathway].features.map((feat, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-muted/40 border border-border/60 flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span className="text-xs text-foreground/90">{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-xs text-cyan-300 flex items-center gap-2">
              <Zap className="w-4 h-4 shrink-0 text-cyan-400" />
              <span><b>Best Practice Recommendation:</b> {pathways[activePathway].recommendation}</span>
            </div>
          </div>
        </section>

        {/* ── ZERO-RAM CLOUD ARCHITECTURE & SECURITY ── */}
        <section className="border border-border/80 rounded-3xl p-6 sm:p-10 bg-gradient-to-br from-card via-card to-background space-y-8 shadow-sm">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-secondary text-foreground text-xs font-mono font-semibold">
              <Cpu className="w-3.5 h-3.5 text-emerald-400" />
              <span>ENGINEERING RESILIENCE</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Zero-RAM Server Footprint &amp; Cryptographic Security
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl">
              InnovX was engineered from the ground up to solve the real-world operational bottlenecks of modern AI applications.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-background/80 border border-border/60 space-y-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Database className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-foreground">Cloud Embedding (0 MB RAM)</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                By delegating vector encoding to Google&apos;s cloud-hosted 3072-dimensional Gemini embeddings, we completely eliminated heavy PyTorch and SentenceTransformers binaries, reducing backend container RAM from 570 MB to under 70 MB and eliminating Render OOM crashes.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-background/80 border border-border/60 space-y-3">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <Lock className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-foreground">Supabase Vault &amp; Row-Level Security</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Your portfolio, innovation drafts, and encrypted marketplace listings are isolated via Postgres Row-Level Security (RLS) policies. Only the authenticated author with a valid cryptographic JWT can read or modify their entries.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-background/80 border border-border/60 space-y-3">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <Award className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-foreground">Deterministic SHA-256 Provenance</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                We generate deterministic SHA-256 hash digests across raw concepts and structured claims. This provides mathematically irrefutable evidence of your date of conception for AIA 35 U.S.C. § 102 priority, without blockchain or NFT tokens.
              </p>
            </div>
          </div>
        </section>

        {/* ── INTERACTIVE FAQ ACCORDION ── */}
        <section className="space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-secondary text-foreground text-xs font-mono font-semibold">
              <span>❓</span>
              <span>TECHNICAL &amp; LEGAL TRANSPARENCY</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-xl mx-auto">
              Everything you need to know about security, methodology, citation accuracy, and execution.
            </p>
          </div>

          <div className="space-y-3 max-w-3xl mx-auto">
            {faqs.map((faq, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <div
                  key={index}
                  className="border border-border/80 rounded-2xl bg-card overflow-hidden transition-all shadow-sm"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                    className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 cursor-pointer hover:bg-muted/30 transition-colors"
                  >
                    <span className="text-xs sm:text-sm font-bold text-foreground">
                      {faq.q}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200 ${
                        isOpen ? "rotate-180 text-emerald-400" : ""
                      }`}
                    />
                  </button>

                  {isOpen && (
                    <div className="px-4 pb-4 sm:px-5 sm:pb-5 pt-0 text-xs text-muted-foreground leading-relaxed border-t border-border/40 animate-in fade-in duration-200">
                      <div className="pt-3">{faq.a}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* ── CALL TO ACTION / BOTTOM BANNER ── */}
        <section className="text-center p-8 sm:p-12 rounded-3xl bg-gradient-to-r from-emerald-500/15 via-card to-cyan-500/15 border border-emerald-500/30 space-y-6 shadow-lg">
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            Ready to Discover What Makes Your Idea Unique?
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-xl mx-auto">
            Decompose your concept, find verified prior art across 250M+ scientific records, and get instant execution roadmaps.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/">
              <Button className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs sm:text-sm h-10 px-6 shadow-md transition-all">
                <span>Start Analyzing an Idea</span>
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>

            <Link href="/marketplace">
              <Button variant="outline" className="text-xs sm:text-sm h-10 px-6 border-border/80 hover:bg-secondary">
                <span>Explore NDA Marketplace</span>
              </Button>
            </Link>
          </div>
        </section>
      </main>

      {/* ── FOOTER ── */}
      <footer className="border-t border-border/60 bg-card/40 py-8 text-center text-xs text-muted-foreground space-y-2">
        <p className="font-medium text-foreground/80">
          InnovX &bull; AI-Powered Innovation Discovery, Validation &amp; Commercialization Engine
        </p>
        <p className="max-w-xl mx-auto text-[11px] leading-relaxed">
          Ground-truth evidence extraction across OpenAlex, arXiv, and USPTO PatentsView.
          Private by default. SHA-256 cryptographic provenance.
        </p>
      </footer>
    </div>
  );
}

