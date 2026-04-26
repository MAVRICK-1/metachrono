import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { listAssets, searchAssets } from '../services/api';
import type { AssetSummary } from '../types';

export default function AssetExplorer() {
  const [assets, setAssets] = useState<AssetSummary[]>([]);
  const [query, setQuery] = useState('');
  const [entityType, setEntityType] = useState('tables');
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, [entityType]);

  async function load() {
    setLoading(true);
    try {
      const data = await listAssets(entityType, 50);
      setAssets(data.assets || []);
    } catch { setAssets([]); }
    setLoading(false);
  }

  const filtered = assets.filter(a =>
    !query || a.name.toLowerCase().includes(query.toLowerCase()) ||
    a.fullyQualifiedName.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <div className="search-wrap" style={{ flex: 1 }}>
          <Search size={16} className="search-icon" />
          <input placeholder="Search assets…" value={query} onChange={e => setQuery(e.target.value)} />
        </div>
        <select className="mc-select" value={entityType} onChange={e => setEntityType(e.target.value)}>
          <option value="tables">Tables</option>
          <option value="dashboards">Dashboards</option>
          <option value="topics">Topics</option>
          <option value="pipelines">Pipelines</option>
          <option value="mlmodels">ML Models</option>
        </select>
      </div>

      <div className="card">
        <div className="card-title">{filtered.length} {entityType}</div>
        {loading ? <div className="spinner" /> : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🔍</div>
            <div className="empty-text">No assets found. Make sure OpenMetadata is running and has ingested metadata.</div>
          </div>
        ) : (
          <table className="mc-table">
            <thead>
              <tr>
                <th>Asset</th>
                <th>Version</th>
                <th>Versions</th>
                <th>Owners</th>
                <th>Tags</th>
                <th>Domain</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(a => (
                <tr key={a.id}>
                  <td>
                    <div style={{ fontWeight: 500, color: 'var(--text)' }}>{a.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'JetBrains Mono, monospace' }}>
                      {a.fullyQualifiedName}
                    </div>
                    {a.description && (
                      <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {a.description}
                      </div>
                    )}
                  </td>
                  <td><span className="badge badge-purple">v{a.currentVersion ?? '—'}</span></td>
                  <td><span style={{ color: 'var(--text2)', fontSize: 13 }}>{a.totalVersions}</span></td>
                  <td>
                    {a.owners.length
                      ? <span className="badge badge-blue">{a.owners[0]}</span>
                      : <span style={{ color: 'var(--red)', fontSize: 11 }}>⚠ No owner</span>}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {a.tags.slice(0, 2).map(t => (
                        <span key={t} className="badge badge-green" style={{ fontSize: 10 }}>{t.split('.').pop()}</span>
                      ))}
                      {!a.tags.length && <span style={{ color: 'var(--text3)', fontSize: 11 }}>—</span>}
                    </div>
                  </td>
                  <td><span style={{ fontSize: 12, color: 'var(--text2)' }}>{a.domain || '—'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
