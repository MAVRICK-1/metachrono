"""
MCP Server Router (Paradox T-01: MCP Ecosystem & AI Agents)
============================================================
Implements the Model Context Protocol (MCP) so that AI coding assistants
(Claude Desktop, Cursor, etc.) can query OpenMetadata through MetaChronos.

Protocol: JSON-RPC 2.0 over HTTP POST /mcp
Spec: https://spec.modelcontextprotocol.io/

Tools exposed:
  - search_assets          Search across all data assets
  - get_entity_timeline    Retrieve change history for an asset
  - get_schema_diff        Compare two versions of a schema
  - get_lineage            Get upstream/downstream lineage
  - get_impact_analysis    Compute blast radius of a change
  - get_governance_audit   Retrieve governance/tagging history
  - ask_metadata_ai        Natural language metadata Q&A
"""

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from typing import Any

from app.services.om_client import om_client
from app.services.time_travel import get_entity_timeline, compute_schema_diff
from app.services.lineage_service import get_lineage_graph
from app.services.impact_service import compute_blast_radius
from app.services.ai_service import answer_query

router = APIRouter(prefix="/mcp", tags=["mcp"])

# ── Tool definitions (returned during initialize) ─────────────────────────────

TOOLS = [
    {
        "name": "search_assets",
        "description": "Search across all data assets in OpenMetadata (tables, dashboards, topics, pipelines).",
        "inputSchema": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Search query string"},
                "index": {"type": "string", "default": "dataAsset", "description": "Search index"},
                "size": {"type": "integer", "default": 10},
            },
            "required": ["query"],
        },
    },
    {
        "name": "get_entity_timeline",
        "description": "Get the full change history timeline for a data asset.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "entity_type": {"type": "string", "description": "e.g. 'tables', 'dashboards'"},
                "entity_id": {"type": "string", "description": "UUID of the entity"},
            },
            "required": ["entity_type", "entity_id"],
        },
    },
    {
        "name": "get_schema_diff",
        "description": "Compare two versions of a table schema to see what changed.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "entity_type": {"type": "string"},
                "entity_id": {"type": "string"},
                "from_version": {"type": "number"},
                "to_version": {"type": "number"},
            },
            "required": ["entity_type", "entity_id", "from_version", "to_version"],
        },
    },
    {
        "name": "get_lineage",
        "description": "Get the upstream and downstream lineage graph for a data asset.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "entity_type": {"type": "string"},
                "entity_id": {"type": "string"},
                "upstream_depth": {"type": "integer", "default": 3},
                "downstream_depth": {"type": "integer", "default": 3},
            },
            "required": ["entity_type", "entity_id"],
        },
    },
    {
        "name": "get_impact_analysis",
        "description": "Compute the downstream blast radius if a data asset changes.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "entity_type": {"type": "string"},
                "entity_id": {"type": "string"},
                "change_type": {"type": "string", "default": "SCHEMA_CHANGE"},
            },
            "required": ["entity_type", "entity_id"],
        },
    },
    {
        "name": "ask_metadata_ai",
        "description": (
            "Ask a natural language question about your data assets. "
            "Supports root-cause analysis, ownership queries, change history Q&A."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "question": {"type": "string"},
                "entity_type": {"type": "string"},
                "entity_id": {"type": "string"},
            },
            "required": ["question"],
        },
    },
]

# ── Tool handlers ─────────────────────────────────────────────────────────────

async def _handle_search_assets(args: dict) -> Any:
    result = await om_client.search(
        query=args.get("query", "*"),
        index=args.get("index", "dataAsset"),
        size=args.get("size", 10),
    )
    hits = result.get("hits", {}).get("hits", [])
    return [
        {
            "id": h.get("_id"),
            "name": h.get("_source", {}).get("name"),
            "fqn": h.get("_source", {}).get("fullyQualifiedName"),
            "type": h.get("_source", {}).get("entityType"),
            "description": h.get("_source", {}).get("description"),
        }
        for h in hits
    ]


