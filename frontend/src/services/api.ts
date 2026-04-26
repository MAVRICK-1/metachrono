import axios from 'axios';
import type {
  ChangeEvent,
  SchemaDiff,
  LineageGraph,
  LineageDiff,
  ImpactAnalysisResult,
  GovernanceEvent,
  AssetSummary,
  AIQueryResponse,
  ComplianceSummary,
} from '../types';

const BASE_URL = process.env.REACT_APP_API_URL || '/api/v1';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
});

// ── Assets ────────────────────────────────────────────────────────────────────

export const searchAssets = async (q: string, size = 20) => {
  const { data } = await api.get('/assets/search', { params: { q, size } });
  return data;
};

export const listAssets = async (entityType = 'tables', limit = 25): Promise<{ assets: AssetSummary[]; paging: any }> => {
  const { data } = await api.get('/assets/list', { params: { entity_type: entityType, limit } });
  return data;
};

export const getAsset = async (entityType: string, entityId: string) => {
  const { data } = await api.get(`/assets/${entityType}/${entityId}`);
  return data;
};

export const getAssetVersions = async (entityType: string, entityId: string) => {
  const { data } = await api.get(`/assets/${entityType}/${entityId}/versions`);
  return data;
};

// ── Timeline ──────────────────────────────────────────────────────────────────

export const getTimeline = async (
  entityType: string,
  entityId: string,
  startTs?: number,
  endTs?: number,
): Promise<ChangeEvent[]> => {
  const { data } = await api.get(`/timeline/${entityType}/${entityId}`, {
    params: { start_ts: startTs, end_ts: endTs },
  });
  return data;
};

export const getSnapshotAtTime = async (entityType: string, entityId: string, timestamp: number) => {
  const { data } = await api.get(`/timeline/${entityType}/${entityId}/snapshot`, {
    params: { timestamp },
  });
  return data;
};

export const getSchemaDiff = async (
  entityType: string,
  entityId: string,
  fromVersion: number,
  toVersion: number,
): Promise<SchemaDiff> => {
  const { data } = await api.get(`/timeline/${entityType}/${entityId}/diff`, {
    params: { from_version: fromVersion, to_version: toVersion },
  });
  return data;
};

export const getChangeVelocity = async (entityType: string, entityId: string) => {
  const { data } = await api.get(`/timeline/${entityType}/${entityId}/velocity`);
  return data;
};

// ── Lineage ───────────────────────────────────────────────────────────────────

export const getLineage = async (
  entityType: string,
  entityId: string,
  upstreamDepth = 3,
  downstreamDepth = 3,
): Promise<LineageGraph> => {
  const { data } = await api.get(`/lineage/${entityType}/${entityId}`, {
    params: { upstream_depth: upstreamDepth, downstream_depth: downstreamDepth },
  });
  return data;
};

export const getLineageDiff = async (
  entityType: string,
  entityId: string,
  fromTimestamp: number,
  toTimestamp: number,
) => {
  const { data } = await api.get(`/lineage/${entityType}/${entityId}/diff`, {
    params: { from_timestamp: fromTimestamp, to_timestamp: toTimestamp },
  });
  return data;
};

// ── Impact ────────────────────────────────────────────────────────────────────

export const getImpactAnalysis = async (
  entityType: string,
  entityId: string,
  changeType = 'SCHEMA_CHANGE',
): Promise<ImpactAnalysisResult> => {
  const { data } = await api.get(`/impact/${entityType}/${entityId}`, {
    params: { change_type: changeType },
  });
  return data;
};

// ── Governance ────────────────────────────────────────────────────────────────

export const getGovernanceAudit = async (
  entityType: string,
  entityId: string,
  startTs?: number,
  endTs?: number,
): Promise<GovernanceEvent[]> => {
  const { data } = await api.get(`/governance/${entityType}/${entityId}/audit`, {
    params: { start_ts: startTs, end_ts: endTs },
  });
  return data;
};

export const getComplianceSummary = async (
  entityType = 'tables',
  limit = 50,
): Promise<ComplianceSummary> => {
  const { data } = await api.get('/governance/compliance/summary', {
    params: { entity_type: entityType, limit },
  });
  return data;
};

// ── AI ────────────────────────────────────────────────────────────────────────

export const askAI = async (
  question: string,
  entityId?: string,
  entityType?: string,
  context?: string,
): Promise<AIQueryResponse> => {
  const { data } = await api.post('/ai/query', {
    question,
    entityId,
    entityType,
    context,
  });
  return data;
};

export const getAISuggestions = async (entityType: string, entityId: string) => {
  const { data } = await api.get('/ai/suggestions', {
    params: { entity_type: entityType, entity_id: entityId },
  });
  return data;
};

// ── Health ────────────────────────────────────────────────────────────────────

export const checkHealth = async () => {
  const { data } = await axios.get('/health');
  return data;
};
