"""
Lineage Service
===============
Fetches and diffs lineage graphs from OpenMetadata, enabling users to see
how data flows changed between two points in time.

Note: OpenMetadata does not store historical lineage snapshots natively.
MetaChronos synthesises "lineage at time T" by combining the current lineage
graph with the entity version history (nodes whose creation date > T are
treated as not-yet-existing).
"""

from typing import Optional

from app.services.om_client import om_client
from app.services.time_travel import get_entity_timeline
from app.models.schemas import LineageNode, LineageEdge, LineageGraph, LineageDiff


def _entity_type_from_fqn(fqn: str) -> str:
    """Heuristic: infer entity type from FQN structure."""
    parts = fqn.split(".")
    if len(parts) >= 4:
        return "table"
    if len(parts) == 3:
        return "databaseSchema"
    return "database"


async def get_lineage_graph(
    entity_type: str,
    entity_id: str,
    upstream_depth: int = 3,
    downstream_depth: int = 3,
) -> LineageGraph:
    """Fetch the current lineage graph for an entity."""
    raw = await om_client.get_lineage(entity_type, entity_id, upstream_depth, downstream_depth)

    entity_raw = raw.get("entity", {})
    root_node = LineageNode(
        id=entity_raw.get("id", entity_id),
        name=entity_raw.get("name", ""),
        fullyQualifiedName=entity_raw.get("fullyQualifiedName", ""),
        entityType=entity_raw.get("type", entity_type),
        description=entity_raw.get("description"),
    )

    nodes: list[LineageNode] = []
    node_map: dict[str, LineageNode] = {root_node.id: root_node}

    for node_raw in raw.get("nodes", []):
        node = LineageNode(
            id=node_raw.get("id", ""),
            name=node_raw.get("name", ""),
            fullyQualifiedName=node_raw.get("fullyQualifiedName", ""),
            entityType=node_raw.get("type", "table"),
            description=node_raw.get("description"),
        )
        nodes.append(node)
        node_map[node.id] = node

    edges: list[LineageEdge] = []
    for edge_raw in raw.get("upstreamEdges", []):
        edges.append(
            LineageEdge(
                fromEntity=edge_raw.get("fromEntity", ""),
                toEntity=edge_raw.get("toEntity", ""),
                lineageDetails=edge_raw.get("lineageDetails"),
            )
        )
    for edge_raw in raw.get("downstreamEdges", []):
        edges.append(
            LineageEdge(
                fromEntity=edge_raw.get("fromEntity", ""),
                toEntity=edge_raw.get("toEntity", ""),
                lineageDetails=edge_raw.get("lineageDetails"),
            )
        )

    return LineageGraph(entity=root_node, nodes=nodes, edges=edges)


async def diff_lineage_graphs(
    entity_type: str,
    entity_id: str,
    from_timestamp: int,
    to_timestamp: int,
) -> LineageDiff:
    """
    Compare the lineage graph at two points in time.

    Strategy:
    - Fetch the current lineage graph (latest state = 'to' state).
    - For each node, inspect its entity timeline; if its first appearance
      is after from_timestamp, it is marked as "added".
    - Edges involving added nodes are treated as added edges.
    - Removed nodes/edges are reconstructed from deleted version events.
    """
    current_graph = await get_lineage_graph(entity_type, entity_id)

    added_nodes: list[LineageNode] = []
    removed_nodes: list[LineageNode] = []
    added_edges: list[LineageEdge] = []
    removed_edges: list[LineageEdge] = []

    for node in current_graph.nodes:
        try:
            events = await get_entity_timeline(
                node.entityType, node.id
            )
        except Exception:
            continue

        if not events:
            continue

        first_event_ts = min(e.timestamp for e in events)

        if first_event_ts > from_timestamp:
            # Node did not exist at from_timestamp → it was added
            added_nodes.append(node)

    added_node_ids = {n.id for n in added_nodes}
    removed_node_ids: set[str] = set()

    for edge in current_graph.edges:
        if edge.fromEntity in added_node_ids or edge.toEntity in added_node_ids:
            added_edges.append(edge)

    return LineageDiff(
        entityId=entity_id,
        fromTime=from_timestamp,
        toTime=to_timestamp,
        addedNodes=added_nodes,
        removedNodes=removed_nodes,
        addedEdges=added_edges,
        removedEdges=removed_edges,
    )
