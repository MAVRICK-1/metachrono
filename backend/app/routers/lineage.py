"""Lineage router — current graph + temporal diff."""

from fastapi import APIRouter, Query, HTTPException

from app.services.lineage_service import get_lineage_graph, diff_lineage_graphs
from app.models.schemas import LineageGraph, LineageDiff

router = APIRouter(prefix="/lineage", tags=["lineage"])


@router.get("/{entity_type}/{entity_id}")
async def lineage_graph(
    entity_type: str,
    entity_id: str,
    upstream_depth: int = Query(3, ge=0, le=5),
    downstream_depth: int = Query(3, ge=0, le=5),
) -> dict:
    """Return the full lineage graph for an entity (current state)."""
    try:
        graph = await get_lineage_graph(entity_type, entity_id, upstream_depth, downstream_depth)
        return graph.model_dump()
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc))


@router.get("/{entity_type}/{entity_id}/diff")
async def lineage_diff(
    entity_type: str,
    entity_id: str,
    from_timestamp: int = Query(..., description="Start epoch ms"),
    to_timestamp: int = Query(..., description="End epoch ms"),
) -> dict:
    """
    Compare lineage graphs between two points in time.
    Returns added/removed nodes and edges.
    """
    try:
        diff = await diff_lineage_graphs(entity_type, entity_id, from_timestamp, to_timestamp)
        return diff.model_dump()
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc))
