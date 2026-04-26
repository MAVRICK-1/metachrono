import React from 'react';
import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import AssetExplorer from './pages/AssetExplorer';
import TimelinePage from './pages/TimelinePage';
import ImpactPage from './pages/ImpactPage';
import GovernancePage from './pages/GovernancePage';
import AIAssistant from './pages/AIAssistant';
import LineagePage from './pages/LineagePage';
import {
  LayoutDashboard, Clock, GitBranch, Zap,
  ShieldCheck, Bot, Database
} from 'lucide-react';
import './App.css';

const NAV = [
  { to: '/',          icon: LayoutDashboard, label: 'Dashboard'  },
  { to: '/assets',    icon: Database,        label: 'Assets'     },
  { to: '/timeline',  icon: Clock,           label: 'Timeline'   },
  { to: '/lineage',   icon: GitBranch,       label: 'Lineage'    },
  { to: '/impact',    icon: Zap,             label: 'Impact'     },
  { to: '/governance',icon: ShieldCheck,     label: 'Governance' },
  { to: '/ai',        icon: Bot,             label: 'AI Chat'    },
];

function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <span className="logo-icon">⏳</span>
        <span className="logo-text">Meta<strong>Chronos</strong></span>
      </div>
      <nav className="sidebar-nav">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-footer">
        <span className="badge-om">Powered by OpenMetadata</span>
      </div>
    </aside>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const current = NAV.find(n => n.to === location.pathname)?.label ?? 'MetaChronos';
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <header className="topbar">
          <h1 className="page-title">{current}</h1>
          <div className="topbar-right">
            <span className="status-dot" title="Connected to OpenMetadata" />
            <span className="status-label">OpenMetadata</span>
          </div>
        </header>
        <div className="page-body animate-slide-up">{children}</div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/"           element={<Dashboard />} />
          <Route path="/assets"     element={<AssetExplorer />} />
          <Route path="/timeline"   element={<TimelinePage />} />
          <Route path="/lineage"    element={<LineagePage />} />
          <Route path="/impact"     element={<ImpactPage />} />
          <Route path="/governance" element={<GovernancePage />} />
          <Route path="/ai"         element={<AIAssistant />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
