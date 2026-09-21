# InnovX — Agent Context

> **Read this file first.** It contains everything needed to continue work on this project without disruption.

## What Is InnovX

InnovX is an AI-Powered Innovation Discovery, Validation & Commercialization Engine. A user pastes a technical idea, the system decomposes it into features, searches 250M+ academic papers + arXiv preprints + USPTO patents, ranks results by semantic similarity, extracts sentence-level evidence, scores the innovation across 6 metrics, generates a full report, and gives the user 4 paths forward (Protect / Share / Connect / Build).

## Project Structure

```
innovx/
├── frontend/                  # Next.js 14 (App Router) + Tailwind + shadcn/ui
│   ├── src/app/page.tsx       # Main landing page with idea input + results
│   ├── src/components/        # UI components (idea-input, feature-matrix, assessment-view, provenance-card)
│   ├── src/lib/api.ts         # TypeScript API client with full type definitions
│   └── .env.local             # NEXT_PUBLIC_API_URL=http://localhost:8000
│
├── backend/                   # Python FastAPI
│   ├── main.py                # FastAPI app entry, CORS, lifespan (loads embedding model)
│   ├── routers/
│   │   ├── analyze.py         # POST /api/analyze (full pipeline), POST /api/analyze/structure
│   │   ├── search.py          # POST /api/search/research, POST /api/search/patents
│   │   ├── report.py          # GET /api/report/{id} (cached reports)
│   │   └── innovations.py     # Placeholder for CRUD (Week 2)
│   ├── services/
│   │   ├── structuring.py     # Gemini idea decomposition → StructuredIdea
│   │   ├── search_openalex.py # OpenAlex API (250M+ works, free)
│   │   ├── search_arxiv.py    # arXiv API (preprints, free)
│   │   ├── search_patents.py  # USPTO PatentsView API (free)
│   │   ├── similarity.py      # sentence-transformers all-MiniLM-L6-v2 (local CPU)
│   │   ├── evidence.py        # Gemini evidence sentence extraction
│   │   ├── scoring.py         # 6-metric assessment engine + Gemini summary
│   │   ├── report_gen.py      # 10-section structured report generator
│   │   └── provenance.py      # SHA-256 hash chain for version provenance
│   ├── models/
│   │   └── schemas.py         # All Pydantic models (request/response types)
│   ├── requirements.txt       # Python dependencies (all installed)
│   ├── .env                   # GEMINI_API_KEY, GEMINI_MODEL, SUPABASE_*, FRONTEND_URL
│   └── venv/                  # Python 3.13 virtual environment
│
├── supabase_schema.sql        # Complete SQL schema (pgvector, 11 tables, RLS)
├── .gitignore
└── README.md
```

## Tech Stack (All Free Tier)

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router) + Tailwind CSS v4 + shadcn/ui |
| Backend | Python 3.13 + FastAPI |
| AI/LLM | Google AI Studio — `gemini-flash-lite-latest` (env var `GEMINI_MODEL`) |
| Embeddings | `sentence-transformers` `all-MiniLM-L6-v2` (384-dim, local CPU) |
| Database | Supabase (PostgreSQL + pgvector) — schema created, not yet connected |
| Research APIs | OpenAlex (free), arXiv (free), USPTO PatentsView (free) |
| Deploy Target | Vercel (frontend) + Render.com (backend) |

## Critical Implementation Details

### Gemini API
- Uses `google.generativeai` (deprecated but functional). The new package is `google.genai`.
- **Must use `asyncio.to_thread(model.generate_content, prompt)` instead of `generate_content_async()`** — gRPC async channels deadlock on Windows.
- Model: `gemini-flash-lite-latest` via env var. Do NOT use `gemini-2.0-flash` (404) or `gemini-3.6-flash` (20 req/day quota limit).

### Windows-Specific
- **No Unicode symbols in print/log statements.** Use `[OK]` not `✓`. Windows cp1252 console crashes on Unicode.
- arXiv API: Must use `https://` URL and `follow_redirects=True`.
- USPTO PatentsView: Must check `content-type` header before JSON parsing (can return HTML).

### Analysis Pipeline (10 steps in `routers/analyze.py`)
1. Structure idea (Gemini) → `StructuredIdea`
2. For each feature: search OpenAlex
3. For each feature: search arXiv
4. For each feature: search USPTO
5. Rank all results by semantic similarity (sentence-transformers)
6. Extract evidence sentences for top 3 (Gemini)
7. Build `FeatureMatrix` with coverage levels
8. Create provenance record (SHA-256)
9. Compute 6 assessment scores (`scoring.py`)
10. Generate AI assessment summary + 10-section report

### The 4 Creator Paths (Implemented in Weeks 3-4)
1. **Protect** — Patent filing guidance + preparation package
2. **Share** — Defensive Publication generator + export
3. **Connect** — NDA-gated marketplace (sanitized public summary, full details behind NDA)
4. **Build** — Crowdfunding campaign generator for Kickstarter/Indiegogo

### Non-Negotiable Rules
1. Never call anything a "patentability score." Use "Prior Art Density" or "Feature Novelty Signal."
2. Every claim needs a linked evidence sentence from a real source.
3. Every report must include search limitations and disclaimers.
4. Private by default. No innovation visible to anyone except creator unless explicitly listed.
5. No blockchain/NFTs/tokens. SHA-256 + Postgres timestamps only.
6. NDA-gated marketplace: never show full details without confidentiality acceptance.

## How to Run

### Backend
```powershell
cd backend
.\venv\Scripts\activate
uvicorn main:app --reload
# Runs on http://localhost:8000
# API docs at http://localhost:8000/docs
```

### Frontend
```powershell
cd frontend
npm run dev
# Runs on http://localhost:3000
```

## 4-Week Sprint Plan

### Week 1 — Core AI Engine ✅ COMPLETE
All search engines, similarity, evidence, structuring, feature matrix, frontend.

### Week 2 — Reports, Auth, Provenance (IN PROGRESS)
- Days 8-9: Scoring engine + report generator ✅ COMPLETE
- Day 10: PDF export (TODO)
- Day 11: Supabase Auth + user dashboard (TODO)
- Day 12: Provenance in Supabase (TODO)
- Day 13: File uploads + innovation vault (TODO)
- Day 14: Polish (TODO)

### Week 3 — Creator Paths (Protect / Share / Connect)
- Day 15: Decision UI
- Day 16: Patent guidance path
- Day 17: Defensive publication generator
- Day 18-19: NDA-gated marketplace
- Day 20-21: Polish

### Week 4 — Build Path + Campaign + Deploy
- Day 22-23: Crowdfunding campaign generator
- Day 24: Landing page + onboarding
- Day 25: Search improvements + edge cases
- Day 26: Deploy to Vercel + Render
- Day 27-28: Final testing + documentation

## Known Bug Fixes Already Applied
See `PROJECT_STATUS.md` for the complete modification log with every fix and its rationale.
