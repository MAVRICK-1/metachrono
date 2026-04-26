import React, { useState, useEffect } from 'react';
import {
  CheckCircle, XCircle, RefreshCw, ExternalLink,
  Copy, Eye, EyeOff, Wifi, WifiOff, Settings, ChevronRight
} from 'lucide-react';
import axios from 'axios';

const BASE_URL = process.env.REACT_APP_API_URL || '/api/v1';

function CopyBtn({ text }: { text: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 2000); }}
      style={{ background: 'none', border: 'none', cursor: 'pointer', color: ok ? 'var(--green)' : 'var(--text3)', padding: '2px 4px' }}>
      {ok ? <CheckCircle size={13} /> : <Copy size={13} />}
    </button>
  );
}

function CodeBox({ value }: { value: string }) {
  return (
    <div style={{ position: 'relative', marginTop: 6 }}>
      <code style={{
        display: 'block', background: 'var(--bg)', border: '1px solid var(--border)',
        borderRadius: 8, padding: '10px 36px 10px 14px',
        fontSize: 12, color: 'var(--accent2)', fontFamily: 'monospace', wordBreak: 'break-all',
      }}>{value}</code>
      <div style={{ position: 'absolute', right: 6, top: 6 }}><CopyBtn text={value} /></div>
    </div>
  );
}

const GUIDE_STEPS = [
  {
    n: 1,
    title: 'Open the OpenMetadata Sandbox',
    desc: 'Go to the sandbox and sign in with your Google account.',
    link: { label: 'Open sandbox →', url: 'https://sandbox.open-metadata.org' },
    img: null,
  },
  {
    n: 2,
    title: 'Open Browser DevTools',
    desc: 'Press F12 (or Cmd+Option+I on Mac) to open DevTools.',
    extra: 'Make sure you are on the sandbox tab when you open DevTools.',
  },
  {
    n: 3,
    title: 'Go to Application → Local Storage',
    desc: 'In DevTools: click the "Application" tab → expand "Local Storage" in the left panel → click "https://sandbox.open-metadata.org"',
    extra: 'On Firefox: use the "Storage" tab instead of "Application".',
  },
  {
    n: 4,
    title: 'Find the token',
    desc: 'In the key-value list, look for the key:',
    code: 'oidcIdToken',
    extra: 'The value starts with "eyJ..." — that\'s your JWT token. Click the value row to see the full token.',
  },
  {
    n: 5,
    title: 'Copy the full token value',
    desc: 'Click on the value field, press Ctrl+A to select all, then Ctrl+C to copy.',
    extra: '⚠️ The token is very long (1000+ characters). Make sure you copy the entire value.',
  },
  {
    n: 6,
    title: 'Paste it below and connect',
    desc: 'Paste the token in the "OpenMetadata Token" field below and click "Test & Save".',
    extra: '✅ The token typically lasts 24 hours. You can come back here to refresh it.',
  },
];

