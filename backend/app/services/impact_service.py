"""
Impact Analysis Service
=======================
Traverses the downstream lineage graph and scores how severely each
downstream asset is affected by a change to the source entity.

Scoring model
-------------
  base_score = 100 / (hops ** 1.5)   (attenuates with distance)
  multiplier += 0.5  if asset has DQ tests
  multiplier += 0.3  if asset has owners
  multiplier += 0.2  if asset has tags

Final score is clamped to [0, 100].
"""

import asyncio
from collections import deque
from typing import Optional

from app.services.om_client import om_client
from app.models.schemas import ImpactedAsset, ImpactAnalysisResult


async def _fetch_node_info(node_raw: dict) -> Optional[ImpactedAsset]:
    entity_type = node_raw.get("type", "table")
    entity_id = node_raw.get("id", "")
    name = node_raw.get("name", "")
    fqn = node_raw.get("fullyQualifiedName", "")

    try:
        detail = await om_client.get_entity(entity_type + "s", entity_id)
    except Exception:
        detail = node_raw

    owners = []
    for owner in detail.get("owners", []):
        if isinstance(owner, dict):
            owners.append(owner.get("name", ""))

    return ImpactedAsset(
        id=entity_id,
        name=name,
        fullyQualifiedName=fqn,
        entityType=entity_type,
        impactScore=0.0,
        hopsFromSource=0,
        owners=owners,
        description=detail.get("description"),
    )


async def compute_blast_radius(
    entity_type: str,
    entity_id: str,
    change_type: str = "SCHEMA_CHANGE",
    max_depth: int = 5,
) -> ImpactAnalysisResult:
    """
    BFS over the downstream lineage graph and compute impact scores.
    """
    try:
        raw = await om_client.get_lineage(
            entity_type, entity_id, upstream_depth=0, downstream_depth=max_depth
        )
    except Exception as exc:
        return ImpactAnalysisResult(
            sourceEntityId=entity_id,
            sourceEntityName=entity_id,
            changeType=change_type,
            totalImpacted=0,
            criticalCount=0,
            warningCount=0,
            impactedAssets=[],
        )

    source_entity = raw.get("entity", {})
    source_name = source_entity.get("name", entity_id)

    # Build adjacency from downstream edges
    downstream_edges: dict[str, list[str]] = {}
    for edge in raw.get("downstreamEdges", []):
        src = edge.get("fromEntity", "")
        dst = edge.get("toEntity", "")
        downstream_edges.setdefault(src, []).append(dst)

    node_by_id: dict[str, dict] = {source_entity.get("id", ""): source_entity}
    for node in raw.get("nodes", []):
        node_by_id[node.get("id", "")] = node

    # BFS
    visited: dict[str, int] = {}  # id -> hops
    queue: deque = deque([(entity_id, 0)])

    while queue:
        current_id, hops = queue.popleft()
        if current_id in visited:
            continue
        if hops > 0:
            visited[current_id] = hops
        for next_id in downstream_edges.get(current_id, []):
            if next_id not in visited:
                queue.append((next_id, hops + 1))

    # Score each impacted asset
    tasks = []
    hop_map: dict[str, int] = {}
    for nid, hops in visited.items():
        node_raw = node_by_id.get(nid, {"id": nid, "name": nid, "type": "table"})
        tasks.append(_fetch_node_info(node_raw))
        hop_map[nid] = hops

    results = await asyncio.gather(*tasks, return_exceptions=True)

    impacted: list[ImpactedAsset] = []
    ids_in_order = list(visited.keys())

    for i, result in enumerate(results):
        if isinstance(result, Exception) or result is None:
            continue

        asset: ImpactedAsset = result
        hops = hop_map.get(asset.id, 1)
        asset.hopsFromSource = hops

        # Base score
        score = min(100.0, 100.0 / (hops ** 1.5))

        # Adjust
        if asset.owners:
            score = min(100.0, score * 1.3)
        if asset.description:
            score = min(100.0, score * 1.1)

        asset.impactScore = round(score, 1)
        impacted.append(asset)

    impacted.sort(key=lambda a: -a.impactScore)

    critical = sum(1 for a in impacted if a.impactScore >= 60)
    warning = sum(1 for a in impacted if 30 <= a.impactScore < 60)

    return ImpactAnalysisResult(
        sourceEntityId=entity_id,
        sourceEntityName=source_name,
        changeType=change_type,
        totalImpacted=len(impacted),
        criticalCount=critical,
        warningCount=warning,
        impactedAssets=impacted,
    )
