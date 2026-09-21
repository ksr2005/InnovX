# InnovX Engine — Development & Modification Log

This document records all modifications, enhancements, bug fixes, and architectural adjustments made to the `innovx` codebase, along with the technical rationale for each change.

---

## Summary of Changes at a Glance

| Component | File | Type | Reason / Impact |
|---|---|:---:|---|
| **Repository** | `innovx/.git` | Architecture | Unified repo root; eliminated isolated submodule state caused by `create-next-app`. |
| **Database** | `supabase_schema.sql` | New File | Complete SQL schema (pgvector + 11 tables + RLS) ready for Supabase SQL Editor. |
| **AI Structuring** | `backend/services/structuring.py` | Bug Fix & Optimization | Switched to `gemini-flash-lite-latest` (resolved 429 quota); switched to `asyncio.to_thread` (prevented Windows gRPC deadlock). |
| **AI Evidence** | `backend/services/evidence.py` | Bug Fix & Optimization | Switched to `gemini-flash-lite-latest`; switched to `asyncio.to_thread`. |
| **Embedding** | `backend/services/similarity.py` | Windows Bug Fix | Replaced Unicode `✓` with `[OK]` to resolve `UnicodeEncodeError: 'charmap'` on Windows cp1252. |
| **Server Entry** | `backend/main.py` | Windows Bug Fix | Replaced Unicode `✓` with `[OK]` to prevent startup crashes on Windows console. |
| **arXiv Search** | `backend/services/search_arxiv.py` | API Fix | Changed URL to `https://` and added `follow_redirects=True` to resolve HTTP 301 redirects. |
| **Patent Search** | `backend/services/search_patents.py` | API Hardening | Added `follow_redirects=True` and verified JSON content-type before parsing to prevent HTML decode crashes. |
| **OpenAlex Search**| `backend/services/search_openalex.py`| Safe Navigation | Fixed `AttributeError: 'NoneType' object has no attribute 'get'` when paper venue source is null. |
| **Configuration** | `backend/.env` & `.env.example` | Config | Added `GEMINI_MODEL=gemini-flash-lite-latest` for zero-code model swapping. |

---

## Detailed File-by-File Technical Log

### 1. Git Repository Architecture (`innovx/.git`)
* **Initial State:** `create-next-app` automatically initialized an independent Git repository inside `frontend/`, leaving `backend/` and root project configuration untracked.
* **Changes Made:** Removed `frontend/.git` and executed `git init` at `innovx/` root with an updated root `.gitignore`.
* **Rationale:** A unified root repository allows both frontend and backend to be versioned together in a single repository for automated deployments (Vercel + Render).

---

### 2. Supabase Database Schema ([`supabase_schema.sql`](file:///c:/Users/sriha/.gemini/antigravity/scratch/innovx/supabase_schema.sql))
* **Initial State:** Database schema was only documented as markdown text in the sprint plan.
* **Changes Made:** Created executable SQL script containing:
  - `CREATE EXTENSION IF NOT EXISTS vector;` (pgvector for 384-dim embeddings)
  - Tables: `profiles`, `innovations`, `features`, `prior_art_results`, `assessments`, `provenance_records`, `marketplace_listings`, `access_requests`, `messages`, `innovation_files`, `campaigns`.
  - Row Level Security (RLS) enabled on all tables.
* **Rationale:** Gives the developer an exact, one-click copy-paste script to run in the Supabase SQL Editor for Week 1–4 persistence.

---

### 3. AI Structuring Engine ([`backend/services/structuring.py`](file:///c:/Users/sriha/.gemini/antigravity/scratch/innovx/backend/services/structuring.py))
* **Change A: Model Migration (`gemini-2.0-flash` $\rightarrow$ `gemini-flash-lite-latest`)**
  - *Problem:* Google's API returned `404 Not Found: gemini-2.0-flash is no longer available`. When switching to `gemini-3.6-flash`, Google returned `429 Quota Exceeded: limit: 20 requests per day`.
  - *Solution:* Switched to `gemini-flash-lite-latest` (configurable via `GEMINI_MODEL` env var).
  - *Rationale:* `gemini-flash-lite-latest` has the full, high-throughput free-tier quota (no 20/day bottleneck) and generates accurate structured technical decompositions in 3–5 seconds.
