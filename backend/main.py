"""
InnovX Backend — AI-Powered Innovation Discovery & Validation Engine
Production-ready deployment on Render.com & Vercel
"""
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from contextlib import asynccontextmanager

import uuid

from fastapi import FastAPI, Request, Response
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Explicitly load .env from backend directory
env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=env_path)

from routers import analyze, search, report, innovations, auth, marketplace, campaigns
from services.security import (
    rate_limiter,
    detect_malicious_reconnaissance,
    is_payload_oversized,
    SECURITY_HEADERS,
)

START_TIME = datetime.now(timezone.utc)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize resources on startup, cleanup on shutdown."""
    # Port binds immediately so Render detects open port and healthy status
    print(f"[OK] InnovX Production Engine started at {START_TIME.isoformat()}")

    # Pre-warm embedding model in a non-blocking background thread
    async def _async_prewarm():
        try:
            from services.similarity import load_embedding_model
            await asyncio.to_thread(load_embedding_model)
            print("[OK] Embedding model pre-warmed in background.")
        except Exception as e:
            print(f"[WARN] Embedding model pre-warming skipped or deferred: {e}")

    asyncio.create_task(_async_prewarm())
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


# ─── Enterprise Security & Traffic Inspection Middleware ─────────
@app.middleware("http")
async def security_and_rate_limit_middleware(request: Request, call_next):
    # 1. Scanner & Reconnaissance Detection
    user_agent = request.headers.get("user-agent", "")
    path = request.url.path
    is_suspicious, reason = detect_malicious_reconnaissance(user_agent, path)
    if is_suspicious:
        return JSONResponse(
            status_code=403,
            content={
                "error": "Forbidden",
                "message": "Automated security scanning tool or suspicious probe signature detected.",
                "reason": reason,
                "status_code": 403,
            },
        )

    # 2. Request Body Size Enforcer (Memory Exhaustion / Large Payload Defense)
    content_length = request.headers.get("content-length")
    if is_payload_oversized(content_length):
        return JSONResponse(
            status_code=413,
            content={
                "error": "Payload Too Large",
                "message": "Request payload exceeds maximum allowed size (2MB).",
                "status_code": 413,
            },
        )

    # 3. Client IP Extraction & Sliding-Window Rate Limiting
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        client_ip = forwarded.split(",")[0].strip()
    else:
        client_ip = request.client.host if request.client else "127.0.0.1"

    allowed, retry_after, limit, remaining = rate_limiter.is_allowed(client_ip, path)
    if not allowed:
        return JSONResponse(
            status_code=429,
            content={
                "error": "Too Many Requests",
                "message": f"Rate limit exceeded for endpoint category. Please retry in {retry_after} seconds.",
                "retry_after": retry_after,
                "status_code": 429,
            },
            headers={
                "Retry-After": str(retry_after),
                "X-RateLimit-Limit": str(limit),
                "X-RateLimit-Remaining": "0",
            },
        )

    # 4. Process Request
    response: Response = await call_next(request)

    # 5. Inject OWASP Security Headers & Rate Limit Telemetry
    for header, value in SECURITY_HEADERS.items():
        response.headers[header] = value

    response.headers["X-RateLimit-Limit"] = str(limit)
    response.headers["X-RateLimit-Remaining"] = str(remaining)

    return response


# ─── Global Information Disclosure Shield & Exception Masking ────
@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    from fastapi import HTTPException
    if isinstance(exc, HTTPException):
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})

    incident_id = str(uuid.uuid4())[:8]
    print(f"[SECURITY ALERT] Unhandled Exception [Incident #{incident_id}] on {request.method} {request.url.path}: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal Server Error",
            "message": "An unexpected server error occurred. The incident has been recorded with a secure audit ID.",
            "incident_id": incident_id,
            "status_code": 500,
        },
    )


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
            "security_shield": "Sliding-Window Rate Limiting, OWASP Strict Headers & Scanner Shield Active",
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
        "security": "hardened",
    }


