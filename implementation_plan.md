# InnovX Engine — 4-Week Build Plan

## Goal

Build a working AI-powered prior-art intelligence engine with four creator paths (Protect / Share / Connect / Build), deployed and demo-ready, in 28 days.

## Tech Stack (All Free Tier)

| Layer | Technology | Why This One |
|---|---|---|
| **Frontend** | Next.js 14 (App Router) + Tailwind CSS + shadcn/ui | Fastest path to a polished, responsive UI. shadcn gives you production-grade components out of the box. |
| **Backend API** | FastAPI (Python 3.11+) | Python is mandatory for the AI/NLP pipeline. FastAPI is async, fast, and has automatic OpenAPI docs. |
| **Database** | Supabase (PostgreSQL + pgvector + Auth + Storage) | One free service gives you relational DB, vector search, user auth, and file storage. No need to wire 4 services. |
| **AI / LLM** | Google AI Studio — Gemini 2.0 Flash | 1,500 free requests/day, 1M token context, structured JSON output. Best free-tier AI available. |
| **Embeddings** | `sentence-transformers` (`all-MiniLM-L6-v2`) running locally in FastAPI | Zero API cost, ~22MB model, runs on CPU in milliseconds. |
| **Research Search** | OpenAlex API (free, 250M+ works) | No API key needed. Best free academic search API. |
| **Preprint Search** | arXiv API (free) | Direct access to CS, EE, Math, Physics preprints. |
| **Patent Search** | USPTO PatentsView API (free) | Official US patent data, no key needed for basic access. |
| **Provenance** | Python `hashlib` (SHA-256) + Postgres timestamps | Zero infrastructure. Cryptographic proof stored in your own DB. |
| **Frontend Deploy** | Vercel (free tier) | Auto-deploys from Git, HTTPS, edge CDN. |
| **Backend Deploy** | Render.com (free tier) | Free web service for FastAPI. Sleeps after 15 min inactivity (fine for demos). |

---

## Project Structure

```
innovx/
├── frontend/                   # Next.js 14 app
│   ├── app/
│   │   ├── page.tsx            # Landing / idea submission
│   │   ├── analyze/
│   │   │   └── [id]/page.tsx   # Analysis results page
│   │   ├── report/
│   │   │   └── [id]/page.tsx   # Full report view
│   │   ├── dashboard/
│   │   │   └── page.tsx        # User's innovations
│   │   ├── marketplace/
│   │   │   └── page.tsx        # NDA-gated listings (Week 3)
│   │   ├── campaign/
│   │   │   └── [id]/page.tsx   # Campaign generator (Week 4)
│   │   └── layout.tsx
│   ├── components/
│   │   ├── IdeaInput.tsx
│   │   ├── FeatureMatrix.tsx
│   │   ├── PriorArtCard.tsx
│   │   ├── ReportView.tsx
│   │   ├── InnovationCard.tsx
│   │   └── ...
│   └── lib/
│       ├── api.ts              # Backend API client
│       └── supabase.ts         # Supabase client
│
├── backend/                    # FastAPI app
│   ├── main.py                 # FastAPI app entry
│   ├── routers/
│   │   ├── analyze.py          # /api/analyze endpoints
│   │   ├── search.py           # /api/search endpoints
│   │   ├── report.py           # /api/report endpoints
│   │   ├── innovations.py      # /api/innovations CRUD
│   │   ├── marketplace.py      # /api/marketplace (Week 3)
│   │   └── campaign.py         # /api/campaign (Week 4)
│   ├── services/
│   │   ├── structuring.py      # Gemini idea decomposition
│   │   ├── search_openalex.py  # OpenAlex API client
│   │   ├── search_arxiv.py     # arXiv API client
│   │   ├── search_patents.py   # USPTO PatentsView client
│   │   ├── similarity.py       # Embedding + comparison
│   │   ├── evidence.py         # Sentence-level evidence extraction
│   │   ├── scoring.py          # Innovation assessment metrics
│   │   ├── provenance.py       # SHA-256 hashing + versioning
│   │   ├── report_gen.py       # PDF/report generation
│   │   └── campaign_gen.py     # Crowdfunding campaign generator
│   ├── models/
│   │   ├── schemas.py          # Pydantic models
│   │   └── database.py         # Supabase/Postgres connection
│   └── requirements.txt
│
└── README.md
```

---

## WEEK 1 — "The Brain" (Core AI Engine)

**Deliverable to Mentor:** A working API and basic UI where a user types an idea, the system decomposes it into technical features, searches 3 databases, and returns a feature-vs-evidence matrix.

