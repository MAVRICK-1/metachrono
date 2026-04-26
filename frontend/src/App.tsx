import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import AssetExplorer from './pages/AssetExplorer';
import TimelinePage from './pages/TimelinePage';
import ImpactPage from './pages/ImpactPage';
import GovernancePage from './pages/GovernancePage';
import AIAssistant from './pages/AIAssistant';
import LineagePage from './pages/LineagePage';
import HowToUsePage from './pages/HowToUsePage';
import GuidedTour, { useTour } from './components/GuidedTour';
import UserMenu from './components/UserMenu';
import FirebaseSetup from './components/FirebaseSetup';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { firebaseConfigured } from './firebase';
import {
  LayoutDashboard, Clock, GitBranch, Zap,
  ShieldCheck, Bot, Database, HelpCircle, Play
} from 'lucide-react';
import './App.css';

const NAV = [
  { to: '/',           icon: LayoutDashboard, label: 'Dashboard'   },
  { to: '/assets',     icon: Database,        label: 'Assets'      },
  { to: '/timeline',   icon: Clock,           label: 'Timeline'    },
  { to: '/lineage',    icon: GitBranch,       label: 'Lineage'     },
  { to: '/impact',     icon: Zap,             label: 'Impact'      },
  { to: '/governance', icon: ShieldCheck,     label: 'Governance'  },
  { to: '/ai',         icon: Bot,             label: 'AI Chat'     },
  { to: '/how-to-use', icon: HelpCircle,      label: 'How to Use'  },
];

function Sidebar({ onStartTour }: { onStartTour: () => void }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <span className="logo-icon">⏳</span>
        <div>
          <div className="logo-text">Meta<strong>Chronos</strong></div>
          <div style={{ fontSize: 9, color: 'var(--text3)', letterSpacing: 1, textTransform: 'uppercase' }}>
            Temporal Intelligence
          </div>
        </div>
      </div>
      <nav className="sidebar-nav">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <Icon size={16} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-footer">
        <button
          className="btn btn-ghost"
          onClick={onStartTour}
          style={{ width: '100%', fontSize: 12, justifyContent: 'center', marginBottom: 10 }}
        >
          <Play size={12} /> Take the Tour
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <img
            src="https://open-metadata.org/favicon.ico"
            alt="OM"
            style={{ width: 14, height: 14, borderRadius: 2, opacity: 0.7 }}
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <span className="badge-om">Powered by OpenMetadata</span>
        </div>
      </div>
    </aside>
  );
}

function Layout({ children, onStartTour }: { children: React.ReactNode; onStartTour: () => void }) {
  const location = useLocation();
  const current = NAV.find(n => n.to === location.pathname)?.label ?? 'MetaChronos';
  return (
    <div className="app-shell">
      <Sidebar onStartTour={onStartTour} />
      <main className="main-content">
        <header className="topbar">
          <h1 className="page-title">{current}</h1>
          <div className="topbar-right">
            <span className="status-dot" title="Connected to OpenMetadata" />
            <span className="status-label">OpenMetadata</span>
            <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 8px' }} />
            <UserMenu />
          </div>
        </header>
        <div className="page-body animate-slide-up">{children}</div>
      </main>
    </div>
  );
}

function AppInner() {
  const { show, startTour, endTour } = useTour();
  const { profile } = useAuth();
  const [fbSetup, setFbSetup] = useState(
    !firebaseConfigured && !localStorage.getItem('mc_fb_skipped')
  );

  if (fbSetup) {
    return <FirebaseSetup onSkip={() => { localStorage.setItem('mc_fb_skipped', '1'); setFbSetup(false); }} />;
  }

  return (
    <>
      <Layout onStartTour={startTour}>
        <Routes>
          <Route path="/"            element={<Dashboard />} />
          <Route path="/assets"      element={<AssetExplorer />} />
          <Route path="/timeline"    element={<TimelinePage />} />
          <Route path="/lineage"     element={<LineagePage />} />
          <Route path="/impact"      element={<ImpactPage />} />
          <Route path="/governance"  element={<GovernancePage />} />
          <Route path="/ai"          element={<AIAssistant />} />
          <Route path="/how-to-use"  element={<HowToUsePage />} />
        </Routes>
      </Layout>
      {show && <GuidedTour onDone={endTour} />}
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppInner />
      </AuthProvider>
    </BrowserRouter>
  );
}
