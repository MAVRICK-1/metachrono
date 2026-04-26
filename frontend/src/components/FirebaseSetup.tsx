/**
 * FirebaseSetup — shown when REACT_APP_FIREBASE_* env vars are not set.
 * Users paste their Firebase config here; it's saved to localStorage
 * and reloads the page so the app picks it up via env-like injection.
 *
 * In production, just set the env vars in your CI/CD (GitHub Secrets).
 */
import React, { useState } from 'react';
import { Flame, ExternalLink, Copy, CheckCircle } from 'lucide-react';

const FIELDS = [
  { key: 'REACT_APP_FIREBASE_API_KEY',            label: 'apiKey',            placeholder: 'AIzaSy...' },
  { key: 'REACT_APP_FIREBASE_AUTH_DOMAIN',        label: 'authDomain',        placeholder: 'your-app.firebaseapp.com' },
  { key: 'REACT_APP_FIREBASE_PROJECT_ID',         label: 'projectId',         placeholder: 'your-project-id' },
  { key: 'REACT_APP_FIREBASE_STORAGE_BUCKET',     label: 'storageBucket',     placeholder: 'your-app.appspot.com' },
  { key: 'REACT_APP_FIREBASE_MESSAGING_SENDER_ID',label: 'messagingSenderId', placeholder: '123456789' },
  { key: 'REACT_APP_FIREBASE_APP_ID',             label: 'appId',             placeholder: '1:123:web:abc' },
];

const CLI_CMD = `firebase apps:sdkconfig WEB --project YOUR_PROJECT_ID`;

export default function FirebaseSetup({ onSkip }: { onSkip: () => void }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  function copy() {
    navigator.clipboard.writeText(CLI_CMD);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function save() {
    FIELDS.forEach(f => {
      if (values[f.key]) localStorage.setItem(f.key, values[f.key]);
    });
    setSaved(true);
    setTimeout(() => window.location.reload(), 1200);
  }

  const allFilled = FIELDS.slice(0, 3).every(f => values[f.key]?.trim());

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{ width: '100%', maxWidth: 520 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔥</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 8 }}>
            Connect Firebase
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7 }}>
            MetaChronos uses Firebase for Google Sign-In and Firestore to save your bookmarks,
            chat history, and tour progress. It's <strong style={{ color: 'var(--green)' }}>free</strong>.
          </p>
        </div>

        {/* How to get config */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-title">Get your Firebase config (30 sec)</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, color: 'var(--text2)' }}>
            {[
              { n: 1, text: 'Go to console.firebase.google.com → Create project' },
              { n: 2, text: 'Enable Authentication → Google provider' },
              { n: 3, text: 'Enable Firestore → Start in test mode' },
              { n: 4, text: 'Run this CLI command to get your config:' },
            ].map(s => (
              <div key={s.n} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div style={{
                  width: 22, height: 22, borderRadius: '50%', flexShrink: 0, marginTop: 1,
                  background: 'rgba(251,146,60,0.15)', border: '1px solid rgba(251,146,60,0.4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700, color: '#fb923c',
                }}>{s.n}</div>
                <span>{s.text}</span>
              </div>
            ))}
          </div>
          <div style={{ position: 'relative', marginTop: 10 }}>
            <code style={{
              display: 'block', background: 'var(--bg)', border: '1px solid var(--border)',
              borderRadius: 8, padding: '10px 40px 10px 14px',
              fontSize: 12, color: 'var(--accent2)', fontFamily: 'monospace',
            }}>{CLI_CMD}</code>
            <button onClick={copy} style={{ position: 'absolute', right: 8, top: 8, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)' }}>
              {copied ? <CheckCircle size={14} color="var(--green)" /> : <Copy size={14} />}
            </button>
          </div>
          <a href="https://console.firebase.google.com" target="_blank" rel="noopener noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 12, fontSize: 12, color: 'var(--accent)', textDecoration: 'none' }}>
            <Flame size={12} /> Open Firebase Console <ExternalLink size={11} />
          </a>
        </div>

        {/* Config form */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-title">Paste your config values</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {FIELDS.map(f => (
              <div key={f.key}>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 3, fontFamily: 'monospace' }}>
                  {f.label}{f.key === FIELDS[0].key || f.key === FIELDS[1].key || f.key === FIELDS[2].key ? ' *' : ''}
                </div>
                <input
                  style={{
                    width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)',
                    borderRadius: 8, color: 'var(--text)', padding: '8px 12px',
                    fontSize: 12, outline: 'none', fontFamily: 'monospace',
                    boxSizing: 'border-box',
                  }}
                  placeholder={f.placeholder}
                  value={values[f.key] || ''}
                  onChange={e => setValues(v => ({ ...v, [f.key]: e.target.value }))}
                  onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                />
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost" onClick={onSkip} style={{ flex: 1 }}>
            Skip for now
          </button>
          <button
            className="btn btn-primary"
            onClick={save}
            disabled={!allFilled}
            style={{ flex: 2, opacity: allFilled ? 1 : 0.5 }}
          >
            {saved ? '✅ Saved! Reloading…' : '🔥 Connect Firebase'}
          </button>
        </div>
        <p style={{ fontSize: 11, color: 'var(--text3)', textAlign: 'center', marginTop: 10 }}>
          * Required. Config is stored in your browser only.
        </p>
      </div>
    </div>
  );
}
