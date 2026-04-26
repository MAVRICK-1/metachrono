"""Impact analysis router — downstream blast radius calculator."""

from fastapi import APIRouter, Query, HTTPException

from app.services.impact_service import compute_blast_radius

router = APIRouter(prefix="/impact", tags=["impact"])


@router.get("/{entity_type}/{entity_id}")
async def blast_radius(
    entity_type: str,
    entity_id: str,
    change_type: str = Query("SCHEMA_CHANGE", description="Type of change being evaluated"),
    max_depth: int = Query(5, ge=1, le=8),
) -> dict:
    """
    Compute the downstream blast radius of a change to the given entity.

    Returns all transitively impacted assets, scored by criticality.
    Use this BEFORE making a breaking schema change to understand risk.
    """
    try:
        result = await compute_blast_radius(entity_type, entity_id, change_type, max_depth)
        return result.model_dump()
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc))
