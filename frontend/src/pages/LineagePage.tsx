import React, { useState, useCallback } from 'react';
import ReactFlow, {
  Background, Controls, MiniMap,
  addEdge, useNodesState, useEdgesState,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { getLineage } from '../services/api';
import type { LineageGraph } from '../types';
import { GitBranch } from 'lucide-react';

const nodeStyle = {
  background: 'var(--bg3)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  padding: '8px 14px',
  color: 'var(--text)',
  fontSize: 12,
  minWidth: 120,
};

function buildFlow(graph: LineageGraph) {
  const all = [graph.entity, ...graph.nodes];
  const nodes = all.map((n, i) => ({
    id: n.id,
    data: { label: <div><div style={{ fontWeight: 600 }}>{n.name}</div><div style={{ fontSize: 10, color: 'var(--text3)' }}>{n.entityType}</div></div> },
    position: { x: (i % 5) * 200, y: Math.floor(i / 5) * 120 },
    style: { ...nodeStyle, borderColor: n.id === graph.entity.id ? 'var(--accent)' : 'var(--border)' },
  }));
  const edges = graph.edges.map((e, i) => ({
    id: `e${i}`,
    source: e.fromEntity,
    target: e.toEntity,
    style: { stroke: 'var(--accent)', strokeWidth: 1.5 },
    animated: true,
  }));
  return { nodes, edges };
}

export default function LineagePage() {
  const [entityType, setEntityType] = useState('tables');
  const [entityId, setEntityId] = useState('');
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [graph, setGraph] = useState<LineageGraph | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    if (!entityId) return;
    setLoading(true);
    try {
      const g = await getLineage(entityType, entityId, 3, 3);
      setGraph(g);
      const { nodes: n, edges: e } = buildFlow(g);
      setNodes(n);
      setEdges(e);
    } catch (e: any) { alert('Error: ' + e.message); }
    setLoading(false);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="card">
        <div className="card-title"><GitBranch size={14} style={{ display: 'inline', marginRight: 6 }} />Lineage Explorer</div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>Entity Type</div>
            <select className="mc-select" value={entityType} onChange={e => setEntityType(e.target.value)}>
              <option value="tables">Table</option>
              <option value="dashboards">Dashboard</option>
              <option value="topics">Topic</option>
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>Entity ID</div>
            <input style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text)', padding: '8px 12px', fontSize: 13, outline: 'none' }}
              placeholder="UUID" value={entityId} onChange={e => setEntityId(e.target.value)} />
          </div>
          <button className="btn btn-primary" onClick={load}><GitBranch size={14} /> Load Lineage</button>
        </div>
      </div>

      {loading && <div className="spinner" />}

      {graph && (
        <div style={{ display: 'flex', gap: 16 }}>
          <div className="card" style={{ width: 180, flexShrink: 0 }}>
            <div className="card-title">Summary</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div><div style={{ fontSize: 11, color: 'var(--text3)' }}>Root</div><div style={{ fontSize: 13, fontWeight: 600 }}>{graph.entity.name}</div></div>
              <div><div style={{ fontSize: 11, color: 'var(--text3)' }}>Nodes</div><div style={{ fontSize: 24, fontWeight: 700, color: 'var(--accent)' }}>{graph.nodes.length + 1}</div></div>
              <div><div style={{ fontSize: 11, color: 'var(--text3)' }}>Edges</div><div style={{ fontSize: 24, fontWeight: 700, color: 'var(--accent2)' }}>{graph.edges.length}</div></div>
            </div>
          </div>
          <div style={{ flex: 1, height: 520, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
            <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} fitView>
              <Background color="var(--border)" gap={20} />
              <Controls style={{ background: 'var(--bg3)', border: '1px solid var(--border)' }} />
              <MiniMap style={{ background: 'var(--bg3)', border: '1px solid var(--border)' }} nodeColor="var(--accent)" />
            </ReactFlow>
          </div>
        </div>
      )}

      {!loading && !graph && (
        <div className="empty-state card">
          <div className="empty-icon">🕸️</div>
          <div className="empty-text">Enter an Entity ID to visualize its lineage graph.</div>
        </div>
      )}
    </div>
  );
}
