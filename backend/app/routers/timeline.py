"""Timeline router — the core time-travel engine."""

from fastapi import APIRouter, Query, HTTPException
from typing import Optional

from app.services.time_travel import (
    get_entity_timeline,
    get_entity_at_time,
    compute_schema_diff,
    get_change_velocity,
)
from app.models.schemas import ChangeEvent, SchemaDiff

router = APIRouter(prefix="/timeline", tags=["timeline"])


@router.get("/{entity_type}/{entity_id}")
async def entity_timeline(
    entity_type: str,
    entity_id: str,
    start_ts: Optional[int] = Query(None, description="Start epoch ms"),
    end_ts: Optional[int] = Query(None, description="End epoch ms"),
) -> list[dict]:
    """
    Return the full change timeline of an entity.
    Optionally filter to a specific time window.
    """
    try:
        events = await get_entity_timeline(entity_type, entity_id)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc))

    if start_ts:
        events = [e for e in events if e.timestamp >= start_ts]
    if end_ts:
        events = [e for e in events if e.timestamp <= end_ts]

    return [e.model_dump() for e in events]


@router.get("/{entity_type}/{entity_id}/snapshot")
async def entity_snapshot_at_time(
    entity_type: str,
    entity_id: str,
    timestamp: int = Query(..., description="Target epoch ms"),
):
    """
    Return the entity state as it was at the given timestamp.
    This is the core 'time travel' endpoint.
    """
    try:
        snapshot = await get_entity_at_time(entity_type, entity_id, timestamp)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc))

    if snapshot is None:
        raise HTTPException(
            status_code=404,
            detail="No version found at or before the requested timestamp.",
        )
    return snapshot


@router.get("/{entity_type}/{entity_id}/diff")
async def schema_diff(
    entity_type: str,
    entity_id: str,
    from_version: float = Query(..., description="Source version number"),
    to_version: float = Query(..., description="Target version number"),
) -> dict:
    """
    Return a structured diff between two versions of an entity.
    Shows added, removed, and modified columns with full details.
    """
    try:
        diff = await compute_schema_diff(entity_type, entity_id, from_version, to_version)
        return diff.model_dump()
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc))


@router.get("/{entity_type}/{entity_id}/velocity")
async def change_velocity(entity_type: str, entity_id: str) -> dict:
    """
    Return the change velocity (changes/week) for an entity.
    High velocity indicates an unstable asset.
    """
    try:
        velocity = await get_change_velocity(entity_type, entity_id)
        return {"entityId": entity_id, "changesPerWeek": velocity}
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc))
