import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { Incident } from '../types';
import { SeverityBadge } from '../components/SeverityBadge';
import { StatusBadge } from '../components/StatusBadge';

function relativeTime(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`;
  return new Date(iso).toLocaleDateString();
}

const BrainIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.44-4.14Z" />
    <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.44-4.14Z" />
  </svg>
);

const SEVERITIES = ['All', 'Critical', 'High', 'Medium', 'Low'];
const STATUSES = ['All', 'Open', 'Analyzing', 'Analyzed', 'In Progress', 'Resolved'];

// ── New Incident Form ─────────────────────────────────────
interface NewIncidentFormProps {
  onCreated: () => void;
  prefill?: Partial<{ title: string; service: string; error_logs: string; symptoms: string; severity: string; environment: string; context: string }>;
}

export const NewIncidentForm: React.FC<NewIncidentFormProps> = ({ onCreated, prefill }) => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: prefill?.title || '',
    service: prefill?.service || '',
    error_logs: prefill?.error_logs || '',
    symptoms: prefill?.symptoms || '',
    context: prefill?.context || '',
    severity: prefill?.severity || 'high',
    environment: prefill?.environment || 'production',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const set = (field: string, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.service.trim()) {
      setError('Title and service are required.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const inc = await api<Incident>('/api/incidents', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      onCreated();
      navigate(`/incidents/${inc.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create incident.');
      setSubmitting(false);
    }
  };

  return (
    <form className="form-page" onSubmit={handleSubmit}>
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div>
          <div className="page-title">New Incident</div>
          <p className="page-subtitle">Report an incident for AI-powered root cause analysis.</p>
        </div>
      </div>

      {error && (
        <div className="warning-box" style={{ marginBottom: 16, background: 'rgba(248,81,73,0.08)', borderColor: 'rgba(248,81,73,0.3)', color: 'var(--critical)' }}>
          <svg viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1Zm-.25 4.75a.25.25 0 0 1 .5 0v3.5a.25.25 0 0 1-.5 0v-3.5Zm.25 6a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z"/></svg>
          {error}
        </div>
      )}

      <div className="card" style={{ marginBottom: 0 }}>
        <div className="form-group">
          <label className="form-label required">Incident Title</label>
          <input
            className="form-control"
            placeholder="e.g. Payment API returning 503 errors"
            value={form.title}
            onChange={e => set('title', e.target.value)}
            required
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label required">Service</label>
            <input
              className="form-control"
              placeholder="e.g. Payment Service"
              value={form.service}
              onChange={e => set('service', e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Environment</label>
            <select className="form-control" value={form.environment} onChange={e => set('environment', e.target.value)}>
              <option value="production">Production</option>
              <option value="staging">Staging</option>
              <option value="development">Development</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Severity</label>
          <select className="form-control" value={form.severity} onChange={e => set('severity', e.target.value)}>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Error Logs</label>
          <textarea
            className="form-control"
            placeholder="Paste relevant error messages, stack traces, or log snippets…"
            rows={5}
            value={form.error_logs}
            onChange={e => set('error_logs', e.target.value)}
            style={{ minHeight: 110, fontFamily: 'Courier New, monospace', fontSize: 12 }}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Symptoms</label>
          <textarea
            className="form-control"
            placeholder="Describe observable symptoms (e.g. high latency, 5xx errors, service unavailable)…"
            rows={3}
            value={form.symptoms}
            onChange={e => set('symptoms', e.target.value)}
          />
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Additional Context</label>
          <textarea
            className="form-control"
            placeholder="Any recent deployments, configuration changes, or other context that may be relevant…"
            rows={3}
            value={form.context}
            onChange={e => set('context', e.target.value)}
          />
        </div>
      </div>

      <div style={{ marginTop: 18, display: 'flex', gap: 10, alignItems: 'center' }}>
        <button type="submit" className="btn btn-primary btn-lg" disabled={submitting}>
          {submitting && <span className="spinner" />}
          {submitting ? 'Creating…' : 'Create Incident'}
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => navigate('/incidents')}>Cancel</button>
      </div>
    </form>
  );
};

// ── Incidents List Page ───────────────────────────────────
export const Incidents: React.FC = () => {
  const navigate = useNavigate();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    api<Incident[]>('/api/incidents')
      .then(d => { setIncidents(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = incidents.filter(inc => {
    const q = search.toLowerCase();
    const matchSearch = !q || inc.title.toLowerCase().includes(q) || inc.service.toLowerCase().includes(q);
    const matchSev = severityFilter === 'All' || inc.severity.toLowerCase() === severityFilter.toLowerCase();
    const matchStatus = statusFilter === 'All' || inc.status.toLowerCase().replace('_', ' ') === statusFilter.toLowerCase();
    return matchSearch && matchSev && matchStatus;
  });

  const hasFilters = search || severityFilter !== 'All' || statusFilter !== 'All';

  if (error) {
    return (
      <div className="error-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <div className="error-msg">Failed to load incidents. {error}</div>
        <button className="btn btn-secondary btn-sm" onClick={load}>Retry</button>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Incident Register</div>
          <p className="page-subtitle">All incidents tracked by IncidentMind</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/incidents/new')}>
          <svg viewBox="0 0 16 16" fill="currentColor"><path d="M7.75 2a.75.75 0 0 1 .75.75V7h4.25a.75.75 0 0 1 0 1.5H8.5v4.25a.75.75 0 0 1-1.5 0V8.5H2.75a.75.75 0 0 1 0-1.5H7V2.75A.75.75 0 0 1 7.75 2Z"/></svg>
          New Incident
        </button>
      </div>

      {/* Filter bar */}
      <div className="filter-bar">
        <input
          className="form-control"
          placeholder="Search by title or service…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 200 }}
        />
        <select className="form-control" value={severityFilter} onChange={e => setSeverityFilter(e.target.value)} style={{ minWidth: 130 }}>
          {SEVERITIES.map(s => <option key={s}>{s}</option>)}
        </select>
        <select className="form-control" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ minWidth: 140 }}>
          {STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>
        {hasFilters && (
          <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(''); setSeverityFilter('All'); setStatusFilter('All'); }}>
            Clear
          </button>
        )}
      </div>

      {loading ? (
        <div className="card">
          <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '20px 0', textAlign: 'center' }}>Loading incidents…</div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <BrainIcon />
            <div className="empty-state-title">
              {incidents.length === 0 ? 'No incidents yet' : 'No incidents match your filters'}
            </div>
            <div className="empty-state-desc">
              {incidents.length === 0
                ? 'Create your first incident to begin AI-powered root cause analysis.'
                : 'Try adjusting your search or filters.'}
            </div>
            {incidents.length === 0 && (
              <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/incidents/new')}>
                Create First Incident
              </button>
            )}
          </div>
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
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(inc => (
                <tr key={inc.id}>
                  <td><span className="incident-id">INC-{String(inc.id).padStart(4, '0')}</span></td>
                  <td>
                    <div style={{ fontWeight: 500, fontSize: 13, color: 'var(--text-primary)' }}>{inc.title}</div>
                  </td>
                  <td className="td-muted">{inc.service}</td>
                  <td><SeverityBadge severity={inc.severity} /></td>
                  <td><StatusBadge status={inc.status} /></td>
                  <td className="td-muted">{relativeTime(inc.created_at)}</td>
                  <td>
                    <Link to={`/incidents/${inc.id}`} className="btn btn-secondary btn-sm" style={{ textDecoration: 'none' }}>
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
};