async def _handle_get_timeline(args: dict) -> Any:
    events = await get_entity_timeline(args["entity_type"], args["entity_id"])
    return [e.model_dump() for e in events[:30]]


async def _handle_schema_diff(args: dict) -> Any:
    diff = await compute_schema_diff(
        args["entity_type"],
        args["entity_id"],
        float(args["from_version"]),
        float(args["to_version"]),
    )
    return diff.model_dump()


async def _handle_lineage(args: dict) -> Any:
    graph = await get_lineage_graph(
        args["entity_type"],
        args["entity_id"],
        upstream_depth=args.get("upstream_depth", 3),
        downstream_depth=args.get("downstream_depth", 3),
    )
    return graph.model_dump()


async def _handle_impact(args: dict) -> Any:
    result = await compute_blast_radius(
        args["entity_type"],
        args["entity_id"],
        args.get("change_type", "SCHEMA_CHANGE"),
    )
    return result.model_dump()


async def _handle_ask_ai(args: dict) -> Any:
    events = []
    if args.get("entity_type") and args.get("entity_id"):
        events = await get_entity_timeline(args["entity_type"], args["entity_id"])
    resp = await answer_query(
        question=args["question"],
        context_events=events,
        entity_name=args.get("entity_id"),
    )
    return resp.model_dump()


TOOL_HANDLERS = {
    "search_assets": _handle_search_assets,
    "get_entity_timeline": _handle_get_timeline,
    "get_schema_diff": _handle_schema_diff,
    "get_lineage": _handle_lineage,
    "get_impact_analysis": _handle_impact,
    "ask_metadata_ai": _handle_ask_ai,
}

# ── JSON-RPC dispatcher ────────────────────────────────────────────────────────

def _ok(req_id: Any, result: Any) -> dict:
    return {"jsonrpc": "2.0", "id": req_id, "result": result}


def _err(req_id: Any, code: int, message: str) -> dict:
    return {"jsonrpc": "2.0", "id": req_id, "error": {"code": code, "message": message}}


@router.post("")
async def mcp_endpoint(request: Request):
    """MCP JSON-RPC 2.0 endpoint compatible with Claude Desktop and Cursor."""
    try:
        body = await request.json()
    except Exception:
        return JSONResponse(_err(None, -32700, "Parse error"), status_code=400)

    method = body.get("method", "")
    params = body.get("params", {})
    req_id = body.get("id")

    # ── MCP lifecycle ──────────────────────────────────────────────────────
    if method == "initialize":
        return JSONResponse(_ok(req_id, {
            "protocolVersion": "2024-11-05",
            "capabilities": {"tools": {}},
            "serverInfo": {
                "name": "metachrono",
                "version": "1.0.0",
                "description": "Temporal intelligence for OpenMetadata — time-travel through your data history.",
            },
        }))

    if method == "initialized":
        return JSONResponse(_ok(req_id, {}))

    if method == "tools/list":
        return JSONResponse(_ok(req_id, {"tools": TOOLS}))

    if method == "tools/call":
        tool_name = params.get("name", "")
        tool_args = params.get("arguments", {})
        handler = TOOL_HANDLERS.get(tool_name)
        if not handler:
            return JSONResponse(_err(req_id, -32601, f"Unknown tool: {tool_name}"))
        try:
            result = await handler(tool_args)
            return JSONResponse(_ok(req_id, {
                "content": [{"type": "text", "text": str(result)}],
                "isError": False,
            }))
        except Exception as exc:
            return JSONResponse(_ok(req_id, {
                "content": [{"type": "text", "text": f"Error: {exc}"}],
                "isError": True,
            }))

    return JSONResponse(_err(req_id, -32601, f"Method not found: {method}"))


@router.get("/manifest")
async def mcp_manifest():
    """Human-readable MCP manifest for discovery."""
    return {
        "name": "metachrono",
        "description": "Temporal intelligence for OpenMetadata",
        "version": "1.0.0",
        "tools": TOOLS,
        "endpoint": "/mcp",
        "protocol": "MCP 2024-11-05 (JSON-RPC 2.0)",
    }
