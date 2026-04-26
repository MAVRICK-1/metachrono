"""
MetaChronos — FastAPI application entry point.

Temporal Intelligence Platform for OpenMetadata
================================================
Covers hackathon paradoxes:
  T-01  MCP Server + AI Agent
  T-02  Data Observability (schema drift, change velocity)
  T-04  Developer Tooling (CLI-friendly API, GitHub Action)
  T-06  Governance & Classification audit trail
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.routers import assets, timeline, lineage, impact, governance, ai_chat, mcp_server

app = FastAPI(
    title="MetaChronos",
    description=(
        "**Time-travel through your data's metadata history.** "
        "MetaChronos is a temporal intelligence platform built on top of OpenMetadata that "
        "lets data teams understand what changed, when, why, and what broke."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ──────────────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────

app.include_router(assets.router, prefix="/api/v1")
app.include_router(timeline.router, prefix="/api/v1")
app.include_router(lineage.router, prefix="/api/v1")
app.include_router(impact.router, prefix="/api/v1")
app.include_router(governance.router, prefix="/api/v1")
app.include_router(ai_chat.router, prefix="/api/v1")
app.include_router(mcp_server.router, prefix="/api/v1")

# ── Health & info ─────────────────────────────────────────────────────────────

@app.get("/", tags=["meta"])
async def root():
    return {
        "service": "MetaChronos",
        "tagline": "Time-travel through your data's metadata history",
        "version": "1.0.0",
        "openmetadata_url": settings.OPENMETADATA_URL,
        "docs": "/docs",
        "mcp_endpoint": "/api/v1/mcp",
    }


@app.get("/health", tags=["meta"])
async def health():
    from app.services.om_client import om_client
    om_ok = False
    try:
        await om_client.get("/system/version")
        om_ok = True
    except Exception:
        pass

    return JSONResponse(
        content={
            "status": "healthy" if om_ok else "degraded",
            "openmetadata": "connected" if om_ok else "unreachable",
        },
        status_code=200 if om_ok else 206,
    )
