import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { api } from '../api/client';
import { HealthStatus } from '../types';

// ── SVG Icons ──────────────────────────────────────────────
const BrainIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.44-4.14Z" />
    <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.44-4.14Z" />
  </svg>
);

const DashboardIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
);

const AlertIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

const BotIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 8V4H8" />
    <rect x="3" y="8" width="18" height="12" rx="2" />
    <circle cx="9" cy="14" r="1.5" />
    <circle cx="15" cy="14" r="1.5" />
    <path d="M9 18h6" />
  </svg>
);

const PlayIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);

// ── Status dot helper ──────────────────────────────────────
const dotColor = (val: string): 'green' | 'yellow' | 'red' | 'blue' => {
  const v = (val || '').toLowerCase();
  if (v === 'ok' || v === 'healthy' || v === 'connected') return 'green';
  if (v === 'mock') return 'yellow';
  if (v === 'groq' || v === 'cloud') return 'blue';
  if (v === 'error' || v === 'down') return 'red';
  return 'yellow';
};

// ── Shell Component ────────────────────────────────────────
export const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [health, setHealth] = useState<HealthStatus | null>(null);

  useEffect(() => {
    api<HealthStatus>('/api/health')
      .then(setHealth)
      .catch(() => setHealth(null));
  }, []);

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `nav-link${isActive ? ' active' : ''}`;

  return (
    <div className="app-shell">
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        {/* Brand */}
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">
            <BrainIcon size={18} />
          </div>
          <div className="sidebar-brand-text">
            <span className="sidebar-brand-name">IncidentMind</span>
            <span className="sidebar-brand-sub">AI Incident Intelligence</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="sidebar-nav">
          <NavLink to="/" end className={navClass}>
            <DashboardIcon />
            Dashboard
          </NavLink>
          <NavLink to="/incidents" className={navClass}>
            <AlertIcon />
            Incidents
          </NavLink>
          <NavLink to="/memory" className={navClass}>
            <BrainIcon size={16} />
            Memory
          </NavLink>
          <NavLink to="/agent" className={navClass}>
            <BotIcon />
            AI Agent
          </NavLink>
          <NavLink to="/demo" className={navClass}>
            <PlayIcon />
            Demo Mode
          </NavLink>
        </nav>

        {/* System Status */}
        <div className="sidebar-status">
          <div className="sidebar-status-title">System</div>

          {health ? (
            <>
              <div className="status-item">
                <span className={`status-dot ${dotColor(health.hindsight_mode)}`} />
                Hindsight:{' '}
                <span style={{ color: 'var(--text-primary)', marginLeft: 2 }}>
                  {health.hindsight_mode || 'unknown'}
                </span>
              </div>
              <div className="status-item">
                <span className={`status-dot ${dotColor(health.llm_mode)}`} />
                LLM:{' '}
                <span style={{ color: 'var(--text-primary)', marginLeft: 2 }}>
                  {health.llm_mode || 'unknown'}
                </span>
              </div>
              <div className="status-item">
                <span className={`status-dot ${dotColor(health.database)}`} />
                DB:{' '}
                <span style={{ color: 'var(--text-primary)', marginLeft: 2 }}>
                  {health.database || 'unknown'}
                </span>
              </div>
            </>
          ) : (
            <div className="status-item">
              <span className="status-dot yellow" />
              <span style={{ color: 'var(--text-muted)' }}>Checking…</span>
            </div>
          )}
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="main-content">
        <div className="page-container">
          {children}
        </div>
      </main>
    </div>
  );
};