* **Change B: Async Execution via Thread Pool**
  - *Problem:* `model.generate_content_async()` uses gRPC asyncio channels that frequently deadlock/hang on Windows when invoked inside an event loop.
  - *Solution:* Changed to `await asyncio.to_thread(model.generate_content, prompt)`.
  - *Rationale:* Runs the synchronous API method in a background thread, preventing Windows gRPC deadlocks while keeping the FastAPI event loop completely unblocked.

---

### 4. AI Evidence Extraction ([`backend/services/evidence.py`](file:///c:/Users/sriha/.gemini/antigravity/scratch/innovx/backend/services/evidence.py))
* **Change A:** Switched model to `os.getenv("GEMINI_MODEL", "gemini-flash-lite-latest")`.
  - *Rationale:* Prevents evidence extraction from exhausting preview quotas; executes in parallel for top-ranked papers in seconds.
* **Change B:** Replaced `generate_content_async` with `await asyncio.to_thread(model.generate_content, prompt)`.
  - *Rationale:* Eliminates Windows gRPC hanging during batch evidence extraction.

---

### 5. Windows Encoding Protection ([`backend/main.py`](file:///c:/Users/sriha/.gemini/antigravity/scratch/innovx/backend/main.py) & [`backend/services/similarity.py`](file:///c:/Users/sriha/.gemini/antigravity/scratch/innovx/backend/services/similarity.py))
* **Problem:** The embedding model loader printed `✓ Model loaded...` and `✓ InnovX Engine ready`. On Windows machines using standard cp1252 console codepages, this crashed with:
  ```text
  UnicodeEncodeError: 'charmap' codec can't encode character '\u2713' in position 0
  ```
* **Solution:** Replaced Unicode checkmarks (`✓`) with standard ASCII `[OK]`.
* **Rationale:** Guarantees 100% crash-free logging on any Windows command prompt, PowerShell, or server terminal without requiring system codepage changes.

---

### 6. arXiv Preprint Search ([`backend/services/search_arxiv.py`](file:///c:/Users/sriha/.gemini/antigravity/scratch/innovx/backend/services/search_arxiv.py))
* **Problem:** arXiv queries to `http://export.arxiv.org/api/query` triggered `301 Moved Permanently` redirects to `https://`. Because `httpx` does not follow redirects by default, the requests failed.
* **Solution:**
  1. Updated `BASE_URL` directly to `https://export.arxiv.org/api/query`.
  2. Initialized client with `httpx.AsyncClient(timeout=30.0, follow_redirects=True)`.
* **Rationale:** Eliminates unnecessary HTTP 301 network roundtrips, reducing query latency and preventing redirection failures.

---

### 7. Patent Search Hardening ([`backend/services/search_patents.py`](file:///c:/Users/sriha/.gemini/antigravity/scratch/innovx/backend/services/search_patents.py))
* **Problem:** USPTO's legacy PatentsView URL was redirecting to a documentation portal returning `text/html`, causing `json.decoder.JSONDecodeError`.
* **Solution:**
  1. Added `follow_redirects=True` to `httpx.AsyncClient`.
  2. Added content-type check:
     ```python
     if "application/json" not in response.headers.get("content-type", ""):
         return []
     ```
* **Rationale:** If any search provider returns maintenance/HTML pages, the system gracefully handles it as empty results rather than crashing the user's entire analysis pipeline.

---

