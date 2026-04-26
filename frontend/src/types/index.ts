// Global type definitions for MetaChronos

export interface ChangeEvent {
  eventType: string;
  entityType: string;
  entityId: string;
  entityFullyQualifiedName?: string;
  timestamp: number;
  userName?: string;
  changeDescription?: ChangeDescription;
  currentVersion?: number;
  previousVersion?: number;
}

export interface ChangeDescription {
  fieldsAdded: FieldChange[];
  fieldsUpdated: FieldChange[];
  fieldsDeleted: FieldChange[];
  previousVersion?: number;
}

export interface FieldChange {
  name: string;
  oldValue?: any;
  newValue?: any;
}

export interface ColumnDiff {
  name: string;
  status: 'added' | 'removed' | 'modified' | 'unchanged';
  oldDataType?: string;
  newDataType?: string;
  oldDescription?: string;
  newDescription?: string;
  oldTags: string[];
  newTags: string[];
}

export interface SchemaDiff {
  entityId: string;
  entityName: string;
  fromVersion: number;
  toVersion: number;
  fromTimestamp?: number;
  toTimestamp?: number;
  columns: ColumnDiff[];
  descriptionChanged: boolean;
  oldDescription?: string;
  newDescription?: string;
  tagsChanged: string[];
}

export interface LineageNode {
  id: string;
  name: string;
  fullyQualifiedName: string;
  entityType: string;
  description?: string;
}

export interface LineageEdge {
  fromEntity: string;
  toEntity: string;
  lineageDetails?: any;
}

export interface LineageGraph {
  entity: LineageNode;
  nodes: LineageNode[];
  edges: LineageEdge[];
}

export interface ImpactedAsset {
  id: string;
  name: string;
  fullyQualifiedName: string;
  entityType: string;
  impactScore: number;
  hopsFromSource: number;
  owners: string[];
  description?: string;
}

export interface ImpactAnalysisResult {
  sourceEntityId: string;
  sourceEntityName: string;
  changeType: string;
  totalImpacted: number;
  criticalCount: number;
  warningCount: number;
  impactedAssets: ImpactedAsset[];
}

export interface GovernanceEvent {
  timestamp: number;
  entityId: string;
  entityName: string;
  entityType: string;
  eventType: string;
  actor?: string;
  details?: Record<string, any>;
}

export interface AssetSummary {
  id: string;
  name: string;
  fullyQualifiedName: string;
  entityType: string;
  description?: string;
  currentVersion?: number;
  totalVersions: number;
  lastModified?: number;
  owners: string[];
  tags: string[];
  domain?: string;
  changeVelocity?: number;
}

export interface AIQueryResponse {
  answer: string;
  reasoning?: string;
  relatedEvents: ChangeEvent[];
  suggestions: string[];
}

export interface ComplianceSummary {
  total: number;
  complianceScore: number;
  breakdown: {
    hasOwner: { count: number; pct: number };
    hasDescription: { count: number; pct: number };
    hasTags: { count: number; pct: number };
    hasDomain: { count: number; pct: number };
  };
  ungoverned: Array<{
    id: string;
    name: string;
    fqn: string;
    issues: string[];
  }>;
}
