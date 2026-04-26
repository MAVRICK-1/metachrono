"""Assets router — search, list, and inspect data assets."""

from fastapi import APIRouter, Query, HTTPException
from typing import Optional

from app.services.om_client import om_client
from app.services.time_travel import get_change_velocity
from app.models.schemas import AssetSummary

router = APIRouter(prefix="/assets", tags=["assets"])


@router.get("/search")
async def search_assets(
    q: str = Query("*", description="Search query"),
    index: str = Query("dataAsset", description="Search index"),
    size: int = Query(20, ge=1, le=100),
    from_: int = Query(0, alias="from", ge=0),
):
    """Full-text search across all OpenMetadata assets."""
    try:
        result = await om_client.search(q, index=index, size=size, from_=from_)
        return result
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc))


@router.get("/list")
async def list_assets(
    entity_type: str = Query("tables", description="Entity type (tables, dashboards, topics, pipelines)"),
    limit: int = Query(25, ge=1, le=100),
    after: Optional[str] = Query(None),
):
    """List assets of a given type with version and velocity metadata."""
    try:
        raw = await om_client.get(f"/{entity_type}", params={"limit": limit, "fields": "owners,tags,domain"})
        assets: list[AssetSummary] = []
        for item in raw.get("data", []):
            entity_id = item.get("id", "")
            entity_type_clean = entity_type.rstrip("s")

            velocity = 0.0
            try:
                versions = await om_client.get_entity_versions(entity_type, entity_id)
                version_list = versions.get("versions", []) if isinstance(versions, dict) else versions
                total_versions = len(version_list)
            except Exception:
                total_versions = 0

            owners = [
                o.get("name", "") for o in item.get("owners", []) if isinstance(o, dict)
            ]
            tags = [
                t.get("tagFQN", "") for t in item.get("tags", []) if isinstance(t, dict)
            ]
            domain = item.get("domain", {})
            if isinstance(domain, dict):
                domain = domain.get("name")

            assets.append(
                AssetSummary(
                    id=entity_id,
                    name=item.get("name", ""),
                    fullyQualifiedName=item.get("fullyQualifiedName", ""),
                    entityType=entity_type_clean,
                    description=item.get("description"),
                    currentVersion=item.get("version"),
                    totalVersions=total_versions,
                    lastModified=item.get("updatedAt"),
                    owners=owners,
                    tags=tags,
                    domain=domain,
                )
            )

        return {
            "assets": [a.model_dump() for a in assets],
            "paging": raw.get("paging", {}),
        }
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc))


@router.get("/{entity_type}/{entity_id}")
async def get_asset(entity_type: str, entity_id: str):
    """Get full details of a single asset."""
    try:
        return await om_client.get_entity(entity_type, entity_id)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc))


@router.get("/{entity_type}/{entity_id}/versions")
async def get_asset_versions(entity_type: str, entity_id: str):
    """List all versions of an asset."""
    try:
        return await om_client.get_entity_versions(entity_type, entity_id)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc))


@router.get("/{entity_type}/{entity_id}/versions/{version}")
async def get_asset_at_version(entity_type: str, entity_id: str, version: float):
    """Get asset snapshot at a specific version number."""
    try:
        return await om_client.get_entity_at_version(entity_type, entity_id, version)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc))