### Day 1 (Monday) — Project Setup & Skeleton

- [ ] Initialize Git repo
- [ ] Create `frontend/` with `npx create-next-app@latest` (TypeScript, App Router, Tailwind)
- [ ] Install shadcn/ui: `npx shadcn@latest init` + add Button, Card, Input, Textarea, Badge, Table, Tabs components
- [ ] Create `backend/` with FastAPI skeleton
- [ ] Install core Python packages:
  ```
  fastapi uvicorn python-dotenv httpx
  google-generativeai sentence-transformers
  supabase python-jose pydantic
  ```
- [ ] Set up Supabase project (free tier):
  - Enable pgvector extension
  - Create tables: `users`, `innovations`, `features`, `prior_art_results`, `reports`
- [ ] Get Google AI Studio API key (free)
- [ ] Verify: FastAPI returns `{"status": "ok"}` on `GET /health`
- [ ] Verify: Next.js renders a landing page with a text area

### Day 2 (Tuesday) — Idea Structuring Engine

- [ ] Build `services/structuring.py`:
  - Takes raw text idea as input
  - Calls Gemini 2.0 Flash with structured JSON output (Pydantic schema)
  - Returns:
    ```json
    {
      "title": "...",
      "problem_statement": "...",
      "proposed_solution": "...",
      "domain": "...",
      "key_features": [
        {
          "id": "F1",
          "description": "GPS-denied navigation using acoustic positioning",
          "category": "software/navigation",
          "search_queries": ["acoustic indoor positioning", "GPS-denied robot navigation"]
        }
      ],
      "target_applications": ["mining", "underground inspection"],
      "technical_components": {
        "hardware": ["acoustic sensors", "IMU", "gas detectors"],
        "software": ["SLAM algorithm", "sensor fusion", "semantic filtering"],
        "methods": ["acoustic ranging", "particle filter localization"]
      }
    }
    ```
- [ ] Build `POST /api/analyze/structure` endpoint
- [ ] Test with 5 different ideas, verify decomposition quality
- [ ] Tune the Gemini prompt until features are specific enough for search

### Day 3 (Wednesday) — Search Engine: OpenAlex + arXiv

- [ ] Build `services/search_openalex.py`:
  - For each extracted feature, query OpenAlex API
  - Parse results: title, authors, publication date, abstract, DOI, citation count
  - Return top 10 results per feature
- [ ] Build `services/search_arxiv.py`:
  - Query arXiv API using the Atom feed
  - Parse results: title, authors, date, abstract, arXiv ID, categories
  - Return top 10 results per feature
- [ ] Build `POST /api/search/research` endpoint that fans out queries across both APIs
- [ ] Test: submit the underground mining robot idea, verify relevant papers come back

### Day 4 (Thursday) — Search Engine: USPTO Patents

- [ ] Build `services/search_patents.py`:
  - Query USPTO PatentsView API
  - Parse results: patent title, patent number, filing date, abstract, assignee, CPC codes, claims
  - Return top 10 patents per feature
- [ ] Build `POST /api/search/patents` endpoint
- [ ] Aggregate all search results into a unified format:
  ```json
  {
    "source": "openalex|arxiv|uspto",
    "title": "...",
    "authors": "...",
    "date": "...",
    "abstract": "...",
    "url": "...",
    "relevance_feature": "F1"
  }
  ```
- [ ] Test: end-to-end from idea → structure → search across all 3 sources

### Day 5 (Friday) — Similarity Engine & Embeddings

- [ ] Build `services/similarity.py`:
  - Load `all-MiniLM-L6-v2` model (runs on CPU)
  - Embed each extracted feature description
  - Embed each retrieved document's abstract
  - Compute cosine similarity between feature embeddings and document embeddings
  - Rank results by similarity score
- [ ] Build `services/evidence.py`:
  - For each (feature, top-document) pair, send both to Gemini Flash
  - Prompt: "Extract the exact sentence(s) from this abstract that relate to this feature. If no sentence matches, return null."
  - Return the evidence sentence or "No direct evidence found"
- [ ] Integrate into the search pipeline: search → embed → rank → extract evidence
- [ ] Test: verify that evidence sentences are real (not hallucinated) by spot-checking

### Day 6 (Saturday) — Feature Matrix & Basic Frontend

- [ ] Build the unified `POST /api/analyze` endpoint that chains:
  - Structure → Search → Similarity → Evidence → Matrix
