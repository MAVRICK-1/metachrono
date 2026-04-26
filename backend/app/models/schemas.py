from pydantic import BaseModel
from typing import Any, Optional
from datetime import datetime


# ── Change event models ────────────────────────────────────────────────────────

class FieldChange(BaseModel):
    name: str
    oldValue: Optional[Any] = None
    newValue: Optional[Any] = None


class ChangeDescription(BaseModel):
    fieldsAdded: list[FieldChange] = []
    fieldsUpdated: list[FieldChange] = []
    fieldsDeleted: list[FieldChange] = []
    previousVersion: Optional[float] = None


class ChangeEvent(BaseModel):
    eventType: str
    entityType: str
    entityId: str
    entityFullyQualifiedName: Optional[str] = None
    timestamp: int  # epoch millis
    userName: Optional[str] = None
    changeDescription: Optional[ChangeDescription] = None
    currentVersion: Optional[float] = None
    previousVersion: Optional[float] = None

    @property
    def datetime(self) -> datetime:
        return datetime.utcfromtimestamp(self.timestamp / 1000)


# ── Column diff ────────────────────────────────────────────────────────────────

class ColumnDiff(BaseModel):
    name: str
    status: str  # "added" | "removed" | "modified" | "unchanged"
    oldDataType: Optional[str] = None
    newDataType: Optional[str] = None
    oldDescription: Optional[str] = None
    newDescription: Optional[str] = None
    oldTags: list[str] = []
    newTags: list[str] = []


class SchemaDiff(BaseModel):
    entityId: str
    entityName: str
    fromVersion: float
    toVersion: float
    fromTimestamp: Optional[int] = None
    toTimestamp: Optional[int] = None
    columns: list[ColumnDiff] = []
    descriptionChanged: bool = False
    oldDescription: Optional[str] = None
    newDescription: Optional[str] = None
    tagsChanged: list[str] = []


# ── Lineage ────────────────────────────────────────────────────────────────────

class LineageNode(BaseModel):
    id: str
    name: str
    fullyQualifiedName: str
    entityType: str
    description: Optional[str] = None


class LineageEdge(BaseModel):
    fromEntity: str
    toEntity: str
    lineageDetails: Optional[dict] = None


class LineageGraph(BaseModel):
    entity: LineageNode
    nodes: list[LineageNode] = []
    edges: list[LineageEdge] = []


class LineageDiff(BaseModel):
    entityId: str
    fromTime: int
    toTime: int
    addedNodes: list[LineageNode] = []
    removedNodes: list[LineageNode] = []
    addedEdges: list[LineageEdge] = []
    removedEdges: list[LineageEdge] = []


# ── Impact analysis ────────────────────────────────────────────────────────────

class ImpactedAsset(BaseModel):
    id: str
    name: str
    fullyQualifiedName: str
    entityType: str
    impactScore: float  # 0-100
    hopsFromSource: int
    owners: list[str] = []
    description: Optional[str] = None


class ImpactAnalysisResult(BaseModel):
    sourceEntityId: str
    sourceEntityName: str
    changeType: str
    totalImpacted: int
    criticalCount: int
    warningCount: int
    impactedAssets: list[ImpactedAsset] = []


# ── Governance ────────────────────────────────────────────────────────────────

class GovernanceEvent(BaseModel):
    timestamp: int
    entityId: str
    entityName: str
    entityType: str
    eventType: str
    actor: Optional[str] = None
    details: Optional[dict] = None

    @property
    def datetime(self) -> datetime:
        return datetime.utcfromtimestamp(self.timestamp / 1000)


# ── AI ─────────────────────────────────────────────────────────────────────────

class AIQueryRequest(BaseModel):
    question: str
    entityId: Optional[str] = None
    entityType: Optional[str] = None
    timeRange: Optional[dict] = None
    context: Optional[str] = None


class AIQueryResponse(BaseModel):
    answer: str
    reasoning: Optional[str] = None
    relatedEvents: list[ChangeEvent] = []
    suggestions: list[str] = []


# ── Asset summary ──────────────────────────────────────────────────────────────

class AssetSummary(BaseModel):
    id: str
    name: str
    fullyQualifiedName: str
    entityType: str
    description: Optional[str] = None
    currentVersion: Optional[float] = None
    totalVersions: int = 0
    lastModified: Optional[int] = None
    owners: list[str] = []
    tags: list[str] = []
    domain: Optional[str] = None
    changeVelocity: Optional[float] = None  # changes per week
