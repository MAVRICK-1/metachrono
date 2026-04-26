import React, { useState } from 'react';
import { getGovernanceAudit, getComplianceSummary } from '../services/api';
import type { GovernanceEvent, ComplianceSummary } from '../types';
import { ShieldCheck, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

export default function GovernancePage() {
  const [tab, setTab] = useState<'audit' | 'compliance'>('compliance');
  const [entityType, setEntityType] = useState('tables');
  const [entityId, setEntityId] = useState('');
  const [events, setEvents] = useState<GovernanceEvent[]>([]);
  const [compliance, setCompliance] = useState<ComplianceSummary | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadAudit() {
    if (!entityId) return;
    setLoading(true);
    try { setEvents(await getGovernanceAudit(entityType, entityId)); setTab('audit'); }
    catch (e: any) { alert('Error: ' + e.message); }
    setLoading(false);
  }

  async function loadCompliance() {
    setLoading(true);
    try { setCompliance(await getComplianceSummary(entityType, 100)); setTab('compliance'); }
    catch (e: any) { alert('Error: ' + e.message); }
    setLoading(false);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="card">
        <div className="card-title"><ShieldCheck size={14} style={{ display: 'inline', marginRight: 6 }} />Governance Controls</div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>Entity Type</div>
            <select className="mc-select" value={entityType} onChange={e => setEntityType(e.target.value)}>
              <option value="tables">Tables</option>
              <option value="dashboards">Dashboards</option>
              <option value="topics">Topics</option>
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>Entity ID (for Audit Trail)</div>
            <input style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text)', padding: '8px 12px', fontSize: 13, outline: 'none' }}
              placeholder="UUID for per-asset audit" value={entityId} onChange={e => setEntityId(e.target.value)} />
          </div>
          <button className="btn btn-primary" onClick={loadAudit}>Audit Trail</button>
          <button className="btn btn-ghost" onClick={loadCompliance}>Compliance Score</button>
        </div>
      </div>

      {loading && <div className="spinner" />}

      {!loading && tab === 'compliance' && compliance && (
        <>
          <div className="stat-grid">
            <div className="stat-tile">
              <div className="stat-value" style={{ color: compliance.complianceScore >= 75 ? 'var(--green)' : compliance.complianceScore >= 50 ? 'var(--yellow)' : 'var(--red)' }}>
                {compliance.complianceScore}%
              </div>
              <div className="stat-label">Compliance Score</div>
            </div>
            <div className="stat-tile">
              <div className="stat-value">{compliance.total}</div>
              <div className="stat-label">Total Assets</div>
            </div>
            <div className="stat-tile">
              <div className="stat-value" style={{ color: 'var(--red)' }}>{compliance.ungoverned.length}</div>
              <div className="stat-label">Ungoverned</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="card">
              <div className="card-title">Breakdown</div>
              {Object.entries(compliance.breakdown).map(([k, v]) => (
                <div key={k} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: 'var(--text2)' }}>{k.replace(/([A-Z])/g, ' $1')}</span>
                    <span style={{ fontSize: 12, color: v.pct >= 75 ? 'var(--green)' : 'var(--yellow)' }}>{v.pct}%</span>
                  </div>
                  <div className="progress-bar-wrap">
                    <div className="progress-bar-fill" style={{ width: `${v.pct}%`, background: v.pct >= 75 ? 'var(--green)' : v.pct >= 50 ? 'var(--yellow)' : 'var(--red)' }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="card">
              <div className="card-title"><AlertTriangle size={12} style={{ display: 'inline', marginRight: 6, color: 'var(--red)' }} />Ungoverned Assets</div>
              <table className="mc-table">
                <thead><tr><th>Asset</th><th>Issues</th></tr></thead>
                <tbody>
                  {compliance.ungoverned.map(a => (
                    <tr key={a.id}>
                      <td>
                        <div style={{ fontWeight: 500, fontSize: 13 }}>{a.name}</div>
                        <div style={{ fontSize: 10, color: 'var(--text3)' }}>{a.fqn}</div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {a.issues.map(issue => <span key={issue} className="badge badge-red">{issue}</span>)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {!loading && tab === 'audit' && (
        <div className="card">
          <div className="card-title">Governance Audit Trail — {events.length} events</div>
          {events.length === 0
            ? <div className="empty-state"><div className="empty-icon">🛡️</div><div className="empty-text">No governance events found for this entity.</div></div>
            : (
              <div className="timeline">
                {[...events].reverse().map((evt, i) => {
                  const dt = format(new Date(evt.timestamp), 'MMM dd, yyyy HH:mm');
                  return (
                    <div key={i} className="tl-entry">
                      <div className="tl-dot-col">
                        <div className="tl-dot updated" />
                        <div className="tl-line" />
                      </div>
                      <div className="tl-body">
                        <div className="tl-meta">
                          <span className="tl-time">{dt}</span>
                          <span className="badge badge-purple">{evt.eventType}</span>
                          <span className="tl-actor">by <strong>{evt.actor || 'system'}</strong></span>
                        </div>
                        {evt.details && Object.keys(evt.details).length > 0 && (
                          <div style={{ marginTop: 6 }}>
                            {Object.entries(evt.details).map(([field, change]: any) => (
                              <div key={field} style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 2 }}>
                                <span className="badge badge-yellow">{field}</span>
                                {change.from && <> &nbsp;<span className="diff-tag-old">{JSON.stringify(change.from)}</span></>}
                                {change.to && <> → <span className="diff-tag-new">{JSON.stringify(change.to)}</span></>}
                                {change.added && <> <span className="diff-tag-new">+{JSON.stringify(change.added)}</span></>}
                                {change.removed && <> <span className="diff-tag-old">−{JSON.stringify(change.removed)}</span></>}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
        </div>
      )}

      {!loading && !compliance && tab === 'compliance' && (
        <div className="empty-state card">
          <div className="empty-icon">🛡️</div>
          <div className="empty-text">Click "Compliance Score" to load governance metrics.</div>
        </div>
      )}
    </div>
  );
}