- [ ] Return the complete feature matrix:
  ```json
  {
    "innovation_id": "INV-001",
    "features": [
      {
        "id": "F1",
        "description": "GPS-denied acoustic navigation",
        "prior_art": [
          {
            "title": "Indoor Acoustic Positioning for Robots",
            "source": "openalex",
            "similarity": 0.82,
            "evidence_sentence": "We propose an acoustic ranging system for...",
            "url": "https://doi.org/..."
          }
        ],
        "coverage": "high|medium|low|none"
      }
    ]
  }
  ```
- [ ] Build frontend `IdeaInput.tsx`: text area + submit button + loading state
- [ ] Build frontend `FeatureMatrix.tsx`: table showing features × evidence
- [ ] Wire frontend to backend API
- [ ] Test: full flow from typing idea in browser to seeing the matrix

### Day 7 (Sunday) — Polish, Bugs, Mentor Prep

- [ ] Fix bugs from the week
- [ ] Add error handling (API failures, rate limits, empty results)
- [ ] Add loading states and skeleton UI
- [ ] Write a 1-page summary for mentor: what was built, what works, screenshots
- [ ] Prepare 3 demo ideas to show the mentor

> **Week 1 Deliverable:** A user types an idea → AI decomposes into features → system searches OpenAlex, arXiv, USPTO → returns a feature-by-feature evidence matrix with real citations. Working in browser.

---

## WEEK 2 — "The Report" (Assessment + Report + Provenance)

**Deliverable to Mentor:** Full innovation assessment with multi-dimensional scoring, a comprehensive downloadable report, user accounts, and SHA-256 provenance for every innovation.

### Day 8 (Monday) — Innovation Assessment Engine

- [ ] Build `services/scoring.py` with these metrics (each 0–100):
  - **Prior-Art Density**: How much existing work covers the idea's features
  - **Feature Novelty**: % of features with low/no prior art coverage
  - **Combination Distinctiveness**: Does this specific combination appear anywhere?
  - **Research Freshness**: Average age of the closest matching papers
  - **Evidence Strength**: Quality of sources (patents > peer-reviewed > preprints > web)
  - **Search Confidence**: Coverage of search (how many sources searched, result counts)
- [ ] Each score must include a one-sentence explanation and supporting references
- [ ] Build the overall assessment summary using Gemini:
  - Input: all scores + feature matrix
  - Output: 3-paragraph natural language assessment
- [ ] **No gamified labels** (no "Rare" / "Epic"). Just honest scores with explanations.

### Day 9 (Tuesday) — Report Generation

- [ ] Build `services/report_gen.py`:
  - Takes: innovation record + feature matrix + scores + assessment
  - Generates a structured report with sections:
    - A. Executive Summary
    - B. Structured Idea (problem, solution, architecture)
    - C. Search Methodology (sources, dates, queries used)
    - D. Prior Art Found (organized by feature)
    - E. Feature Comparison Matrix
    - F. Similarity Analysis (overlaps and gaps)
    - G. Potential Differentiators
    - H. Innovation Assessment (scores + explanations)
    - I. Search Confidence & Limitations
    - J. Recommended Next Steps
  - Output as structured JSON (for web rendering)
- [ ] Build `GET /api/report/{innovation_id}` endpoint
- [ ] Build frontend `ReportView.tsx`: renders the full report with collapsible sections, linked citations, and highlighted evidence

### Day 10 (Wednesday) — PDF Export

- [ ] Install `weasyprint` or `reportlab` in backend
- [ ] Build PDF generation from the report JSON
- [ ] Add InnovX branding, table formatting, clickable links
- [ ] Build `GET /api/report/{innovation_id}/pdf` endpoint
- [ ] Add "Download PDF" button in frontend
- [ ] Test: generate PDF for 3 different ideas, verify it looks professional

### Day 11 (Thursday) — User Authentication & Dashboard

- [ ] Set up Supabase Auth in frontend:
  - Email/password signup + login
  - Google OAuth (optional, easy with Supabase)
- [ ] Build auth middleware in FastAPI that validates Supabase JWT tokens
- [ ] Build `dashboard/page.tsx`:
  - List of user's submitted innovations
  - Status indicators (Analyzing / Completed / Private)
  - Click to view full report
