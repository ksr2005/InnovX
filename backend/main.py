"""
InnovX Backend — AI-Powered Innovation Discovery & Validation Engine
Production-ready deployment on Render.com & Vercel
"""
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Explicitly load .env from backend directory
env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=env_path)

from routers import analyze, search, report, innovations, auth, marketplace, campaigns

START_TIME = datetime.now(timezone.utc)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize resources on startup, cleanup on shutdown."""
    # Startup: pre-load the sentence-transformer model once into CPU memory
    from services.similarity import load_embedding_model
    load_embedding_model()
    print("[OK] Embedding model pre-warmed: all-MiniLM-L6-v2")
    print(f"[OK] InnovX Production Engine started at {START_TIME.isoformat()}")
    yield
    # Shutdown
    print("InnovX Engine shutting down")


app = FastAPI(
    title="InnovX Engine",
    description="AI-Powered Innovation Discovery, Validation & Commercialization Engine",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ─── Production CORS Configuration (Subtask 26-3) ───────────────
# Accepts comma-separated origins from FRONTEND_URL, plus localhost and Vercel preview domains
raw_origins = os.getenv("FRONTEND_URL", "http://localhost:3000")
allowed_origins = [url.strip() for url in raw_origins.split(",") if url.strip()]
for default_origin in ["http://localhost:3000", "http://127.0.0.1:3000"]:
    if default_origin not in allowed_origins:
        allowed_origins.append(default_origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    # Regex allows all Vercel production and preview deployment URLs (e.g. https://innovx-preview-xyz.vercel.app)
    allow_origin_regex=r"^https:\/\/[a-zA-Z0-9_\-]+\.vercel\.app$",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition", "Content-Type", "Content-Length"],
    max_age=86400,  # 24-hour pre-flight cache
)


# ─── Security Headers Middleware ─────────────────────────────────
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response: Response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    return response


# ─── Register Application Routers ───────────────────────────────
app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(analyze.router, prefix="/api/analyze", tags=["Analysis"])
app.include_router(search.router, prefix="/api/search", tags=["Search"])
app.include_router(report.router, prefix="/api/report", tags=["Reports"])
app.include_router(innovations.router, prefix="/api/innovations", tags=["Innovations"])
app.include_router(marketplace.router, prefix="/api/marketplace", tags=["Marketplace"])
app.include_router(campaigns.router, prefix="/api/campaigns", tags=["Crowdfunding Campaigns"])


# ─── Healthcheck & Root Endpoints (Subtask 26-1) ─────────────────
@app.get("/health")
async def health_check():
    """
    Production healthcheck used by Render.com health check monitors and uptime probes.
    """
    uptime = (datetime.now(timezone.utc) - START_TIME).total_seconds()
    has_gemini = bool(os.getenv("GEMINI_API_KEY"))
    has_supabase = bool(os.getenv("SUPABASE_URL") and os.getenv("SUPABASE_ANON_KEY"))
    environment = os.getenv("ENVIRONMENT", "production" if os.getenv("RENDER") else "development")

    return {
        "status": "healthy",
        "service": "InnovX Engine",
        "version": "1.0.0",
        "environment": environment,
        "uptime_seconds": round(uptime, 2),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "services": {
            "embedding_model": "all-MiniLM-L6-v2 (384-dim, local CPU)",
            "hybrid_ranking": "Reciprocal Rank Fusion (RRF, k=60)",
            "gemini_configured": has_gemini,
            "supabase_configured": has_supabase,
        },
    }


@app.get("/")
async def root():
    return {
        "message": "InnovX Engine API — Production Live",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health",
        "status": "operational",
    }