export default function SettingsPage() {
  const [token, setToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [status, setStatus] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle');
  const [connInfo, setConnInfo] = useState<any>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkConnection();
  }, []);

  async function checkConnection() {
    setChecking(true);
    try {
      const r = await axios.get(`${BASE_URL}/settings/status`);
      setConnInfo(r.data);
    } catch {
      setConnInfo({ connected: false });
    }
    setChecking(false);
  }

  async function testAndSave() {
    if (!token.trim()) return;
    setStatus('testing');
    try {
      const r = await axios.post(`${BASE_URL}/settings/token`, { token: token.trim() });
      if (r.data.status === 'ok') {
        setStatus('ok');
        setTimeout(checkConnection, 500);
      } else {
        setStatus('fail');
      }
    } catch {
      setStatus('fail');
    }
  }

  const connected = connInfo?.connected;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 860 }}>

      {/* Connection status banner */}
      <div className="card" style={{
        borderColor: connected ? 'rgba(52,211,153,0.4)' : 'rgba(248,113,113,0.4)',
        background: connected ? 'rgba(52,211,153,0.04)' : 'rgba(248,113,113,0.04)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {checking
            ? <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite' }} color="var(--text3)" />
            : connected
              ? <Wifi size={20} color="var(--green)" />
              : <WifiOff size={20} color="var(--red)" />}
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, color: connected ? 'var(--green)' : 'var(--red)' }}>
              {checking ? 'Checking connection…' : connected ? '✅ Connected to OpenMetadata' : '❌ Not connected to OpenMetadata'}
            </div>
            {connInfo?.version && (
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                Version: {connInfo.version?.version ?? '—'} · Sandbox: sandbox.open-metadata.org
              </div>
            )}
            {!connected && !checking && (
              <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>
                Follow the guide below to get your token and connect.
              </div>
            )}
          </div>
        </div>
        <button className="btn btn-ghost" onClick={checkConnection} style={{ fontSize: 12, padding: '6px 12px', flexShrink: 0 }}>
          <RefreshCw size={12} /> Recheck
        </button>
      </div>

      {/* Token input */}
      <div className="card">
        <div className="card-title">🔑 OpenMetadata Token</div>
        <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 14, lineHeight: 1.6 }}>
          The OpenMetadata sandbox uses Google SSO — so there's no username/password. Instead,
          you get a JWT token from your browser after signing in. Follow the guide below to get it.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 2 }}>Paste your token (starts with eyJ…)</div>
          <div style={{ position: 'relative' }}>
            <input
              type={showToken ? 'text' : 'password'}
              style={{
                width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)',
                borderRadius: 8, color: 'var(--text)', padding: '10px 80px 10px 14px',
                fontSize: 13, outline: 'none', fontFamily: 'monospace', boxSizing: 'border-box',
              }}
              placeholder="eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
              value={token}
              onChange={e => { setToken(e.target.value); setStatus('idle'); }}
              onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
              onBlur={e => (e.target.style.borderColor = 'var(--border)')}
            />
            <button
              onClick={() => setShowToken(v => !v)}
              style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)' }}
            >
              {showToken ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button
              className="btn btn-primary"
              onClick={testAndSave}
              disabled={!token.trim() || status === 'testing'}
              style={{ fontSize: 13 }}
            >
              {status === 'testing' ? <><RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> Testing…</> :
               status === 'ok'      ? <><CheckCircle size={13} /> Connected!</> :
               status === 'fail'    ? <><XCircle size={13} /> Failed — retry</> :
                                      '⚡ Test & Save'}
            </button>
            {status === 'fail' && (
              <span style={{ fontSize: 12, color: 'var(--red)' }}>Token invalid or expired. Get a fresh one from the sandbox.</span>
            )}
            {status === 'ok' && (
              <span style={{ fontSize: 12, color: 'var(--green)' }}>Token saved! Dashboard will now show real data.</span>
            )}
          </div>
        </div>
      </div>

      {/* Step-by-step guide */}
      <div className="card">
        <div className="card-title">📖 How to get your OpenMetadata token — Step by step</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 4 }}>
          {GUIDE_STEPS.map((s, i) => (
            <div key={s.n} style={{
              display: 'grid', gridTemplateColumns: '32px 1fr', gap: '0 14px',
              paddingBottom: i < GUIDE_STEPS.length - 1 ? 16 : 0,
              borderBottom: i < GUIDE_STEPS.length - 1 ? '1px solid var(--border)' : 'none',
            }}>
              {/* Step number */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                  background: s.n === 6 ? 'rgba(124,92,252,0.2)' : 'rgba(56,189,248,0.15)',
                  border: `1px solid ${s.n === 6 ? 'rgba(124,92,252,0.5)' : 'rgba(56,189,248,0.4)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 700, color: s.n === 6 ? 'var(--accent)' : 'var(--accent2)',
                }}>
                  {s.n === 6 ? '✓' : s.n}
                </div>
                {i < GUIDE_STEPS.length - 1 && (
                  <div style={{ width: 2, flex: 1, background: 'var(--border)', margin: '6px 0' }} />
                )}
              </div>
              {/* Content */}
              <div style={{ paddingTop: 4 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)', marginBottom: 4 }}>{s.title}</div>
                <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7 }}>{s.desc}</div>
                {s.code && <CodeBox value={s.code} />}
                {s.extra && (
                  <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 6, padding: '6px 10px', background: 'var(--bg3)', borderRadius: 6 }}>
                    💡 {s.extra}
                  </div>
                )}
                {s.link && (
                  <a href={s.link.url} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 8, fontSize: 13, color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}>
                    {s.link.label} <ExternalLink size={12} />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick reference */}
      <div className="card">
        <div className="card-title">⚡ Quick Reference — Known Sandbox Assets</div>
        <p style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 12 }}>
          Use these entity IDs directly in Timeline, Impact and Lineage pages while you set up the token:
        </p>
        <table className="mc-table">
          <thead><tr><th>Entity</th><th>Type</th><th>Service</th><th>ID</th></tr></thead>
          <tbody>
            {[
              { name: 'dim_customers', type: 'tables', service: 'Snowflake', id: 'bf257ff3-f238-4a10-a2f7-a244b54de43e' },
            ].map(e => (
              <tr key={e.id}>
                <td style={{ fontWeight: 500, color: 'var(--text)' }}>{e.name}</td>
                <td><span className="badge badge-blue">{e.type}</span></td>
                <td><span className="badge badge-purple">{e.service}</span></td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <code style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'monospace' }}>{e.id.slice(0, 18)}…</code>
                    <CopyBtn text={e.id} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}
