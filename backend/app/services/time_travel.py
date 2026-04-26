"""
Time Travel Service
===================
Core engine that reconstructs the historical state of data assets at any
point in time using OpenMetadata's entity version history and change events.
"""

from typing import Any, Optional
from datetime import datetime
import math

from app.services.om_client import om_client
from app.models.schemas import (
    ChangeEvent,
    ChangeDescription,
    FieldChange,
    ColumnDiff,
    SchemaDiff,
)


async def get_entity_timeline(
    entity_type: str,
    entity_id: str,
) -> list[ChangeEvent]:
    """
    Return the full ordered timeline of changes for any entity,
    reconstructed from version history.
    """
    try:
        versions_resp = await om_client.get_entity_versions(entity_type, entity_id)
    except Exception:
        return []

    version_list: list[float] = []
    if isinstance(versions_resp, dict):
        version_list = versions_resp.get("versions", [])
    elif isinstance(versions_resp, list):
        version_list = versions_resp

    version_list = sorted(version_list)
    events: list[ChangeEvent] = []

    for ver in version_list:
        try:
            snapshot = await om_client.get_entity_at_version(entity_type, entity_id, ver)
        except Exception:
            continue

        change_desc_raw = snapshot.get("changeDescription") or {}
        change_desc = ChangeDescription(
            fieldsAdded=[
                FieldChange(**f) if isinstance(f, dict) else FieldChange(name=str(f))
                for f in change_desc_raw.get("fieldsAdded", [])
            ],
            fieldsUpdated=[
                FieldChange(**f) if isinstance(f, dict) else FieldChange(name=str(f))
                for f in change_desc_raw.get("fieldsUpdated", [])
            ],
            fieldsDeleted=[
                FieldChange(**f) if isinstance(f, dict) else FieldChange(name=str(f))
                for f in change_desc_raw.get("fieldsDeleted", [])
            ],
            previousVersion=change_desc_raw.get("previousVersion"),
        )

        # Extract updater info
        updated_by = snapshot.get("updatedBy") or snapshot.get("updatedAt")
        if isinstance(updated_by, dict):
            actor = updated_by.get("name", "unknown")
        else:
            actor = str(updated_by) if updated_by else "system"

        updated_at = snapshot.get("updatedAt")
        if not updated_at:
            updated_at = int(datetime.utcnow().timestamp() * 1000)

        event_type = "ENTITY_CREATED" if ver == 0.1 else "ENTITY_UPDATED"

        events.append(
            ChangeEvent(
                eventType=event_type,
                entityType=entity_type,
                entityId=entity_id,
                entityFullyQualifiedName=snapshot.get("fullyQualifiedName"),
                timestamp=int(updated_at),
                userName=actor,
                changeDescription=change_desc,
                currentVersion=ver,
                previousVersion=change_desc_raw.get("previousVersion"),
            )
        )

    return events


async def get_entity_at_time(
    entity_type: str,
    entity_id: str,
    target_timestamp: int,
) -> Optional[dict]:
    """
    Return the entity snapshot that was current at `target_timestamp` (epoch ms).
    Finds the latest version whose updatedAt <= target_timestamp.
    """
    try:
        versions_resp = await om_client.get_entity_versions(entity_type, entity_id)
    except Exception:
        return None

    version_list: list[float] = []
    if isinstance(versions_resp, dict):
        version_list = versions_resp.get("versions", [])
    elif isinstance(versions_resp, list):
        version_list = versions_resp

    version_list = sorted(version_list, reverse=True)

    for ver in version_list:
        try:
            snapshot = await om_client.get_entity_at_version(entity_type, entity_id, ver)
        except Exception:
            continue
        updated_at = snapshot.get("updatedAt", 0)
        if updated_at <= target_timestamp:
            return snapshot

    return None


async def compute_schema_diff(
    entity_type: str,
    entity_id: str,
    from_version: float,
    to_version: float,
) -> SchemaDiff:
    """
    Compare two versions of a table/entity and return a structured diff.
    Works on columns, descriptions, and tags.
    """
    try:
        snap_from = await om_client.get_entity_at_version(entity_type, entity_id, from_version)
        snap_to = await om_client.get_entity_at_version(entity_type, entity_id, to_version)
    except Exception as exc:
        raise ValueError(f"Could not fetch versions: {exc}")

    def _cols(snap: dict) -> dict[str, dict]:
        return {col["name"]: col for col in snap.get("columns", [])}

    def _tags(snap: dict) -> list[str]:
        return [t.get("tagFQN", "") for t in snap.get("tags", [])]

    from_cols = _cols(snap_from)
    to_cols = _cols(snap_to)
    from_tags = _tags(snap_from)
    to_tags = _tags(snap_to)

    all_col_names = set(from_cols) | set(to_cols)
    column_diffs: list[ColumnDiff] = []

    for col_name in sorted(all_col_names):
        if col_name in from_cols and col_name not in to_cols:
            status = "removed"
        elif col_name not in from_cols and col_name in to_cols:
            status = "added"
        else:
            fc = from_cols[col_name]
            tc = to_cols[col_name]
            changed = (
                fc.get("dataType") != tc.get("dataType")
                or fc.get("description") != tc.get("description")
                or set(t.get("tagFQN", "") for t in fc.get("tags", []))
                != set(t.get("tagFQN", "") for t in tc.get("tags", []))
            )
            status = "modified" if changed else "unchanged"

        fc = from_cols.get(col_name, {})
        tc = to_cols.get(col_name, {})
        column_diffs.append(
            ColumnDiff(
                name=col_name,
                status=status,
                oldDataType=fc.get("dataType"),
                newDataType=tc.get("dataType"),
                oldDescription=fc.get("description"),
                newDescription=tc.get("description"),
                oldTags=[t.get("tagFQN", "") for t in fc.get("tags", [])],
                newTags=[t.get("tagFQN", "") for t in tc.get("tags", [])],
            )
        )

    tags_changed = list(set(from_tags) ^ set(to_tags))

    return SchemaDiff(
        entityId=entity_id,
        entityName=snap_to.get("name", entity_id),
        fromVersion=from_version,
        toVersion=to_version,
        fromTimestamp=snap_from.get("updatedAt"),
        toTimestamp=snap_to.get("updatedAt"),
        columns=column_diffs,
        descriptionChanged=snap_from.get("description") != snap_to.get("description"),
        oldDescription=snap_from.get("description"),
        newDescription=snap_to.get("description"),
        tagsChanged=tags_changed,
    )


async def get_change_velocity(entity_type: str, entity_id: str) -> float:
    """
    Calculate the average number of schema changes per week
    over the entity's lifetime.
    """
    events = await get_entity_timeline(entity_type, entity_id)
    if len(events) <= 1:
        return 0.0

    first_ts = min(e.timestamp for e in events)
    last_ts = max(e.timestamp for e in events)
    weeks = max(1, (last_ts - first_ts) / (1000 * 60 * 60 * 24 * 7))
    return round(len(events) / weeks, 2)
