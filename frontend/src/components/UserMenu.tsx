import React, { useState } from 'react';
import { LogOut, Bookmark, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

function GoogleLogo() {
  return (
    <img
      src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
      alt="Google"
      width={18}
      height={18}
      style={{ flexShrink: 0 }}
    />
  );
}

export default function UserMenu() {
  const { user, profile, configured, signInWithGoogle, signOut } = useAuth();
  const [open, setOpen] = useState(false);

  if (!configured) return null;

  if (!user) {
    return (
      <button
        onClick={signInWithGoogle}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: '#fff', border: '1px solid #dadce0',
          borderRadius: 20, padding: '5px 14px 5px 10px',
          cursor: 'pointer', fontSize: 13, fontWeight: 500,
          color: '#3c4043', fontFamily: 'inherit',
          boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
          transition: 'box-shadow 0.2s',
        }}
        onMouseOver={e => (e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)')}
        onMouseOut={e => (e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.12)')}
      >
        <GoogleLogo />
        Sign in with Google
      </button>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'var(--bg3)', border: '1px solid var(--border)',
          borderRadius: 20, padding: '4px 12px 4px 4px',
          cursor: 'pointer', color: 'var(--text)',
        }}
      >
        {user.photoURL
          ? <img src={user.photoURL} alt="" style={{ width: 26, height: 26, borderRadius: '50%' }} referrerPolicy="no-referrer" />
          : <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <User size={14} color="#fff" />
            </div>}
        <span style={{ fontSize: 12, fontWeight: 500 }}>{user.displayName?.split(' ')[0]}</span>
      </button>

      {open && (
        <>
          {/* backdrop */}
          <div style={{ position: 'fixed', inset: 0, zIndex: 998 }} onClick={() => setOpen(false)} />
          <div style={{
            position: 'absolute', right: 0, top: 40, width: 210,
            background: 'var(--bg2)', border: '1px solid var(--border)',
            borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            zIndex: 999, overflow: 'hidden',
          }}>
            <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 10, alignItems: 'center' }}>
              {user.photoURL && <img src={user.photoURL} alt="" style={{ width: 32, height: 32, borderRadius: '50%' }} referrerPolicy="no-referrer" />}
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{user.displayName}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>{user.email}</div>
              </div>
            </div>
            <div style={{ padding: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', fontSize: 12, color: 'var(--text2)' }}>
                <Bookmark size={13} />
                <span>{profile?.bookmarks.length ?? 0} bookmarks saved</span>
              </div>
              <button
                onClick={() => { signOut(); setOpen(false); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                  padding: '8px 10px', fontSize: 13, background: 'none',
                  border: 'none', cursor: 'pointer', color: 'var(--red)', borderRadius: 6,
                }}
              >
                <LogOut size={13} /> Sign out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

