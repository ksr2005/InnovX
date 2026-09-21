"""
InnovX Backend - AI-Powered Innovation Discovery & Validation Engine
"""
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from routers import analyze, search, report, innovations


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize resources on startup, cleanup on shutdown."""
    # Startup: load the sentence-transformer model once
    from services.similarity import load_embedding_model
    load_embedding_model()
    print("[OK] Embedding model loaded")
    print("[OK] InnovX Engine ready")
    yield
    # Shutdown
    print("InnovX Engine shutting down")


app = FastAPI(
    title="InnovX Engine",
    description="AI-Powered Innovation Discovery, Validation & Commercialization Engine",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS - allow frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        os.getenv("FRONTEND_URL", "http://localhost:3000"),
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(analyze.router, prefix="/api/analyze", tags=["Analysis"])
app.include_router(search.router, prefix="/api/search", tags=["Search"])
app.include_router(report.router, prefix="/api/report", tags=["Reports"])
app.include_router(innovations.router, prefix="/api/innovations", tags=["Innovations"])


@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "service": "InnovX Engine",
        "version": "0.1.0",
    }


@app.get("/")
async def root():
    return {
        "message": "InnovX Engine API",
        "docs": "/docs",
        "health": "/health",
    }
