import React, { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { getComplianceSummary, listAssets, getTimeline } from '../services/api';
import { Activity, Database, ShieldCheck, Zap, TrendingUp, AlertTriangle } from 'lucide-react';

const COLORS = ['#7c5cfc', '#38bdf8', '#34d399', '#fbbf24'];

export default function Dashboard() {
  const [compliance, setCompliance] = useState<any>(null);
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getComplianceSummary('tables', 50).catch(() => null),
      listAssets('tables', 20).catch(() => ({ assets: [], paging: {} })),
    ]).then(([comp, assetData]) => {
      setCompliance(comp);
      setAssets(assetData.assets || []);
      setLoading(false);
    });
  }, []);

  const pieData = compliance ? [
    { name: 'Has Owner',       value: compliance.breakdown?.hasOwner?.count || 0 },
    { name: 'Has Description', value: compliance.breakdown?.hasDescription?.count || 0 },
    { name: 'Has Tags',        value: compliance.breakdown?.hasTags?.count || 0 },
    { name: 'Has Domain',      value: compliance.breakdown?.hasDomain?.count || 0 },
  ] : [];

  const score = compliance?.complianceScore ?? 0;
  const scoreColor = score >= 75 ? 'var(--green)' : score >= 50 ? 'var(--yellow)' : 'var(--red)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Hero */}
      <div className="card" style={{ background: 'linear-gradient(135deg, #1a1535 0%, #110e22 100%)', borderColor: 'rgba(124,92,252,0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 48 }}>⏳</span>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
              Welcome to MetaChronos
            </h2>
            <p style={{ color: 'var(--text2)', fontSize: 14 }}>
              Time-travel through your data's metadata history. Understand what changed, when, why, and what broke —
              all powered by <strong style={{ color: 'var(--accent2)' }}>OpenMetadata</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="stat-grid">
        <div className="stat-tile">
          <div style={{ color: 'var(--accent2)' }}><Database size={20} /></div>
          <div className="stat-value">{loading ? '—' : assets.length}</div>
          <div className="stat-label">Total Assets</div>
          <div className="stat-sub">Tables tracked</div>
        </div>
        <div className="stat-tile">
          <div style={{ color: scoreColor }}><ShieldCheck size={20} /></div>
          <div className="stat-value" style={{ color: scoreColor }}>{loading ? '—' : `${score}%`}</div>
          <div className="stat-label">Governance Score</div>
          <div className="stat-sub">{score >= 75 ? 'Healthy' : score >= 50 ? 'Needs work' : 'Critical'}</div>
        </div>
        <div className="stat-tile">
          <div style={{ color: 'var(--accent)' }}><Activity size={20} /></div>
          <div className="stat-value">{loading ? '—' : assets.filter(a => (a.totalVersions || 0) > 1).length}</div>
          <div className="stat-label">Active Assets</div>
          <div className="stat-sub">With version history</div>
        </div>
        <div className="stat-tile">
          <div style={{ color: 'var(--red)' }}><AlertTriangle size={20} /></div>
          <div className="stat-value" style={{ color: 'var(--red)' }}>
            {loading ? '—' : (compliance?.ungoverned?.length ?? 0)}
          </div>
          <div className="stat-label">Ungoverned</div>
          <div className="stat-sub">Missing owner/desc/tags</div>
        </div>
      </div>

      {/* Compliance + Asset table */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 20 }}>
        <div className="card">
          <div className="card-title">Governance Breakdown</div>
          {loading ? <div className="spinner" /> : (
            <>
              <div style={{ textAlign: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 40, fontWeight: 700, color: scoreColor }}>{score}%</span>
                <div style={{ fontSize: 12, color: 'var(--text3)' }}>Compliance Score</div>
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} label={({ name, value }) => `${name}: ${value}`} labelLine={false} fontSize={10}>
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              {Object.entries(compliance?.breakdown || {}).map(([k, v]: any) => (
                <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{ fontSize: 12, color: 'var(--text2)', width: 120 }}>
                    {k.replace(/([A-Z])/g, ' $1').replace('has ', 'Has ')}
                  </div>
                  <div className="progress-bar-wrap" style={{ flex: 1 }}>
                    <div className="progress-bar-fill" style={{ width: `${v.pct}%`, background: 'var(--accent)' }} />
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', width: 36, textAlign: 'right' }}>{v.pct}%</div>
                </div>
              ))}
            </>
          )}
        </div>

        <div className="card">
          <div className="card-title">Recent Assets</div>
          {loading ? <div className="spinner" /> : (
            <table className="mc-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Versions</th>
                  <th>Owners</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {assets.slice(0, 8).map(a => (
                  <tr key={a.id}>
                    <td>
                      <div style={{ fontWeight: 500, color: 'var(--text)', fontSize: 13 }}>{a.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>{a.fullyQualifiedName?.split('.').slice(0, 3).join('.')}</div>
                    </td>
                    <td><span className="badge badge-purple">v{a.currentVersion ?? '—'}</span></td>
                    <td style={{ fontSize: 12, color: 'var(--text2)' }}>{a.owners?.length ? a.owners[0] : <span style={{ color: 'var(--red)', fontSize: 11 }}>⚠ None</span>}</td>
                    <td>
                      {a.tags?.length
                        ? <span className="badge badge-green">Tagged</span>
                        : <span className="badge badge-yellow">Untagged</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Quick features */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {[
          { icon: '⏱', title: 'Time Travel', desc: 'Rewind any asset to its exact state at any past timestamp. See who changed what and when.', color: 'var(--accent)' },
          { icon: '💥', title: 'Blast Radius', desc: 'Before breaking a schema, calculate which downstream dashboards, pipelines and reports will break.', color: 'var(--red)' },
          { icon: '🤖', title: 'AI Root Cause', desc: 'Ask in plain English why a pipeline broke. The AI grounds its answer in real change events.', color: 'var(--accent2)' },
        ].map(f => (
          <div key={f.title} className="card" style={{ borderColor: `${f.color}30` }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>{f.icon}</div>
            <div style={{ fontWeight: 600, color: f.color, marginBottom: 6 }}>{f.title}</div>
            <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>{f.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
