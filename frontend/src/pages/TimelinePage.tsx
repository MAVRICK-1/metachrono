import React, { useState } from 'react';
import { getTimeline, getSchemaDiff, getSnapshotAtTime } from '../services/api';
import type { ChangeEvent, SchemaDiff, ColumnDiff } from '../types';
import { format } from 'date-fns';
import { Clock, GitCompare } from 'lucide-react';

function TimelineEntry({ evt }: { evt: ChangeEvent }) {
  const dt = format(new Date(evt.timestamp), 'MMM dd, yyyy HH:mm');
  const typeClass = evt.eventType.includes('CREATED') ? 'created' : evt.eventType.includes('DELETED') ? 'deleted' : 'updated';
  const desc = evt.changeDescription;
  const changes = [
    ...(desc?.fieldsAdded || []).map(f => ({ label: f.name, type: 'added' })),
    ...(desc?.fieldsUpdated || []).map(f => ({ label: f.name, type: 'updated' })),
    ...(desc?.fieldsDeleted || []).map(f => ({ label: f.name, type: 'removed' })),
  ];
  return (
    <div className="tl-entry">
      <div className="tl-dot-col">
        <div className={`tl-dot ${typeClass}`} />
        <div className="tl-line" />
      </div>
      <div className="tl-body">
        <div className="tl-meta">
          <span className="tl-time">{dt}</span>
          <span className={`badge badge-${typeClass === 'created' ? 'green' : typeClass === 'deleted' ? 'red' : 'purple'}`}>
            {evt.eventType.replace('ENTITY_', '')}
          </span>
          <span className="tl-actor">by <strong>{evt.userName || 'system'}</strong></span>
          <span className="badge badge-blue">v{evt.currentVersion}</span>
        </div>
        <div className="tl-changes">
          {changes.map((c, i) => (
            <span key={i} className={`badge ${c.type === 'added' ? 'badge-green' : c.type === 'removed' ? 'badge-red' : 'badge-yellow'}`}>
              {c.type === 'added' ? '+' : c.type === 'removed' ? '−' : '~'} {c.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function DiffView({ diff }: { diff: SchemaDiff }) {
  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <span className="badge badge-green">+{diff.columns.filter(c => c.status === 'added').length} added</span>
        <span className="badge badge-red">−{diff.columns.filter(c => c.status === 'removed').length} removed</span>
        <span className="badge badge-yellow">~{diff.columns.filter(c => c.status === 'modified').length} modified</span>
        <span className="badge badge-blue">{diff.columns.filter(c => c.status === 'unchanged').length} unchanged</span>
        {diff.descriptionChanged && <span className="badge badge-purple">📝 Description changed</span>}
      </div>
      <table className="mc-table">
        <thead>
          <tr><th>Column</th><th>Status</th><th>Old Type</th><th>New Type</th><th>Description</th></tr>
        </thead>
        <tbody>
          {diff.columns.filter(c => c.status !== 'unchanged').map(col => (
            <tr key={col.name} className={`diff-row-${col.status}`}>
              <td><code style={{ fontSize: 12, color: 'var(--accent2)' }}>{col.name}</code></td>
              <td>
                <span className={`badge ${col.status === 'added' ? 'badge-green' : col.status === 'removed' ? 'badge-red' : 'badge-yellow'}`}>
                  {col.status}
                </span>
              </td>
              <td>
                {col.oldDataType
                  ? <span className="diff-tag-old">{col.oldDataType}</span>
                  : <span style={{ color: 'var(--text3)' }}>—</span>}
              </td>
              <td>
                {col.newDataType
                  ? <span className="diff-tag-new">{col.newDataType}</span>
                  : <span style={{ color: 'var(--text3)' }}>—</span>}
              </td>
              <td style={{ fontSize: 12, color: 'var(--text2)', maxWidth: 200 }}>
                {col.newDescription || col.oldDescription || '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function TimelinePage() {
  const [entityType, setEntityType] = useState('tables');
  const [entityId, setEntityId] = useState('');
  const [events, setEvents] = useState<ChangeEvent[]>([]);
  const [diff, setDiff] = useState<SchemaDiff | null>(null);
  const [snapshot, setSnapshot] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [fromV, setFromV] = useState('');
  const [toV, setToV] = useState('');
  const [snapTs, setSnapTs] = useState('');
  const [tab, setTab] = useState<'timeline' | 'diff' | 'snapshot'>('timeline');

  async function fetchTimeline() {
    if (!entityId) return;
    setLoading(true); setEvents([]); setDiff(null); setSnapshot(null);
    try { setEvents(await getTimeline(entityType, entityId)); }
    catch (e: any) { alert('Error: ' + e.message); }
    setLoading(false);
  }

  async function fetchDiff() {
    if (!entityId || !fromV || !toV) return;
    setLoading(true);
    try { setDiff(await getSchemaDiff(entityType, entityId, parseFloat(fromV), parseFloat(toV))); setTab('diff'); }
    catch (e: any) { alert('Error: ' + e.message); }
    setLoading(false);
  }

  async function fetchSnapshot() {
    if (!entityId || !snapTs) return;
    setLoading(true);
    try { setSnapshot(await getSnapshotAtTime(entityType, entityId, new Date(snapTs).getTime())); setTab('snapshot'); }
    catch (e: any) { alert('Error: ' + e.message); }
    setLoading(false);
  }

  const versions = Array.from(new Set(events.map(e => e.currentVersion).filter(Boolean))).sort() as number[];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Controls */}
      <div className="card">
        <div className="card-title">⏳ Time-Travel Controls</div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>Entity Type</div>
            <select className="mc-select" value={entityType} onChange={e => setEntityType(e.target.value)}>
              <option value="tables">Table</option>
              <option value="dashboards">Dashboard</option>
              <option value="topics">Topic</option>
              <option value="pipelines">Pipeline</option>
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>Entity ID (UUID)</div>
            <input
              style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text)', padding: '8px 12px', fontSize: 13, outline: 'none' }}
              placeholder="e.g. 3a4b5c6d-…"
              value={entityId}
              onChange={e => setEntityId(e.target.value)}
            />
          </div>
          <button className="btn btn-primary" onClick={fetchTimeline}>
            <Clock size={14} /> Load Timeline
          </button>
        </div>

        {events.length > 0 && (
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>Compare: From Version</div>
              <select className="mc-select" value={fromV} onChange={e => setFromV(e.target.value)}>
                <option value="">—</option>
                {versions.map(v => <option key={v} value={v}>v{v}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>To Version</div>
              <select className="mc-select" value={toV} onChange={e => setToV(e.target.value)}>
                <option value="">—</option>
                {versions.map(v => <option key={v} value={v}>v{v}</option>)}
              </select>
            </div>
            <button className="btn btn-ghost" onClick={fetchDiff} disabled={!fromV || !toV}>
              <GitCompare size={14} /> Compare
            </button>
            <div style={{ flex: 1, minWidth: 180 }}>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>Snapshot at Time</div>
              <input type="datetime-local" className="mc-select" value={snapTs} onChange={e => setSnapTs(e.target.value)} />
            </div>
            <button className="btn btn-ghost" onClick={fetchSnapshot} disabled={!snapTs}>
              ⏱ Time Travel
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      {(events.length > 0 || diff || snapshot) && (
        <div style={{ display: 'flex', gap: 4 }}>
          {(['timeline', 'diff', 'snapshot'] as const).map(t => (
            <button key={t} className={`btn ${tab === t ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab(t)}
              style={{ opacity: (t === 'diff' && !diff) || (t === 'snapshot' && !snapshot) ? 0.4 : 1 }}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {loading && <div className="spinner" />}

      {!loading && tab === 'timeline' && events.length === 0 && (
        <div className="empty-state card"><div className="empty-icon">⏳</div><div className="empty-text">Enter an Entity ID above to load its timeline.</div></div>
      )}

      {!loading && tab === 'timeline' && events.length > 0 && (
        <div className="card">
          <div className="card-title">{events.length} Change Events</div>
          <div className="timeline">
            {[...events].reverse().map((evt, i) => <TimelineEntry key={i} evt={evt} />)}
          </div>
        </div>
      )}

      {!loading && tab === 'diff' && diff && (
        <div className="card">
          <div className="card-title">Schema Diff — v{diff.fromVersion} → v{diff.toVersion}</div>
          <DiffView diff={diff} />
        </div>
      )}

      {!loading && tab === 'snapshot' && snapshot && (
        <div className="card">
          <div className="card-title">Snapshot — {snapshot.name} @ {snapTs}</div>
          <pre style={{ fontSize: 12, color: 'var(--text2)', overflow: 'auto', maxHeight: 500, background: 'var(--bg3)', padding: 16, borderRadius: 'var(--radius)' }}>
            {JSON.stringify(snapshot, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
