import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { api } from '../api/client';
import { DashboardSummary } from '../types';
import { SeverityBadge } from '../components/SeverityBadge';
import { StatusBadge } from '../components/StatusBadge';

// ── Helpers ────────────────────────────────────────────────
function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function relativeTime(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`;
  return new Date(iso).toLocaleDateString();
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#f85149',
  high: '#e3b341',
  medium: '#d29922',
  low: '#58a6ff',
};

// ── Sub-components ─────────────────────────────────────────
const KpiCard: React.FC<{
  label: string;
  value: number | string;
  loading: boolean;
  tint?: string;
  unit?: string;
}> = ({ label, value, loading, tint, unit }) => (
  <div className={`kpi-card${tint ? ` ${tint}-tint` : ''}`}>
    <div className="kpi-label">{label}</div>
    {loading ? (
      <span className="skeleton skeleton-kpi-value" />
    ) : (
      <div className="kpi-value">
        {value}
        {unit && <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--text-secondary)', marginLeft: 3 }}>{unit}</span>}
      </div>
    )}
  </div>
);

// ── Dashboard Page ─────────────────────────────────────────
export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    api<DashboardSummary>('/api/dashboard/summary')
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  useEffect(() => { load(); }, [load]);

  const chartData = data
    ? Object.entries(data.severity_distribution).map(([name, value]) => ({ name, value }))
    : [];

  if (error) {
    return (
      <div className="error-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <div className="error-msg">{error}</div>
        <button className="btn btn-secondary btn-sm" onClick={load}>Retry</button>
      </div>
    );
  }

  return (
    <>
      {/* Greeting */}
      <div className="dashboard-greeting">
        <div className="page-header" style={{ marginBottom: 4 }}>
          <div>
            <h1 className="page-title">{greeting()}, Engineer 👋</h1>
            <p className="page-subtitle">AI-powered incident intelligence for your engineering team.</p>
          </div>
          <button className="btn btn-primary btn-lg" onClick={() => navigate('/incidents/new')}>
            <svg viewBox="0 0 16 16" fill="currentColor"><path d="M7.75 2a.75.75 0 0 1 .75.75V7h4.25a.75.75 0 0 1 0 1.5H8.5v4.25a.75.75 0 0 1-1.5 0V8.5H2.75a.75.75 0 0 1 0-1.5H7V2.75A.75.75 0 0 1 7.75 2Z"/></svg>
            Analyze New Incident
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="kpi-grid">
        <KpiCard label="Active Incidents" value={data?.active_incidents ?? 0} loading={loading} />
        <KpiCard label="Critical" value={data?.critical_incidents ?? 0} loading={loading} tint="critical" />
        <KpiCard label="Resolved" value={data?.resolved_incidents ?? 0} loading={loading} tint="success" />
        <KpiCard label="Avg Resolution" value={data ? `${data.avg_resolution_minutes}` : '—'} unit="min" loading={loading} tint="accent" />
        <KpiCard label="Memory-Assisted" value={data?.memory_influenced_count ?? 0} loading={loading} tint="memory" />
        <KpiCard label="Total Memories" value={data?.memory_count ?? 0} loading={loading} tint="memory" />
      </div>

      {/* Severity Chart */}
      <div className="two-col" style={{ marginBottom: 24 }}>
        <div className="card">
          <div className="section-header">
            <div>
              <div className="section-title">Severity Distribution</div>
              <div className="section-subtitle">Open incidents by severity level</div>
            </div>
          </div>
          {loading ? (
            <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Loading chart…</div>
          ) : chartData.length === 0 ? (
            <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={60} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                  contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-bright)', borderRadius: 6, fontSize: 12, color: 'var(--text-primary)' }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {chartData.map((entry) => (
                    <Cell key={entry.name} fill={SEVERITY_COLORS[entry.name.toLowerCase()] || 'var(--accent)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Hindsight Memory Panel */}
        <div className="memory-panel">
          <div className="memory-panel-header">
            <span className="memory-panel-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.44-4.14Z" />
                <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.44-4.14Z" />
              </svg>
            </span>
            <span className="memory-panel-title">Hindsight Memory</span>
          </div>

          <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
            <div className="memory-stat" style={{ flex: 1, minWidth: 100 }}>
              <div>
                <div className="memory-stat-value">{loading ? '—' : data?.memory_count ?? 0}</div>
                <div className="memory-stat-label">Stored memories</div>
              </div>
            </div>
            <div className="memory-stat" style={{ flex: 1, minWidth: 100 }}>
              <div>
                <div className="memory-stat-value">{loading ? '—' : data?.memory_influenced_count ?? 0}</div>
                <div className="memory-stat-label">Analyses enhanced</div>
              </div>
            </div>
          </div>

          <div className="memory-learn-loop">
            🧠 <strong>The Learning Loop:</strong> Every resolved incident is stored as organizational memory.
            When a similar incident occurs, the AI recalls past resolutions and generates better recommendations
            — so your team gets smarter with every incident.
          </div>

          <div style={{ marginTop: 12 }}>
            <Link to="/memory" className="btn btn-purple btn-sm" style={{ textDecoration: 'none' }}>
              View Memory Bank →
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Incidents */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="section-header">
          <div>
            <div className="section-title">Recent Incidents</div>
            <div className="section-subtitle">Latest activity across your services</div>
          </div>
          <Link to="/incidents" className="btn btn-secondary btn-sm" style={{ textDecoration: 'none' }}>
            View all
          </Link>
        </div>

        {loading ? (
          <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '16px 0' }}>Loading…</div>
        ) : !data?.recent_incidents?.length ? (
          <div className="empty-state" style={{ padding: '30px 0' }}>
            <div className="empty-state-title">No recent incidents</div>
            <div className="empty-state-desc">Create your first incident to begin AI-powered analysis.</div>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Incident</th>
                  <th>Service</th>
                  <th>Severity</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {data.recent_incidents.map(inc => (
                  <tr key={inc.id}>
                    <td><span className="incident-id">INC-{String(inc.id).padStart(4, '0')}</span></td>
                    <td>
                      <Link to={`/incidents/${inc.id}`} style={{ color: 'var(--text-primary)', textDecoration: 'none', fontWeight: 500, fontSize: 13 }}>
                        {inc.title}
                      </Link>
                    </td>
                    <td className="td-muted">{inc.service}</td>
                    <td><SeverityBadge severity={inc.severity} /></td>
                    <td><StatusBadge status={inc.status} /></td>
                    <td className="td-muted">{relativeTime(inc.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
};
