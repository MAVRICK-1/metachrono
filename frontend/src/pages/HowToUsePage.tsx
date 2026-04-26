import React, { useState } from 'react';
import { Clock, Database, GitBranch, Zap, ShieldCheck, Bot, Search, Copy, CheckCircle } from 'lucide-react';

const SANDBOX_URL = 'https://sandbox.open-metadata.org';
const API_URL = 'https://metachrono.onrender.com';

function CopyBox({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div style={{ position: 'relative', marginTop: 8 }}>
      <code style={{
        display: 'block', background: 'var(--bg)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius)', padding: '10px 40px 10px 14px',
        fontSize: 12, color: 'var(--accent2)', fontFamily: 'monospace', wordBreak: 'break-all',
      }}>{value}</code>
      <button
        onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
        style={{ position: 'absolute', right: 8, top: 8, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)' }}
      >
        {copied ? <CheckCircle size={14} color="var(--green)" /> : <Copy size={14} />}
      </button>
    </div>
  );
}

const STEPS = [
  {
    icon: <Database size={22} />,
    color: 'var(--accent2)',
    title: '1. Browse Assets',
    page: '/assets',
    desc: 'Start in the Assets tab. Search tables, dashboards, pipelines, and topics from OpenMetadata sandbox. Click any asset to see its full profile.',
    tip: 'Try searching "dim_" or "fact_" to find common data warehouse tables.',
    action: 'Copy a table name or UUID from the Asset Explorer to use in other features.',
  },
  {
    icon: <Clock size={22} />,
    color: 'var(--accent)',
    title: '2. Time-Travel the Timeline',
    page: '/timeline',
    desc: 'Paste an entity UUID into the Timeline tab to see its full change history — every schema edit, ownership change, and tag update across versions.',
    tip: 'Use the version selector to compare any two versions with a side-by-side schema diff.',
    action: 'Pick any two versions and click "Compare" to see added/removed/modified columns.',
  },
  {
    icon: <GitBranch size={22} />,
    color: '#a78bfa',
    title: '3. Explore Lineage',
    page: '/lineage',
    desc: 'Enter an entity UUID in the Lineage tab. The interactive graph shows every upstream source and downstream consumer — drag nodes to explore.',
    tip: 'Zoom out with the scroll wheel or use the mini-map in the bottom-right corner.',
    action: 'Click any node in the graph to highlight its direct connections.',
  },
  {
    icon: <Zap size={22} />,
    color: 'var(--red)',
    title: '4. Calculate Blast Radius',
    page: '/impact',
    desc: 'Before breaking a schema, paste the table UUID into the Impact tab and click "Analyze Impact". MetaChronos scores every downstream asset by risk.',
    tip: 'Red = Critical (score ≥ 60), Yellow = Warning (30–60), Green = Low risk.',
    action: 'Use this before any breaking schema change to know who to notify first.',
  },
  {
    icon: <ShieldCheck size={22} />,
    color: 'var(--green)',
    title: '5. Audit Governance',
    page: '/governance',
    desc: 'The Governance tab shows the compliance scorecard across all tables — who has owners, descriptions, tags, and domains — and the full audit trail per entity.',
    tip: 'Assets with no owner or no tags are flagged in the Ungoverned list.',
    action: 'Click any asset row to see its governance history (tagging, ownership transfers).',
  },
  {
    icon: <Bot size={22} />,
    color: '#f472b6',
    title: '6. Ask the AI Assistant',
    page: '/ai',
    desc: 'Type any natural-language question about your data assets. The AI is grounded in real OpenMetadata change events, not hallucinated.',
    tip: 'Best results: paste an entity ID alongside your question for specific root-cause analysis.',
    action: 'Try: "Why did orders_fact break last week?" or "Who changed the schema of user_events?"',
  },
];

const QUICK_LINKS = [
  { label: 'OpenMetadata Sandbox', url: SANDBOX_URL, desc: 'Browse data assets directly' },
  { label: 'MetaChronos API Docs', url: `${API_URL}/docs`, desc: 'FastAPI Swagger UI' },
  { label: 'Backend Health', url: `${API_URL}/health`, desc: 'Check connection status' },
  { label: 'GitHub Source', url: 'https://github.com/MAVRICK-1/metachrono', desc: 'Full source code' },
];

export default function HowToUsePage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 900 }}>
      {/* Hero */}
      <div className="card" style={{ background: 'linear-gradient(135deg, #1a1535 0%, #0f0c1f 100%)', borderColor: 'rgba(124,92,252,0.4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <span style={{ fontSize: 56 }}>⏳</span>
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', marginBottom: 6, letterSpacing: -0.5 }}>
              How to Use MetaChronos
            </h2>
            <p style={{ color: 'var(--text2)', fontSize: 14, lineHeight: 1.7, maxWidth: 600 }}>
              MetaChronos is a <strong style={{ color: 'var(--accent)' }}>temporal intelligence platform</strong> built on{' '}
              <strong style={{ color: 'var(--accent2)' }}>OpenMetadata</strong>. It lets you time-travel through your data's
              metadata history, calculate blast radius before breaking changes, and get AI-powered root-cause analysis.
            </p>
          </div>
        </div>
      </div>

      {/* Quick start: get an entity ID */}
      <div className="card">
        <div className="card-title">🚀 Quick Start — Get an Entity ID</div>
        <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 14, lineHeight: 1.7 }}>
          Most features require an <strong style={{ color: 'var(--accent2)' }}>entity UUID</strong> from OpenMetadata.
          Here's how to get one in 30 seconds:
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { step: '1', text: 'Go to the Assets tab → search for any table' },
            { step: '2', text: 'Click the table row to open its details' },
            { step: '3', text: 'Copy the UUID from the "ID" field' },
            { step: '4', text: 'Paste it into Timeline, Impact, or Lineage' },
          ].map(s => (
            <div key={s.step} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 26, height: 26, borderRadius: '50%', background: 'rgba(124,92,252,0.2)',
                border: '1px solid rgba(124,92,252,0.5)', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'var(--accent)', flexShrink: 0,
              }}>{s.step}</div>
              <span style={{ fontSize: 13, color: 'var(--text)' }}>{s.text}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>Or try this via API:</div>
          <CopyBox value={`curl ${API_URL}/api/v1/assets/list?entity_type=tables&limit=5`} />
        </div>
      </div>

      {/* Feature steps */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {STEPS.map((s) => (
          <div key={s.title} className="card" style={{ borderLeft: `3px solid ${s.color}` }}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                background: `${s.color}18`, border: `1px solid ${s.color}40`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color,
              }}>{s.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>{s.title}</span>
                  <a href={s.page} style={{ fontSize: 11, color: s.color, background: `${s.color}15`, padding: '2px 8px', borderRadius: 20, textDecoration: 'none' }}>
                    Open →
                  </a>
                </div>
                <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7, marginBottom: 8 }}>{s.desc}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ fontSize: 12, color: 'var(--yellow)', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 6, padding: '6px 10px' }}>
                    💡 <strong>Tip:</strong> {s.tip}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text3)', padding: '4px 0' }}>
                    ✅ {s.action}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick links */}
      <div className="card">
        <div className="card-title">🔗 Quick Links</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
          {QUICK_LINKS.map(l => (
            <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
              <div style={{
                background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
                padding: '14px 16px', transition: 'border-color 0.2s',
              }}
                onMouseOver={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                onMouseOut={e => (e.currentTarget.style.borderColor = 'var(--border)')}
              >
                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--accent)', marginBottom: 4 }}>{l.label} ↗</div>
                <div style={{ fontSize: 12, color: 'var(--text3)' }}>{l.desc}</div>
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* Tech stack */}
      <div className="card">
        <div className="card-title">🏗 Tech Stack</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
          {[
            { name: 'OpenMetadata', role: 'Metadata platform', color: '#7c5cfc' },
            { name: 'FastAPI', role: 'Backend API', color: '#38bdf8' },
            { name: 'React + TypeScript', role: 'Frontend UI', color: '#61dafb' },
            { name: 'Google Gemini', role: 'AI assistant (free)', color: '#f472b6' },
            { name: 'ReactFlow', role: 'Lineage graph', color: '#34d399' },
            { name: 'Recharts', role: 'Charts & metrics', color: '#fbbf24' },
            { name: 'GitHub Pages', role: 'Frontend hosting', color: '#a78bfa' },
            { name: 'Render.com', role: 'Backend hosting', color: '#4ade80' },
          ].map(t => (
            <div key={t.name} style={{ padding: '12px', background: 'var(--bg3)', borderRadius: 8, border: `1px solid ${t.color}30` }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: t.color }}>{t.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{t.role}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