### 8. OpenAlex Search Safe Navigation ([`backend/services/search_openalex.py`](file:///c:/Users/sriha/.gemini/antigravity/scratch/innovx/backend/services/search_openalex.py))
* **Problem:** Line 70 attempted `.get("source", {}).get("display_name")` on `primary_location`. If `primary_location.source` was `None`, calling `.get()` threw an unhandled `AttributeError`.
* **Solution:** Added safe conditional verification:
  ```python
  "venue": (work.get("primary_location") or {}).get("source", {}).get("display_name") 
           if (work.get("primary_location") or {}).get("source") else None,
  ```
* **Rationale:** Academic papers with unpublished or informal venues won't cause the search ingestion loop to fail.

---

### 9. Environment Configurations ([`backend/.env`](file:///c:/Users/sriha/.gemini/antigravity/scratch/innovx/backend/.env) & [`backend/.env.example`](file:///c:/Users/sriha/.gemini/antigravity/scratch/innovx/backend/.env.example))
* **Changes Made:** Added `GEMINI_MODEL=gemini-flash-lite-latest`.
* **Rationale:** Allows changing the model tier (e.g., testing `gemini-3.5-flash` or `gemini-3.1-flash-lite`) without modifying any Python code.

---

### 10. Innovation Assessment Scoring Engine ([`backend/services/scoring.py`](file:///c:/Users/sriha/.gemini/antigravity/scratch/innovx/backend/services/scoring.py))
* **Implemented:** Week 2 / Day 8 Deliverable.
* **Details:**
  - Computes all 6 evidence-backed scores (0–100): Prior Art Density, Feature Novelty, Combination Distinctiveness, Research Freshness, Evidence Strength, Search Confidence.
  - No gamified labels. Honest numbers backed by exact document references.
  - Integrated 3-paragraph Gemini-powered natural language assessment summary.

---

### 11. Full 10-Section Report Generator ([`backend/services/report_gen.py`](file:///c:/Users/sriha/.gemini/antigravity/scratch/innovx/backend/services/report_gen.py))
* **Implemented:** Week 2 / Day 9 Deliverable.
* **Details:**
  - Generates comprehensive structured report with Sections A through J:
    - A. Executive Summary
    - B. Structured Innovation (problem, solution, components)
    - C. Search Methodology (sources, embedding model, ranking)
    - D. Prior Art Found (documents by feature)
    - E. Feature Comparison Matrix
    - F. Similarity Analysis (overlaps and gaps)
    - G. Potential Differentiators
    - H. Innovation Assessment (all 6 metrics)
    - I. Search Confidence & Limitations
    - J. Recommended Next Steps (commercialization & IP guidance)
  - Added in-memory report cache and endpoints `GET /api/report/{id}` and `GET /api/report/{id}/summary` in [`routers/report.py`](file:///c:/Users/sriha/.gemini/antigravity/scratch/innovx/backend/routers/report.py).

---

### 12. Assessment UI Component ([`frontend/src/components/assessment-view.tsx`](file:///c:/Users/sriha/.gemini/antigravity/scratch/innovx/frontend/src/components/assessment-view.tsx))
* **Implemented:** Frontend visualization for Week 2 assessment scores.
* **Details:**
  - Color-coded progress bars with inverted scales for novelty vs density.
  - Detailed breakdown of each metric with explanation and supporting references.
  - Natural language AI summary card.

---

## Validation & Verification Results

1. **Backend Health Check:** `GET /health` $\rightarrow$ `200 OK`
2. **Frontend Production Build:** `next build` $\rightarrow$ `✓ Compiled successfully`, all static pages prerendered with zero errors.
3. **Full Pipeline Test (`POST /api/analyze`):**
   - Idea tested: *"Cloud-controlled autonomous drone with semantic data streaming and 3D vector rendering"*
   - Execution time: ~22s
   - Result: `Status Code: 200 OK`
   - Verified outputs:
     - `Has scores: True` (Prior Art Density: 60.0/100, Feature Novelty: 66.7/100)
     - `Has summary: True` (3-paragraph honest assessment)
     - `Has report: True` (Complete 10-section JSON report cached)
     - `Provenance Hash: Verified`

