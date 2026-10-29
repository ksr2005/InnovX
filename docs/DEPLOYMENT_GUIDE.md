# InnovX — Production Deployment Guide (Render.com + Vercel)

This document provides complete instructions for deploying the InnovX platform to production on **Render.com** (FastAPI Backend) and **Vercel** (Next.js 16 Frontend) with **Supabase** (PostgreSQL + Auth + Storage).

---

## 1. System Architecture

```
                  ┌──────────────────────────────────────────────┐
                  │              Vercel Global CDN               │
                  │   Next.js 16 (App Router) + Tailwind v4      │
                  │        https://innovx.vercel.app             │
                  └──────────────────────┬───────────────────────┘
                                         │  HTTPS / CORS (RRF API)
                                         ▼
                  ┌──────────────────────────────────────────────┐
                  │              Render.com Web Service          │
                  │       FastAPI (Python 3.11) + Uvicorn        │
                  │      https://innovx-backend.onrender.com     │
                  └──────────────┬───────────────────────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
         ▼                       ▼                       ▼
┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
│  Google AI Studio│   │  Research APIs   │   │  Supabase Cloud  │
│  Gemini Flash    │   │  OpenAlex        │   │  PostgreSQL 15   │
│  Lite Engine     │   │  arXiv           │   │  pgvector        │
│                  │   │  USPTO Patents   │   │  Auth & Storage  │
└──────────────────┘   └──────────────────┘   └──────────────────┘
```

---

## 2. Backend Deployment on Render.com

### Option A: One-Click Blueprint Deploy (`render.yaml`)
InnovX includes a production `render.yaml` specification in the repository root.
1. Log in to [Render.com](https://dashboard.render.com).
2. Click **New +** → **Blueprint**.
3. Select your InnovX Git repository.
4. Render will parse `render.yaml` and configure:
   - **Service Name**: `innovx-backend`
   - **Environment**: Python 3.11
   - **Root Directory**: `backend`
   - **Build Command**: `pip install --upgrade pip && pip install -r requirements.txt && python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Healthcheck Path**: `/health`
5. Supply the required private environment variables in the Render Dashboard:
   - `GEMINI_API_KEY`: Your key from Google AI Studio
   - `SUPABASE_URL`: `https://olkmuzdtnzgbjnavppdj.supabase.co`
   - `SUPABASE_ANON_KEY`: Your Supabase anon key
   - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key
   - `FRONTEND_URL`: `https://innovx.vercel.app` (or your Vercel deployment URL)
6. Click **Apply**. Render will build and deploy the container.

### Option B: Manual Web Service Setup
1. In the Render Dashboard, click **New +** → **Web Service**.
2. Connect your Git repository.
3. Configure the settings:
   - **Name**: `innovx-backend`
   - **Region**: Oregon (US West) or Frankfurt (EU)
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Runtime**: `Python 3`
   - **Build Command**:
     ```bash
     pip install --upgrade pip && pip install -r requirements.txt && python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"
     ```
   - **Start Command**:
     ```bash
     uvicorn main:app --host 0.0.0.0 --port $PORT
     ```
4. Under **Advanced**, add **Health Check Path**: `/health`.
5. Enter Environment Variables (see Section 4 below).
6. Click **Create Web Service**.

---

## 3. Frontend Deployment on Vercel

1. Log in to [Vercel](https://vercel.com/dashboard).
2. Click **Add New...** → **Project**.
3. Select your InnovX Git repository.
4. In the Project Configuration:
   - **Framework Preset**: `Next.js`
   - **Root Directory**: Click Edit → select `frontend`
   - **Build Command**: `next build` (or leave default)
   - **Output Directory**: `.next` (default)
5. Expand **Environment Variables** and add:
   | Variable | Value | Description |
   |---|---|---|
   | `NEXT_PUBLIC_API_URL` | `https://innovx-backend.onrender.com` | Your live Render backend URL (no trailing slash) |
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://olkmuzdtnzgbjnavppdj.supabase.co` | Supabase project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGci...` | Supabase public anon key |
6. Click **Deploy**. Vercel will build the Turbopack production bundle and provision global Edge CDN endpoints.

---

## 4. Environment Variables Reference Matrix

### Backend (`backend/.env` on Render)
| Variable | Required | Example / Description |
|---|---|---|
| `ENVIRONMENT` | Yes | `production` |
| `GEMINI_API_KEY` | Yes | `AQ.Ab8RN6JJ...` (Google AI Studio) |
| `GEMINI_MODEL` | Yes | `gemini-flash-lite-latest` |
| `SUPABASE_URL` | Yes | `https://olkmuzdtnzgbjnavppdj.supabase.co` |
| `SUPABASE_ANON_KEY` | Yes | Public anonymous JWT token |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Backend administrative JWT token |
| `FRONTEND_URL` | Yes | Comma-separated allowed origins (e.g. `https://innovx.vercel.app,http://localhost:3000`) |
| `HOST` | Yes | `0.0.0.0` |
| `PORT` | Auto | Render assigns `$PORT` dynamically |

### Frontend (`frontend/.env.local` on Vercel)
| Variable | Required | Example / Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Yes | `https://innovx-backend.onrender.com` |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | `https://olkmuzdtnzgbjnavppdj.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Public anonymous JWT token |

---

## 5. Production CORS & Security Headers (Subtask 26-3)

The backend in `main.py` is configured with production-grade CORS:
- **Exact Origins**: Matches `FRONTEND_URL` entries.
- **Dynamic Preview Deployments**: Automatically matches all Vercel preview environments using the regex:
  ```python
  allow_origin_regex=r"^https:\/\/[a-zA-Z0-9_\-]+\.vercel\.app$"
  ```
- **Security Headers Injected**:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `X-XSS-Protection: 1; mode=block`
- **Exposed Headers**: `Content-Disposition`, `Content-Type`, `Content-Length` (enabling browser streaming PDF downloads).

---

## 6. Supabase Authentication Setup for Production

In your Supabase project dashboard (`https://supabase.com/dashboard/project/olkmuzdtnzgbjnavppdj`):
1. Navigate to **Authentication** → **URL Configuration**.
2. Set **Site URL**: `https://innovx.vercel.app` (or your production Vercel domain).
3. Under **Redirect URLs**, add:
   - `https://innovx.vercel.app/**`
   - `https://*.vercel.app/**` (for preview deployments)
   - `http://localhost:3000/**` (for local development)
4. Save changes.

---

## 7. Verification & Healthcheck Probes

Once deployed, run these commands to verify your production endpoints:

### 1. Test Backend Health & Pre-warmed Embedding Model
```bash
curl -i https://innovx-backend.onrender.com/health
```
**Expected Response (200 OK):**
```json
{
  "status": "healthy",
  "service": "InnovX Engine",
  "version": "1.0.0",
  "environment": "production",
  "uptime_seconds": 124.5,
  "services": {
    "embedding_model": "all-MiniLM-L6-v2 (384-dim, local CPU)",
    "hybrid_ranking": "Reciprocal Rank Fusion (RRF, k=60)",
    "gemini_configured": true,
    "supabase_configured": true
  }
}
```

### 2. Test Production CORS Pre-flight
```bash
curl -i -X OPTIONS https://innovx-backend.onrender.com/api/analyze \
  -H "Origin: https://innovx.vercel.app" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type"
```
**Expected Response:** `200 OK` with `Access-Control-Allow-Origin: https://innovx.vercel.app`.

### 3. Test Interactive OpenAPI Swagger Docs
Visit: `https://innovx-backend.onrender.com/docs`
