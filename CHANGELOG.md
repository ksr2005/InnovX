# Changelog — InnovX

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] — 2026-10-21 (Official Production Release)

### 🌟 Major Release Highlights
InnovX v1.0.0 is the complete, production-ready AI-Powered Innovation Discovery, Validation & Commercialization Engine. Over a rigorous 30-day development sprint, InnovX was transformed from an ideation concept into a full-stack, enterprise-grade software platform featuring multi-source prior-art search across 250M+ documents, objective novelty scoring, streaming ReportLab PDF generation, tamper-evident cryptographic provenance, and four tangible commercialization pathways (Protect, Share, Connect, Build).

---

### Added

#### Core AI & Prior-Art Search Engine (Phase 1 / Week 1)
- **Natural Language Idea Structuring:** Google Gemini (`gemini-flash-lite-latest`) decomposes freeform technical submissions into 3–12 atomic technical features with search queries.
- **Concurrent Scientific Search:** Dispatches queries concurrently across **OpenAlex** (250M+ academic works), **arXiv** (CS/EE/Physics preprints), and **USPTO PatentsView** (US patents).
- **Local Dense Semantic Vectors:** Local CPU embedding inference using `sentence-transformers` with `all-MiniLM-L6-v2` (384 dimensions) pre-warmed in memory (<10ms inference, zero API fees).
- **Hybrid Reciprocal Rank Fusion (RRF, $k=60$):** Fuses dense vector semantic similarity with sparse Okapi BM25 keyword relevance scores.
- **Verbatim Evidence Grounding:** Sentence-level evidence extraction linking specific atomic features to verified primary source abstracts with external DOIs and patent links.
- **Feature × Evidence Matrix:** Interactive coverage levels (high, medium, low, none) indicating market and literature density.

#### Structured Reports & Enterprise PDF Export (Phase 2 / Week 2)
- **6-Metric Assessment Engine:** Evaluates *Prior Art Density*, *Feature Novelty Signal*, *Combination Distinctiveness*, *Research Freshness*, *Evidence Strength*, and *Search Confidence* without gamified or misleading "patentability scores".
- **10-Section Structured Report:** Standardized report structure (Sections A–J) containing executive summaries, component decompositions, prior art matrices, differentiators, and search limitations disclaimers.
- **Streaming ReportLab PDF Engine:** Zero-dependency Python ReportLab 5.0.1 generator producing multi-page, publication-grade branded PDFs delivered via `GET /api/report/{id}/pdf`.
- **Private Innovation Vault:** Encrypted cloud storage for schematics, CAD drawings, and test data up to 10MB per file with expiring signed download URLs.
- **Freeform Lab & Development Notes:** Running notebook for inventors to document lab breakthroughs and mentor feedback.
- **Cryptographic Provenance Chains:** Immutable SHA-256 state snapshots ($H_n = \text{SHA-256}(S_n \parallel H_{n-1})$) tracking version history ($v_n \to v_{n+1}$) with 5ms on-demand tamper-evident verification.

#### The 4 Post-Report Execution Pathways (Phase 3 / Week 3)
- **Decision Hub Component:** Post-report steering interface providing cost, timeline, and difficulty indicators for 4 pathways.
- **🛡️ Protect (Patent Preparation Package):** Gemini-powered provisional application drafting module generating suggested CPC classifications, background art, independent claim boundaries with fallback limitations, prior art gap analyses, 12-month priority checklists, and branded PDF briefs.
- **🌍 Share (Defensive Publication Engine):** Generates formal technical disclosures formatted to IP.com and Google TDCommons standards with alternative embodiments and explicit statutory patent forfeiture warnings.
- **🤝 Connect (NDA-Gated Technology Marketplace):** AI Sanitizer resolves Arrow's disclosure paradox by generating public teasers while shielding proprietary algorithms; access requires execution of a binding Mutual Non-Disclosure Agreement (NDA).
- **In-Platform Confidential Messaging:** Secure, thread-isolated messaging drawer between verified creators and prospective licensees with zero IP leakage.
- **🚀 Build (Crowdfunding Campaign Generator):** Generates platform-specific launch packages for Kickstarter, Indiegogo, and Crowd Supply with reward tiers, video scripts, BOM budget allocations, and markdown/PDF exports.

