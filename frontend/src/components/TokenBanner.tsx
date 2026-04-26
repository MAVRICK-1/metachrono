/**
 * TokenBanner — shown when backend can't reach OpenMetadata.
 * Lets the user paste their sandbox JWT token directly in the UI.
 */
import React, { useState, useEffect } from 'react';
import { AlertTriangle, X, CheckCircle, ExternalLink } from 'lucide-react';
import axios from 'axios';

const BASE_URL = process.env.REACT_APP_API_URL || '/api/v1';

export default function TokenBanner() {
  const [show, setShow] = useState(false);
  const [token, setToken] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'ok' | 'err'>('idle');
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if OM is reachable
    axios.get(`${BASE_URL}/settings/status`).then(r => {
      if (!r.data.connected) setShow(true);
    }).catch(() => setShow(true));
  }, []);

  async function save() {
    if (!token.trim()) return;
    setStatus('saving');
    try {
      const r = await axios.post(`${BASE_URL}/settings/token`, { token: token.trim() });
      setStatus(r.data.status === 'ok' ? 'ok' : 'err');
      if (r.data.status === 'ok') setTimeout(() => { setShow(false); window.location.reload(); }, 1500);
    } catch {
      setStatus('err');
    }
  }

  if (!show || dismissed) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)',
      zIndex: 9000, width: 'min(600px, 95vw)',
      background: 'var(--bg2)', border: '1px solid rgba(251,191,36,0.5)',
      borderRadius: 12, padding: '16px 20px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <AlertTriangle size={18} color="var(--yellow)" style={{ flexShrink: 0, marginTop: 2 }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)', marginBottom: 4 }}>
            OpenMetadata token required
          </div>
          <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 10, lineHeight: 1.6 }}>
            The sandbox uses Google SSO. Log in at{' '}
            <a href="https://sandbox.open-metadata.org" target="_blank" rel="noopener noreferrer"
              style={{ color: 'var(--accent2)' }}>
              sandbox.open-metadata.org <ExternalLink size={10} />
            </a>
            {' '}→ F12 → Application → Local Storage → copy <code style={{ color: 'var(--accent)', background: 'var(--bg3)', padding: '1px 5px', borderRadius: 4 }}>oidcIdToken</code>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              style={{
                flex: 1, background: 'var(--bg3)', border: '1px solid var(--border)',
                borderRadius: 8, color: 'var(--text)', padding: '7px 12px',
                fontSize: 12, outline: 'none', fontFamily: 'monospace',
              }}
              placeholder="Paste eyJ... token here"
              value={token}
              onChange={e => { setToken(e.target.value); setStatus('idle'); }}
              onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
              onBlur={e => (e.target.style.borderColor = 'var(--border)')}
            />
            <button
              className="btn btn-primary"
              onClick={save}
              disabled={!token.trim() || status === 'saving'}
              style={{ fontSize: 12, padding: '7px 14px', whiteSpace: 'nowrap' }}
            >
              {status === 'saving' ? '…' : status === 'ok' ? <><CheckCircle size={13} /> Connected!</> : 'Connect'}
            </button>
          </div>
          {status === 'err' && (
            <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 6 }}>
              ❌ Token didn't work — make sure you copied the full value
            </div>
          )}
        </div>
        <button onClick={() => setDismissed(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 2 }}>
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
