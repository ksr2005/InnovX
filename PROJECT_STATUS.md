# InnovX — Project Status & Modification Log

> Last updated: 2026-09-22 00:55 IST

## Current State: Week 2, Day 9 Complete

The analysis pipeline is fully functional end-to-end. A user can submit an idea and receive:
- AI-structured feature decomposition
- Multi-source prior-art search (OpenAlex + arXiv + USPTO)
- Semantic similarity ranking (sentence-transformers, local CPU)
- Sentence-level evidence extraction (Gemini)
- Feature × Evidence matrix with coverage levels
- 6-metric innovation assessment with explanations
- AI-generated 3-paragraph assessment summary
- 10-section structured report (JSON)
- SHA-256 provenance hash chain

Tested and verified: `POST /api/analyze` returns 200 OK with full pipeline in ~18-30 seconds.

---

## Completed Tasks

### Week 1 (ALL DONE)
- [x] Project structure (unified Git repo, frontend + backend)
- [x] Backend: FastAPI skeleton, routers, services, models
- [x] `services/structuring.py` — Gemini idea decomposition
- [x] `services/search_openalex.py` — 250M+ academic works
- [x] `services/search_arxiv.py` — CS/EE/Math/Physics preprints
- [x] `services/search_patents.py` — USPTO patent data
- [x] `services/similarity.py` — sentence-transformers embeddings
- [x] `services/evidence.py` — Gemini evidence extraction
- [x] `services/provenance.py` — SHA-256 hash chain
- [x] `routers/analyze.py` — Full 10-step pipeline
- [x] Frontend: Next.js 14 + Tailwind v4 + shadcn/ui
- [x] Components: IdeaInput, FeatureMatrix, ProvenanceCard
- [x] `lib/api.ts` — TypeScript API client
- [x] `supabase_schema.sql` — Complete database schema
- [x] All Windows-specific bug fixes applied

### Week 2 (PARTIAL)
- [x] `services/scoring.py` — 6 assessment metrics with explanations
- [x] `services/report_gen.py` — 10-section report generator
- [x] `components/assessment-view.tsx` — Score cards UI
- [x] Updated schemas, router, API types for scores + report
- [x] Report caching in `routers/report.py`

---

## Remaining Tasks (in order)

### Week 2 Remaining
1. **PDF Export** — Install `reportlab`, build PDF from report JSON, `GET /api/report/{id}/pdf`
2. **Supabase Auth** — Email/password + optional Google OAuth, JWT middleware in FastAPI
3. **User Dashboard** — `dashboard/page.tsx`, list innovations, CRUD endpoints
4. **Provenance in DB** — Store provenance records in Supabase, version timeline UI
5. **File Uploads** — Supabase Storage, link files to innovations
6. **Innovation Vault** — Private dashboard with all innovations, reports, files

### Week 3 — Creator Paths
7. **Decision UI** — "What do you want to do?" screen after report (Protect/Share/Connect/Build)
8. **Protect Path** — Patent filing guidance, preparation package PDF
9. **Share Path** — Defensive Publication generator, export to IP.com/TDCommons formats
10. **Connect Path** — NDA-gated marketplace:
    - `marketplace_listings` table (sanitized public summary)
    - `access_requests` table (NDA acceptance tracking)
    - `messages` table (in-platform messaging)
    - Buyer sees only: domain, problem area, stage, available-for
    - Full disclosure only after mutual NDA acceptance + creator approval
11. **Marketplace Dashboard** — Creator manages listings, buyer views approved innovations

### Week 4 — Build Path + Deploy
12. **Campaign Generator** — `services/campaign_gen.py`, Gemini generates Kickstarter/Indiegogo campaign
13. **Campaign Export** — Platform-specific formatting, PDF download, step-by-step guides
14. **Landing Page** — Proper hero, how-it-works, 4 paths, disclaimers
15. **Deploy** — Vercel (frontend) + Render (backend), CORS, SSL
16. **Final Testing** — All user flows, documentation, mentor demo

---

## All Bug Fixes Applied (Reference)

### 1. Gemini Model Migration
- `gemini-2.0-flash` → 404 (deprecated)
- `gemini-3.6-flash` → 429 (20 req/day limit)
- **Fix:** `gemini-flash-lite-latest` via `GEMINI_MODEL` env var

### 2. Windows gRPC Deadlock
- `model.generate_content_async()` hangs on Windows
- **Fix:** `await asyncio.to_thread(model.generate_content, prompt)` in `structuring.py` and `evidence.py`

### 3. Windows Unicode Crash
- `print("✓")` crashes with `UnicodeEncodeError: 'charmap'` on cp1252
- **Fix:** Replaced all `✓` with `[OK]` in `main.py` and `similarity.py`

### 4. arXiv HTTPS Redirect
- `http://export.arxiv.org` returns 301, httpx doesn't follow by default
- **Fix:** Changed to `https://` + `follow_redirects=True`

### 5. USPTO HTML Response
- PatentsView sometimes returns HTML instead of JSON
- **Fix:** Added content-type check before JSON parsing, return `[]` on non-JSON

### 6. OpenAlex Null Venue
- `primary_location.source` can be `None`, causing `AttributeError`
- **Fix:** Safe conditional: `(work.get("primary_location") or {}).get("source", {}).get("display_name") if ... else None`

---

## Architecture Decisions (Do Not Change Without Good Reason)

1. **Gemini via `asyncio.to_thread`** — Not ideal but necessary on Windows. Do not revert to `generate_content_async`.
2. **In-memory report cache** — Will be replaced by Supabase in Day 11. Don't add Redis or file-based caching.
3. **No blockchain** — SHA-256 + Postgres is the provenance strategy. Blockchain is a post-MVP consideration only.
4. **NDA-gated marketplace, NOT open marketplace** — This is a core architectural decision based on the Disclosure Paradox (public listing destroys patent rights in EU/China). Do not build an open listing system.
5. **Free tier only** — Every service must run on free tier. Do not add any paid dependencies.
6. **Evidence-first** — Every prior-art claim must link to a real source and real sentence. No hallucinated scores or vague percentages.

---

## Environment Setup

### Backend
```powershell
cd innovx/backend
.\venv\Scripts\activate
uvicorn main:app --reload    # http://localhost:8000
```

### Frontend
```powershell
cd innovx/frontend
npm run dev                  # http://localhost:3000
```

### Required Env Vars (backend/.env)
```
GEMINI_API_KEY=<your key from aistudio.google.com>
GEMINI_MODEL=gemini-flash-lite-latest
FRONTEND_URL=http://localhost:3000
```