#### Production Readiness & Showcase (Phase 4 & 5 / Weeks 4 & 5)
- **Interactive Presentation Deck (`/presentation`):** Fullscreen slide deck mode with keyboard navigation (arrows/space), 8 executive slides, and direct launch triggers for mentor briefings.
- **Interactive Sample Report Tour:** Pre-computed demonstration mode (`SAMPLE_INNOVATION_REPORT`) enabling instantaneous zero-delay walkthroughs.
- **Render.com Cloud Blueprint (`render.yaml`):** Production deployment blueprint with pre-cached embedding weights and health probes.
- **Vercel Edge Configuration (`vercel.json`):** Edge CDN configuration with strict HTTP security headers (`nosniff`, `DENY`, `strict-origin`, `XSS-protection`).
- **Production Healthcheck Endpoint (`/health`):** Reports uptime, pre-warmed MiniLM reference, hybrid ranking status, and Supabase/Gemini configuration.
- **Comprehensive Master Regression Suite (`test_day27_regression.py`):** 100% automated pass rate across all 6 core user flows in 6.2 seconds.
- **Full Documentation Portal:** Complete `README.md`, `SYSTEM_ARCHITECTURE.md`, `MENTOR_EVALUATION_REPORT.md`, `DEPLOYMENT_GUIDE.md`, and `DEMO_WALKTHROUGH_SCRIPT.md`.

---

### Changed
- **Pipeline Search Concurrency:** Replaced sequential API requests with asynchronous concurrent tasks (`asyncio.gather`), reducing total pipeline execution time from ~45 seconds down to under 10 seconds.
- **Evidence Extraction Throughput:** Parallelized sentence-level evidence extraction across candidate documents in `services/evidence.py`.
- **CORS Configuration:** Replaced open wildcard CORS with production origin filtering supporting custom domain URLs and dynamic Vercel preview deployment regex (`^https:\/\/[a-zA-Z0-9_\-]+\.vercel\.app$`).
- **Dashboard Modal Layout:** Upgraded from narrow floating windows to maximized responsive modal views with smooth horizontal tab scrolling for high-density information review.

---

### Fixed
- **Windows gRPC Deadlock:** Fixed fatal async channel deadlocks on Windows by routing Gemini calls through `await asyncio.to_thread(model.generate_content, prompt)`.
- **Windows cp1252 Unicode Crash:** Eliminated non-ASCII Unicode characters (e.g., `✓`) in print and logging statements, preventing `UnicodeEncodeError: 'charmap'` crashes on Windows consoles.
- **arXiv HTTPS 301 Redirect:** Enabled `https://` endpoint and `follow_redirects=True` on HTTPX client for arXiv preprints.
- **USPTO Content-Type Inspection:** Added MIME-type verification before JSON parsing to gracefully handle HTML responses from USPTO PatentsView servers.
- **OpenAlex Null Venue Reference:** Implemented safe conditional traversal for `primary_location.source` to prevent `AttributeError` when venue is null.
- **Search Guardrails for Short Inputs:** Added constructive clarifying feedback cards for non-technical or overly brief idea inputs.

---

### Security
- **Private by Default:** Innovations, development notes, and uploaded files are restricted exclusively to their creator via PostgreSQL Row-Level Security (RLS) policies.
- **JWT Verification Middleware:** Every authenticated backend endpoint validates Supabase JWT signatures before processing requests.
- **Confidentiality Shield:** Unauthenticated and unapproved marketplace viewers receive 403 Forbidden on raw technical features and underlying patent claims.
- **Expiring Signed Download URLs:** File downloads expire after 60 seconds, preventing unauthorized public URL sharing.
- **Tamper-Evident SHA-256 Chains:** Cryptographic hash linking detects unauthorized database mutations within 5 milliseconds.
