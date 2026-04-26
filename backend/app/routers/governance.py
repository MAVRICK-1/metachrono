"""
Governance audit router.

Surfaces governance-relevant events: tag assignments, ownership changes,
PII classification, policy updates, and access control modifications.
"""

from fastapi import APIRouter, Query, HTTPException
from typing import Optional
from datetime import datetime

from app.services.om_client import om_client
from app.services.time_travel import get_entity_timeline
from app.models.schemas import GovernanceEvent

router = APIRouter(prefix="/governance", tags=["governance"])

GOVERNANCE_FIELDS = {
    "tags",
    "owners",
    "tier",
    "domain",
    "dataProducts",
    "retentionPeriod",
    "extension",
}


def _is_governance_event(event) -> bool:
    if not event.changeDescription:
        return event.eventType in ("ENTITY_CREATED", "ENTITY_DELETED")
    all_fields = (
        [f.name for f in event.changeDescription.fieldsAdded]
        + [f.name for f in event.changeDescription.fieldsUpdated]
        + [f.name for f in event.changeDescription.fieldsDeleted]
    )
    return any(f in GOVERNANCE_FIELDS for f in all_fields)


def _to_gov_event(entry: dict, entity_type: str, entity_id: str) -> dict:
    cd_raw = entry.get("changeDescription") or {}
    details: dict = {}
    for f in cd_raw.get("fieldsUpdated", []):
        if f.get("name") in GOVERNANCE_FIELDS:
            details[f["name"]] = {"from": f.get("oldValue"), "to": f.get("newValue")}
    for f in cd_raw.get("fieldsAdded", []):
        if f.get("name") in GOVERNANCE_FIELDS:
            details[f["name"]] = {"added": f.get("newValue")}
    for f in cd_raw.get("fieldsDeleted", []):
        if f.get("name") in GOVERNANCE_FIELDS:
            details[f["name"]] = {"removed": f.get("oldValue")}
    return GovernanceEvent(
        timestamp=int(entry.get("timestamp", 0)),
        entityId=entry.get("entityId", entity_id),
        entityName=entry.get("entityFQN") or entity_id,
        entityType=entry.get("entityType", entity_type),
        eventType=entry.get("eventType", "ENTITY_UPDATED"),
        actor=entry.get("userName") or entry.get("updatedBy") or "system",
        details=details,
    ).model_dump()


@router.get("/{entity_type}/{entity_id}/audit")
async def governance_audit(
    entity_type: str,
    entity_id: str,
    start_ts: Optional[int] = Query(None),
    end_ts: Optional[int] = Query(None),
) -> list[dict]:
    """
    Return the governance audit trail for a single entity:
    tagging history, ownership changes, PII classification events, etc.
    """
    try:
        # Use real audit logs API: GET /v1/audit/logs
        logs = await om_client.get_audit_logs(
            entity_type=entity_type,
            entity_fqn=None,
            start_ts=start_ts,
            end_ts=end_ts,
            limit=100,
        )
        all_events = []
        for entry in logs.get("data", []):
            if entry.get("entityId") != entity_id:
                continue
            cd_raw = entry.get("changeDescription") or {}
            all_fields = (
                [f.get("name", "") for f in cd_raw.get("fieldsAdded", [])]
                + [f.get("name", "") for f in cd_raw.get("fieldsUpdated", [])]
                + [f.get("name", "") for f in cd_raw.get("fieldsDeleted", [])]
            )
            if not any(f in GOVERNANCE_FIELDS for f in all_fields) and entry.get("eventType") not in ("ENTITY_CREATED", "ENTITY_DELETED"):
                continue
            all_events.append(entry)
        if all_events:
            return [_to_gov_event(e, entity_type, entity_id) for e in all_events]
    except Exception:
        pass

    # Fallback: reconstruct from version history
    try:
        events = await get_entity_timeline(entity_type, entity_id)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc))

    gov_events = [e for e in events if _is_governance_event(e)]

    if start_ts:
        gov_events = [e for e in gov_events if e.timestamp >= start_ts]
    if end_ts:
        gov_events = [e for e in gov_events if e.timestamp <= end_ts]

    result = []
    for evt in gov_events:
        details: dict = {}
        if evt.changeDescription:
            for f in evt.changeDescription.fieldsUpdated:
                if f.name in GOVERNANCE_FIELDS:
                    details[f.name] = {"from": f.oldValue, "to": f.newValue}
            for f in evt.changeDescription.fieldsAdded:
                if f.name in GOVERNANCE_FIELDS:
                    details[f.name] = {"added": f.newValue}
            for f in evt.changeDescription.fieldsDeleted:
                if f.name in GOVERNANCE_FIELDS:
                    details[f.name] = {"removed": f.oldValue}

        result.append(
            GovernanceEvent(
                timestamp=evt.timestamp,
                entityId=entity_id,
                entityName=evt.entityFullyQualifiedName or entity_id,
                entityType=entity_type,
                eventType=evt.eventType,
                actor=evt.userName,
                details=details,
            ).model_dump()
        )

    return result


@router.get("/compliance/summary")
async def compliance_summary(
    entity_type: str = Query("tables"),
    limit: int = Query(50, ge=1, le=200),
) -> dict:
    """
    Return a governance compliance scorecard across all assets of a type.
    Checks: has owner, has description, has tags, has domain.
    """
    try:
        raw = await om_client.get(
            f"/{entity_type}",
            params={"limit": limit, "fields": "owners,tags,domain"},
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc))

    assets = raw.get("data", [])
    total = len(assets)
    if total == 0:
        return {"total": 0, "score": 0, "breakdown": {}}

    has_owner = sum(1 for a in assets if a.get("owners"))
    has_desc = sum(1 for a in assets if a.get("description"))
    has_tags = sum(1 for a in assets if a.get("tags"))
    has_domain = sum(1 for a in assets if a.get("domain"))

    score = round(
        100 * (has_owner + has_desc + has_tags + has_domain) / (4 * total), 1
    )

    return {
        "total": total,
        "complianceScore": score,
        "breakdown": {
            "hasOwner": {"count": has_owner, "pct": round(100 * has_owner / total, 1)},
            "hasDescription": {"count": has_desc, "pct": round(100 * has_desc / total, 1)},
            "hasTags": {"count": has_tags, "pct": round(100 * has_tags / total, 1)},
            "hasDomain": {"count": has_domain, "pct": round(100 * has_domain / total, 1)},
        },
        "ungoverned": [
            {
                "id": a.get("id"),
                "name": a.get("name"),
                "fqn": a.get("fullyQualifiedName"),
                "issues": [
                    k for k, v in {
                        "owner": bool(a.get("owners")),
                        "description": bool(a.get("description")),
                        "tags": bool(a.get("tags")),
                        "domain": bool(a.get("domain")),
                    }.items() if not v
                ],
            }
            for a in assets
            if not (a.get("owners") and a.get("description") and a.get("tags"))
        ][:20],
    }