- [ ] Build `POST /api/innovations` (create), `GET /api/innovations` (list user's), `GET /api/innovations/{id}` (detail)
- [ ] All innovations are **private by default** — only visible to the creator

### Day 12 (Friday) — Provenance System

- [ ] Build `services/provenance.py`:
  - On every innovation creation and every update:
    - Serialize the full innovation record to canonical JSON
    - Compute `SHA-256` hash
    - Store in `provenance_records` table: `innovation_id`, `version`, `hash`, `timestamp`, `previous_hash`
  - This creates an **immutable hash chain** per innovation — each version references the previous hash
- [ ] Build `GET /api/innovations/{id}/provenance` endpoint:
  - Returns the complete version history with hashes and timestamps
- [ ] Build frontend provenance view:
  - Timeline showing each version with its hash and timestamp
  - "Verify" button that re-computes the hash from stored data to prove integrity
- [ ] Build version comparison: show what changed between versions

### Day 13 (Saturday) — Innovation Vault & File Uploads

- [x] Build file upload system using Supabase Storage:
  - Support: PDF, images, text documents
  - Max 10MB per file (free tier limit)
  - Files stored encrypted, linked to innovation record
- [x] Build idea editing: user can update their idea, system re-runs analysis
  - Each edit creates a new provenance record (new hash, new version)
- [x] Build the "Private Vault" view:
  - All innovations, reports, files, provenance history in one dashboard
  - Search and filter user's own innovations
- [x] Add "development notes" field: free-text notes the user can add over time

### Day 14 (Sunday) — Week 2 Polish & Mentor Prep

- [x] End-to-end test: signup → submit idea → view matrix → view report → download PDF → check provenance
- [x] Fix UI polish: responsive design, dark/light mode, loading states
- [x] Write mentor summary: features built, screenshots, demo plan

> **Week 2 Deliverable:** Complete analysis pipeline with multi-dimensional scoring, professional PDF report, user accounts, private innovation vault with file uploads, and SHA-256 provenance chain. Fully functional in browser.

---

## WEEK 3 — "The Paths" (Protect + Share + Connect)

**Deliverable to Mentor:** Three of the four creator paths working: patent filing guidance, defensive publication export, and NDA-gated marketplace listings.

### Day 15 (Monday) — "What Do You Want to Do?" Decision UI ✅ COMPLETE

- [x] After report is generated, show a clear decision screen:
  ```
  Your Innovation Report is Ready.
  
  What would you like to do next?
  
  🛡️ PROTECT — Guide me toward filing a patent
  🌍 SHARE — Publish a defensive disclosure
  🤝 CONNECT — List for licensing / co-development (private, NDA-gated)
  🚀 BUILD — Help me create a crowdfunding campaign
  ```
- [x] Each option shows a 2-sentence explanation of what it means
- [x] User can select multiple paths (they're not mutually exclusive)
- [x] Store user's selected path(s) in the innovation record

### Day 16 (Tuesday) — Protect Path (Patent Filing Guidance) ✅ COMPLETE

- [x] Build a "Patent Readiness" page with:
  - Explanation of provisional vs. non-provisional patent applications
  - Cost breakdown by entity type (micro: $80, small: $160, large: $320 at USPTO)
  - Link to USPTO EFS-Web / Patent Center filing system
  - Link to India IPO e-filing portal
  - Link to EPO, WIPO
  - ⚠️ Disclaimer: "This is general information, not legal advice"
- [x] AI-generated "What to include in your provisional application" guide:
  - Gemini takes the structured innovation record
  - Outputs a checklist of what sections to write
  - Suggests which features to emphasize based on the prior-art gaps
- [x] Export: "Download Provisional Application Preparation Package" (PDF)
  - Structured description of the invention
  - Prior art summary
  - Feature differentiation summary
  - Suggested claim areas (explicitly marked as "suggested areas, not legal claims")

### Day 17 (Wednesday) — Share Path (Defensive Publication) ✅ COMPLETE

- [x] Build the Defensive Publication generator:
  - Gemini takes the structured innovation record
  - Generates a formal technical disclosure document in the style of:
    - IBM Technical Disclosure Bulletin
    - Research Disclosure format
    - IP.com Prior Art Database format
  - Includes: title, technical field, cpc_classes, abstract, background, detailed description, embodiment variants, advantages, and cryptographic SHA-256 hash
- [x] Add the statutory IP disclosure warning:
  > "Publishing this document creates public prior art. Once published, neither you nor anyone else can obtain a patent on the disclosed subject matter. This is intentional — it ensures the idea remains free for public use."
- [x] Export options:
  - Download as PDF (multi-page branded ReportLab PDF via `GET /api/innovations/{id}/publish/pdf`)
  - Download as formatted text/markdown (via `GET /api/innovations/{id}/publish/text`)
  - Copy directly to clipboard
  - Recognized registry directory with direct submission links (IP.com, Google TDCommons, Research Disclosure, arXiv.org)
- [x] Store snapshot in the user's vault (`innovations.structured_data["defensive_publication"]`) with SHA-256 provenance hash and UTC timestamp
- [x] Tested and verified: `test_share_day17.py` passed with 100% success; frontend compiled cleanly with 0 TypeScript errors.

### Day 18 (Thursday) — Connect Path (Marketplace Architecture & Sanitizer) ✅ COMPLETE

- [x] Database: `marketplace_listings` table connected in Supabase:
  - `id`, `innovation_id`, `creator_id`, `public_title`, `public_description` (sanitized, non-confidential), `domain`, `stage`, `available_for` (license, sale, co_development, investment), `preferred_terms`, `status`, `created_at`
- [x] AI Sanitizer service (`services/marketplace_sanitizer.py`):
  - Gemini extracts high-level problem, domain, and commercial value proposition
  - Strictly withholds patentable mechanisms, formulas, and secret sauce under Rule 6
  - Robust deterministic safe fallback for quota/error resilience
- [x] Backend API router (`routers/marketplace.py` mounted at `/api/marketplace`):
  - `POST /api/marketplace/sanitize/{innovation_id}` — generates sanitized draft
  - `POST /api/marketplace/listings` — creates or updates listing, updates `innovations.visibility = 'marketplace'`
  - `GET /api/marketplace/listings` — public catalog endpoint with search, domain, stage, and availability filters
  - `GET /api/marketplace/listings/my` — creator's own active/paused listings
  - `GET /api/marketplace/listings/{id}` — single public sanitized listing
  - `PATCH /api/marketplace/listings/{id}` — status toggle and terms editor
  - `DELETE /api/marketplace/listings/{id}` — removes listing and reverts innovation to private
- [x] Listing configuration modal (`MarketplaceListingModal`):
  - Interactive creator editor with live buyer teaser preview card
  - Commercial availability models (license, sale, co-development, investment)
  - Stage selector (concept, detailed design, prototype, mvp)
  - Withheld proprietary elements shield indicators
- [x] Integrated into Creator Vault Dashboard (`🤝 Marketplace` tab) and Decision Hub (`🤝 Configure Listing` quick-launch modal)
- [x] Tested & verified: `test_connect_day18.py` passed 100%; Next.js 16 build passed with 0 errors

### Day 19 (Friday) — Connect Path (Mutual NDA & Access Request Flow) ✅ COMPLETE

- [x] Build `/marketplace` discovery catalog page:
  - Responsive grid of innovation cards showing: public title, domain, stage, commercial availability models, indicative terms
  - Search by domain, technology keywords, or operational problem
  - Filter by stage (Concept, Detailed Design, Prototype, MVP) and collaboration model (License, Sale, Co-dev, Investment)
  - Real-time access status resolution (Sign NDA / Pending / Approved)
- [x] Build "Request Access" & Digital Mutual NDA agreement flow:
  - Buyer clicks "Request Confidential Access (Sign NDA)"
  - Displays formal bilateral tech-transfer Mutual Non-Disclosure Agreement
  - Signer captures: full name, organization, commercial purpose/evaluation scope
  - Mandatory digital signature checkbox with UTSA trade-secret legal binding
  - Submits access request via `POST /api/marketplace/listings/{id}/request-access`
- [x] Backend Access Request & NDA Gating endpoints (`routers/marketplace.py`):
  - `POST /listings/{id}/request-access` — records NDA execution timestamp and pending request
  - `GET /listings/{id}/access-status` — returns buyer's current access tier
  - `GET /access-requests/incoming` — lists inbound buyer requests for creator's portfolio
  - `GET /access-requests/my` — lists requests submitted by current buyer
  - `POST /access-requests/{id}/review` — creator approves or rejects buyer access
  - `GET /listings/{id}/full-report` — **Rule 6 NDA Gating**: strictly blocks unauthorized access (403) and returns complete uncensored technical disclosure once approved
- [x] Uncensored `ConfidentialDisclosureView` component:
  - Displays full problem statement, uncensored proposed solution, feature breakdown, prior-art density & novelty scores, and AI assessment synthesis
  - Direct full PDF report download button
- [x] Creator Inbound Access Requests panel in Dashboard:
  - Real-time pending requests badge
  - One-click `✅ Authorize Uncensored Access` and `Decline` action controls
- [x] Tested & verified: `test_connect_day19.py` passed 100%; Next.js 16 build passed with 0 errors (6 static pages)

### Day 20 (Saturday) — Marketplace Polish

- [x] Build the creator's "Manage Listings" dashboard (`CreatorListingsPanel`):
  - View active listings
  - See access requests (pending / approved / rejected)
  - View messages from interested parties
- [x] Add the "Interested Party" dashboard (`BuyerUnlockedVault` & `MessageThreadsPanel`):
  - Innovations they've requested access to
  - Approved innovations they can view
  - Message threads
- [x] In-Platform Confidential Messaging (`messages` table & `ListingMessagingDrawer`):
  - Endpoints: `POST /messages`, `GET /messages`, `GET /messages/threads`
  - Encrypted/NDA-bound chat drawer accessible from `/marketplace` and `/dashboard`
- [x] Zero IP Leakage & Dual-Role Verification:
  - Unauthorized users receive 403 Forbidden; strictly gated behind Mutual NDA and creator authorization
  - Full automated test suite `test_connect_day20.py` passed 100%
  - Next.js 16 build passed with 0 errors (6 static pages)

### Day 21 (Sunday) — Week 3 Polish & Mentor Prep

- [x] Test all three paths end-to-end (`test_week3_end_to_end.py` passed 100%)
- [x] Fix bugs, improve UI across Decision Hub, drawer, and pathway views
- [x] Write mentor summary deliverable (`WEEK3_MILESTONE_DELIVERABLE.md`) documenting all 3 paths, architecture, and verification matrix

> **Week 3 Deliverable:** Three creator paths working: Patent guidance with downloadable preparation package, Defensive Publication generator with export, and NDA-gated marketplace with access request flow and messaging. ✅ COMPLETE

---

## WEEK 4 — "The Launch" (Build Path + Campaign Generator + Final Polish)

**Deliverable to Mentor:** Complete working platform with all 4 paths, campaign generator, landing page, and deployed to production.

### Day 22 (Monday) — Build Path: Campaign Generator

- [ ] Build `services/campaign_gen.py`:
  - Input: structured innovation record + prior-art report
  - Gemini generates:
    - Campaign title & tagline
    - Problem statement (general audience, 150 words)
    - Solution explanation (how it works, 200 words)
    - What makes this different (from differentiators in report)
    - Development roadmap (3-5 milestones)
    - Budget breakdown template
    - 3-4 reward tier suggestions
    - Risks & challenges section
    - FAQ (5 questions)
    - 60-second video pitch script
- [ ] Build `POST /api/campaign/generate/{innovation_id}` endpoint
- [ ] Build frontend `campaign/[id]/page.tsx`:
  - Displays generated campaign in editable sections
  - User can edit each section
  - Real-time preview of how it would look

### Day 23 (Tuesday) — Campaign Export & Platform Guides

- [ ] Build campaign export:
  - "Download for Kickstarter" — formatted to match Kickstarter's campaign structure
  - "Download for Indiegogo" — formatted for Indiegogo's structure
  - "Download for Crowd Supply" — formatted for hardware projects
  - "Download as General PDF" — platform-agnostic version
- [ ] Each export includes:
  - Step-by-step guide for posting on that specific platform
  - Platform-specific tips (e.g., "Kickstarter requires a risks section")
  - Links to the platform's creator pages
- [ ] Add the IP disclosure warning before campaign generation:
  > ⚠️ "A crowdfunding campaign publicly describes your invention. Consider filing a provisional patent application before launching. [Learn more →]"
- [ ] Add "Generate Campaign" button on the decision screen

### Day 24 (Wednesday) — Landing Page & Onboarding

- [ ] Build a proper landing page (`/`):
  - Hero: tagline + "Paste your idea" input box + "Analyze" button
  - How it works: 4 steps with icons (Submit → Analyze → Report → Choose Path)
  - What we search: logos/names of OpenAlex, arXiv, USPTO
  - The 4 paths: Protect / Share / Connect / Build with brief explanations
  - Disclaimers: "Not legal advice" / "Evidence-based assessment, not guarantee"
  - Footer: about, privacy, terms
- [ ] Build onboarding flow for new users:
  - Brief 3-step tutorial on first login
  - Example report they can explore before submitting their own idea
- [ ] Build an "About" page explaining the platform philosophy

### Day 25 (Thursday) — Search Improvements & Edge Cases

- [ ] Add hybrid search: combine keyword (BM25-style via OpenAlex relevance) + semantic (embedding similarity) using Reciprocal Rank Fusion
- [ ] Handle edge cases:
  - Very short idea submissions (prompt user to add detail)
  - Very broad ideas (AI asks clarifying questions)
  - Ideas in non-technical domains (graceful message: "This platform is optimized for technical innovations")
  - API failures (fallback: show results from APIs that worked, note which failed)
  - Rate limiting (queue requests, show "analyzing..." with progress)
- [ ] Add search methodology transparency:
  - Show exactly which APIs were queried
  - Show the search queries that were generated
  - Show timestamp of when search was performed
  - Show number of results scanned per source

### Day 26 (Friday) — Deployment

- [ ] Deploy backend to Render.com:
  - Create `Dockerfile` or use Render's Python environment
  - Set environment variables (API keys, Supabase URL)
  - Verify `/health` endpoint responds
- [ ] Deploy frontend to Vercel:
  - Connect Git repo
  - Set environment variables (backend URL, Supabase keys)
  - Verify pages load
- [ ] Configure CORS between frontend and backend domains
- [ ] Set up custom domain if you have one (optional)
- [ ] SSL/HTTPS: automatic on both Vercel and Render
- [ ] Test full flow on deployed version (not localhost)

### Day 27 (Saturday) — Final Integration Testing & Bug Fixes

- [ ] Run through every single user flow:
  1. Sign up → Submit idea → View matrix → View report → Download PDF
  2. Select "Protect" → View patent guidance → Download preparation package
  3. Select "Share" → Generate defensive publication → Download
  4. Select "Connect" → Create listing → (second account) → Browse marketplace → Request access → Approve → View → Message
  5. Select "Build" → Generate campaign → Edit → Export for Kickstarter
  6. Check provenance: verify hashes, view version history
- [ ] Fix every bug found
- [ ] Performance: ensure analysis completes in < 60 seconds
- [ ] Mobile responsiveness: test on phone-sized viewport

### Day 28 (Sunday) — Final Mentor Deliverable

- [ ] Record a 5-minute screen recording walking through all features
- [ ] Write final documentation:
  - README.md with setup instructions
  - Architecture diagram
  - API documentation (auto-generated by FastAPI's /docs)
  - List of all features implemented
- [ ] Prepare a 2-page project summary for the mentor:
  - What was built
  - Tech stack used
  - Key design decisions and why
  - What works
  - Known limitations
  - Future roadmap

> **Week 4 Deliverable:** Complete platform deployed to production with all 4 creator paths, campaign generator, polished landing page, and comprehensive documentation.

---

## Database Schema (Supabase PostgreSQL)

```sql
-- Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Users (managed by Supabase Auth, this is for additional profile data)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    full_name TEXT,
    role TEXT DEFAULT 'creator',  -- creator | buyer | both
    bio TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Core innovation records
CREATE TABLE innovations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) NOT NULL,
    title TEXT NOT NULL,
    raw_input TEXT NOT NULL,
    structured_data JSONB,        -- AI-structured output
    status TEXT DEFAULT 'draft',   -- draft | analyzing | completed | archived
    visibility TEXT DEFAULT 'private', -- private | marketplace | published
    current_version INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Extracted features
CREATE TABLE features (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    innovation_id UUID REFERENCES innovations(id) ON DELETE CASCADE,
    feature_id TEXT NOT NULL,     -- F1, F2, etc.
    description TEXT NOT NULL,
    category TEXT,
    search_queries TEXT[],
    embedding VECTOR(384),        -- MiniLM embedding dimension
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Search results
CREATE TABLE prior_art_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    innovation_id UUID REFERENCES innovations(id) ON DELETE CASCADE,
    feature_id TEXT NOT NULL,
    source TEXT NOT NULL,          -- openalex | arxiv | uspto
    title TEXT NOT NULL,
    authors TEXT,
    publication_date TEXT,
    abstract TEXT,
    url TEXT,
    similarity_score FLOAT,
    evidence_sentence TEXT,        -- null if no match
    metadata JSONB,
    embedding VECTOR(384),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Assessment scores
CREATE TABLE assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    innovation_id UUID REFERENCES innovations(id) ON DELETE CASCADE,
    prior_art_density FLOAT,
    feature_novelty FLOAT,
    combination_distinctiveness FLOAT,
    research_freshness FLOAT,
    evidence_strength FLOAT,
    search_confidence FLOAT,
    summary_text TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Provenance chain
CREATE TABLE provenance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    innovation_id UUID REFERENCES innovations(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    document_hash TEXT NOT NULL,   -- SHA-256
    previous_hash TEXT,            -- hash of previous version (null for v1)
    snapshot JSONB NOT NULL,       -- full innovation state at this version
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Marketplace listings
CREATE TABLE marketplace_listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    innovation_id UUID REFERENCES innovations(id) ON DELETE CASCADE,
    creator_id UUID REFERENCES profiles(id),
    public_title TEXT NOT NULL,
    public_description TEXT NOT NULL,  -- sanitized, no confidential detail
    domain TEXT,
    stage TEXT,                    -- concept | detailed_design | prototype | mvp
    available_for TEXT[],          -- ['sale', 'license', 'co_development']
    preferred_terms TEXT,
    status TEXT DEFAULT 'active',  -- active | paused | closed
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Access requests
CREATE TABLE access_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID REFERENCES marketplace_listings(id),
    requestor_id UUID REFERENCES profiles(id),
    nda_accepted BOOLEAN DEFAULT FALSE,
    nda_accepted_at TIMESTAMPTZ,
    status TEXT DEFAULT 'pending', -- pending | approved | rejected
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID REFERENCES marketplace_listings(id),
    sender_id UUID REFERENCES profiles(id),
    receiver_id UUID REFERENCES profiles(id),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Uploaded files
CREATE TABLE innovation_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    innovation_id UUID REFERENCES innovations(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,       -- Supabase storage path
    file_size INTEGER,
    mime_type TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Campaign drafts
CREATE TABLE campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    innovation_id UUID REFERENCES innovations(id) ON DELETE CASCADE,
    platform TEXT,                 -- kickstarter | indiegogo | crowd_supply | general
    campaign_data JSONB NOT NULL,  -- all generated sections
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Key API Endpoints Summary

| Method | Endpoint | Week | Purpose |
|---|---|---|---|
| `POST` | `/api/analyze` | 1 | Full pipeline: structure → search → matrix |
| `POST` | `/api/analyze/structure` | 1 | Just idea decomposition |
| `POST` | `/api/search/research` | 1 | Search OpenAlex + arXiv |
| `POST` | `/api/search/patents` | 1 | Search USPTO |
| `GET` | `/api/report/{id}` | 2 | Get full report JSON |
| `GET` | `/api/report/{id}/pdf` | 2 | Download PDF report |
| `POST` | `/api/innovations` | 2 | Create innovation record |
| `GET` | `/api/innovations` | 2 | List user's innovations |
| `GET` | `/api/innovations/{id}` | 2 | Get innovation detail |
| `GET` | `/api/innovations/{id}/provenance` | 2 | Get provenance chain |
| `POST` | `/api/innovations/{id}/protect` | 3 | Generate patent prep package |
| `POST` | `/api/innovations/{id}/publish` | 3 | Generate defensive publication |
| `POST` | `/api/marketplace/listings` | 3 | Create marketplace listing |
| `GET` | `/api/marketplace/listings` | 3 | Browse listings |
| `POST` | `/api/marketplace/request-access` | 3 | Request access to listing |
| `POST` | `/api/marketplace/messages` | 3 | Send message |
| `POST` | `/api/campaign/generate/{id}` | 4 | Generate crowdfunding campaign |
| `GET` | `/api/campaign/{id}/export` | 4 | Export campaign for platform |

---

## Non-Negotiable Rules for the Entire Build

1. **Never call anything a "patentability score."** Call it "Prior-Art Density" or "Feature Novelty Signal." These are search metrics, not legal determinations.

2. **Every claim needs evidence.** If the AI says "similar technology exists," the report must show which document, which sentence, and how similar.

3. **Every report must include limitations.** "Searched OpenAlex (250M+ works), arXiv, and USPTO. Does not cover: private research, paywalled journals, non-English publications, Chinese/Japanese/Korean patents, corporate trade secrets."

4. **Private by default.** No innovation is ever visible to anyone except the creator unless they explicitly choose to list it.

5. **No blockchain, no NFTs, no tokens.** SHA-256 + Postgres timestamps. That's it. Add Web3 in year 2 if there's demand.

6. **The NDA on marketplace is critical.** Never show full innovation details without the requestor accepting confidentiality terms.

---

## Risk Mitigation for the 4-Week Sprint

| Risk | Mitigation |
|---|---|
| Gemini API rate limit hit | Cache results aggressively. Batch features into single API calls where possible. |
| OpenAlex/arXiv returns poor results | Fall back to the other source. Show "limited results from [source]" transparently. |
| Render free tier cold starts (30s delay) | Add a loading screen with "Waking up the engine..." message. Ping the server periodically. |
| Supabase free tier storage limit (1GB) | Limit file uploads to 5MB each, 10 files per innovation. |
| Running out of time | Weeks 1-2 are the critical core. If Week 3 runs long, simplify Week 4 (campaign generator can be text-only, no fancy editor). |
| Mentor wants to see "blockchain" | Show the SHA-256 provenance chain. Explain it provides the same cryptographic guarantees without the infrastructure overhead. Mention blockchain as a future enhancement. |
