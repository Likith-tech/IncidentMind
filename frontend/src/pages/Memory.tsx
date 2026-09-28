import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import { Memory } from '../types';

function relativeTime(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`;
  return new Date(iso).toLocaleDateString();
}

const MemoryTypeChip: React.FC<{ type: string }> = ({ type }) => {
  const cls =
    type === 'resolution' ? 'memory-type-resolution'
    : type === 'analysis' ? 'memory-type-analysis'
    : 'memory-type-pattern';
  return <span className={`memory-type-chip ${cls}`}>{type}</span>;
};

// ── Stats row ──────────────────────────────────────────────
const StatCard: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
  <div className="kpi-card">
    <div className="kpi-label">{label}</div>
    <div className="kpi-value" style={{ fontSize: 22 }}>{value}</div>
  </div>
);

// ── Main Page ─────────────────────────────────────────────
export const MemoryPage: React.FC = () => {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [serviceFilter, setServiceFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    api<Memory[]>('/api/memory')
      .then(d => { setMemories(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  useEffect(() => { load(); }, [load]);

  const services = ['All', ...Array.from(new Set(memories.map(m => m.service))).sort()];
  const types = ['All', ...Array.from(new Set(memories.map(m => m.memory_type))).sort()];

  const filtered = memories.filter(m => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      m.summary.toLowerCase().includes(q) ||
      (m.root_cause || '').toLowerCase().includes(q) ||
      (m.resolution || '').toLowerCase().includes(q);
    const matchService = serviceFilter === 'All' || m.service === serviceFilter;
    const matchType = typeFilter === 'All' || m.memory_type === typeFilter;
    return matchSearch && matchService && matchType;
  });

  const resolutionCount = memories.filter(m => m.memory_type === 'resolution').length;
  const serviceCount = new Set(memories.map(m => m.service)).size;
  const mode = memories[0]?.mode || 'mock';

  if (error) {
    return (
      <div className="error-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <div className="error-msg">Failed to load memories. {error}</div>
        <button className="btn btn-secondary btn-sm" onClick={load}>Retry</button>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Organizational Memory</div>
          <p className="page-subtitle">Everything IncidentMind has learned from previous incidents.</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="kpi-grid" style={{ marginBottom: 24 }}>
        <StatCard label="Total Memories" value={loading ? '—' : memories.length} />
        <StatCard label="Resolution Memories" value={loading ? '—' : resolutionCount} />
        <StatCard label="Services Covered" value={loading ? '—' : serviceCount} />
        <StatCard label="Mode" value={loading ? '—' : mode} />
      </div>

      {/* Filter bar */}
      <div className="filter-bar">
        <input
          className="form-control"
          placeholder="Search memories…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 200 }}
        />
        <select className="form-control" value={serviceFilter} onChange={e => setServiceFilter(e.target.value)} style={{ minWidth: 150 }}>
          {services.map(s => <option key={s}>{s}</option>)}
        </select>
        <select className="form-control" value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{ minWidth: 140 }}>
          {types.map(t => <option key={t}>{t}</option>)}
        </select>
        {(search || serviceFilter !== 'All' || typeFilter !== 'All') && (
          <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(''); setServiceFilter('All'); setTypeFilter('All'); }}>
            Clear
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: 40 }}>Loading memories…</div>
      ) : filtered.length === 0 ? (
        <div className="empty-state" style={{ padding: '60px 20px' }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.25 }}>
            <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.44-4.14Z" />
            <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.44-4.14Z" />
          </svg>
          <div className="empty-state-title">
            {memories.length === 0 ? 'No memories yet' : 'No memories match your filters'}
          </div>
          <div className="empty-state-desc">
            {memories.length === 0
              ? 'Resolve an incident to create organizational memory. Each resolution teaches IncidentMind to handle future incidents better.'
              : 'Try adjusting your search or filters.'}
          </div>
        </div>
      ) : (
        <div className="memory-grid">
          {filtered.map(mem => (
            <div key={mem.id} className="memory-card">
              <div className="memory-card-top">
                <div className="memory-card-summary">{mem.summary}</div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                  <MemoryTypeChip type={mem.memory_type} />
                  <span className="service-chip">{mem.service}</span>
                </div>
              </div>

              {mem.root_cause && (
                <div className="memory-card-detail">
                  <strong>Root Cause:</strong> {mem.root_cause}
                </div>
              )}
              {mem.resolution && (
                <div className="memory-card-detail">
                  <strong>Resolution:</strong> {mem.resolution}
                </div>
              )}

              <div className="memory-card-footer">
                <span>{relativeTime(mem.created_at)}</span>
                {mem.incident_id && (
                  <span style={{ color: 'var(--accent)', fontSize: 11 }}>
                    INC-{String(mem.incident_id).padStart(4, '0')}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
};
