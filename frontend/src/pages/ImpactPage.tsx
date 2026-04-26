import React, { useState } from 'react';
import { getImpactAnalysis } from '../services/api';
import type { ImpactAnalysisResult } from '../types';
import { Zap, AlertTriangle, CheckCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function ImpactPage() {
  const [entityType, setEntityType] = useState('tables');
  const [entityId, setEntityId] = useState('');
  const [changeType, setChangeType] = useState('SCHEMA_CHANGE');
  const [result, setResult] = useState<ImpactAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function run() {
    if (!entityId) return;
    setLoading(true); setResult(null);
    try { setResult(await getImpactAnalysis(entityType, entityId, changeType)); }
    catch (e: any) { alert('Error: ' + e.message); }
    setLoading(false);
  }

  const chartData = result?.impactedAssets.slice(0, 10).map(a => ({
    name: a.name.length > 14 ? a.name.slice(0, 14) + '…' : a.name,
    score: a.impactScore,
    hops: a.hopsFromSource,
  })) || [];

  function impactChip(score: number) {
    if (score >= 60) return <span className="impact-chip impact-critical">🔴 Critical</span>;
    if (score >= 30) return <span className="impact-chip impact-warning">🟡 Warning</span>;
    return <span className="impact-chip impact-low">🟢 Low</span>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="card">
        <div className="card-title">💥 Blast Radius Calculator</div>
        <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 16 }}>
          Before making a breaking change, see exactly which downstream assets will be affected and how severely.
        </p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>Entity Type</div>
            <select className="mc-select" value={entityType} onChange={e => setEntityType(e.target.value)}>
              <option value="tables">Table</option>
              <option value="dashboards">Dashboard</option>
              <option value="topics">Topic</option>
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>Entity ID (UUID)</div>
            <input style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text)', padding: '8px 12px', fontSize: 13, outline: 'none' }}
              placeholder="Paste entity UUID…" value={entityId} onChange={e => setEntityId(e.target.value)} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>Change Type</div>
            <select className="mc-select" value={changeType} onChange={e => setChangeType(e.target.value)}>
              <option value="SCHEMA_CHANGE">Schema Change</option>
              <option value="COLUMN_DROP">Column Drop</option>
              <option value="TYPE_CHANGE">Type Change</option>
              <option value="TABLE_DROP">Table Drop</option>
            </select>
          </div>
          <button className="btn btn-primary" onClick={run}><Zap size={14} /> Analyze Impact</button>
        </div>
      </div>

      {loading && <div className="spinner" />}

      {result && (
        <>
          <div className="stat-grid">
            <div className="stat-tile">
              <div style={{ color: 'var(--accent)' }}><Zap size={20} /></div>
              <div className="stat-value">{result.totalImpacted}</div>
              <div className="stat-label">Total Impacted</div>
              <div className="stat-sub">Downstream assets</div>
            </div>
            <div className="stat-tile">
              <div style={{ color: 'var(--red)' }}><AlertTriangle size={20} /></div>
              <div className="stat-value" style={{ color: 'var(--red)' }}>{result.criticalCount}</div>
              <div className="stat-label">Critical</div>
              <div className="stat-sub">Score ≥ 60</div>
            </div>
            <div className="stat-tile">
              <div style={{ color: 'var(--yellow)' }}><AlertTriangle size={20} /></div>
              <div className="stat-value" style={{ color: 'var(--yellow)' }}>{result.warningCount}</div>
              <div className="stat-label">Warning</div>
              <div className="stat-sub">Score 30–60</div>
            </div>
            <div className="stat-tile">
              <div style={{ color: 'var(--green)' }}><CheckCircle size={20} /></div>
              <div className="stat-value" style={{ color: 'var(--green)' }}>{result.totalImpacted - result.criticalCount - result.warningCount}</div>
              <div className="stat-label">Low Risk</div>
              <div className="stat-sub">Score &lt; 30</div>
            </div>
          </div>

          {chartData.length > 0 && (
            <div className="card">
              <div className="card-title">Impact Scores (Top 10)</div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData} margin={{ left: -20 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text3)' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text3)' }} domain={[0, 100]} />
                  <Tooltip contentStyle={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8 }} />
                  <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                    {chartData.map((d, i) => (
                      <Cell key={i} fill={d.score >= 60 ? 'var(--red)' : d.score >= 30 ? 'var(--yellow)' : 'var(--green)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="card">
            <div className="card-title">Impacted Assets</div>
            <table className="mc-table">
              <thead><tr><th>Asset</th><th>Type</th><th>Hops</th><th>Owners</th><th>Impact</th></tr></thead>
              <tbody>
                {result.impactedAssets.map(a => (
                  <tr key={a.id}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{a.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>{a.fullyQualifiedName}</div>
                    </td>
                    <td><span className="badge badge-blue">{a.entityType}</span></td>
                    <td><span style={{ color: 'var(--text2)', fontSize: 13 }}>{a.hopsFromSource}</span></td>
                    <td style={{ fontSize: 12, color: 'var(--text2)' }}>{a.owners.join(', ') || '—'}</td>
                    <td>{impactChip(a.impactScore)} <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 4 }}>{a.impactScore}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {!loading && !result && (
        <div className="empty-state card">
          <div className="empty-icon">💥</div>
          <div className="empty-text">Enter an entity ID and click "Analyze Impact" to see the blast radius.</div>
        </div>
      )}
    </div>
  );
}
