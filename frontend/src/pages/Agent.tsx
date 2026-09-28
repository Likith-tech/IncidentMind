import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { DashboardSummary } from '../types';

const HOW_IT_WORKS = [
  {
    title: 'Incident is Reported',
    desc: 'An engineer reports an incident with error logs, symptoms, and context. IncidentMind immediately begins processing.',
  },
  {
    title: 'Agent Searches Hindsight Memory',
    desc: 'The AI agent queries the organizational memory bank for semantically similar past incidents — matching on service, error patterns, and symptoms.',
  },
  {
    title: 'Historical Resolutions Influence Recommendations',
    desc: 'Past resolutions are surfaced and used to generate a tailored root cause analysis with confidence scores and actionable steps.',
  },
  {
    title: 'Engineer Resolves & Stores New Memory',
    desc: 'When the incident is resolved, the engineer stores the actual root cause and resolution. This becomes a new memory entry — the system has learned.',
  },
];

export const Agent: React.FC = () => {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    api<DashboardSummary>('/api/dashboard/summary')
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">AI Agent</div>
          <p className="page-subtitle">How IncidentMind's AI engine works under the hood</p>
        </div>
      </div>

      {/* Hero */}
      <div className="agent-hero">
        <h1>AI Incident Agent</h1>
        <p>
          IncidentMind uses an AI agent powered by Hindsight memory — a proprietary organizational learning system that
          retrieves past resolutions and applies them to new incidents. Every resolved incident makes the system smarter.
        </p>

        {/* 3-step flow */}
        <div className="agent-flow">
          <div className="agent-flow-step">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
            </svg>
            <span className="agent-flow-step-label">Input Incident</span>
          </div>
          <span className="agent-flow-arrow">→</span>
          <div className="agent-flow-step memory-step">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.44-4.14Z" />
              <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.44-4.14Z" />
            </svg>
            <span className="agent-flow-step-label">Search Memory</span>
          </div>
          <span className="agent-flow-arrow">→</span>
          <div className="agent-flow-step success-step">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <span className="agent-flow-step-label">Generate Recommendation</span>
          </div>
        </div>

        {/* CTA buttons */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/incidents/new" className="btn btn-primary btn-lg" style={{ textDecoration: 'none' }}>
            Analyze New Incident
          </Link>
          <Link to="/memory" className="btn btn-purple btn-lg" style={{ textDecoration: 'none' }}>
            View Memory Bank
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="agent-stats-row">
        <div className="agent-stat-card">
          <div className="agent-stat-value">{loading ? '—' : data?.memory_count ?? 0}</div>
          <div className="agent-stat-label">Memories Available</div>
        </div>
        <div className="agent-stat-card">
          <div className="agent-stat-value">{loading ? '—' : data?.memory_influenced_count ?? 0}</div>
          <div className="agent-stat-label">Analyses Enhanced</div>
        </div>
        <div className="agent-stat-card">
          <div className="agent-stat-value" style={{ color: 'var(--teal)' }}>
            {loading ? '—' : data?.resolved_incidents ?? 0}
          </div>
          <div className="agent-stat-label">Incidents Resolved</div>
        </div>
        <div className="agent-stat-card">
          <div className="agent-stat-value" style={{ color: 'var(--accent)' }}>
            {loading ? '—' : data?.avg_resolution_minutes ?? 0}
            <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--text-secondary)', marginLeft: 3 }}>min</span>
          </div>
          <div className="agent-stat-label">Avg Resolution Time</div>
        </div>
      </div>

      {/* How It Works */}
      <div className="agent-how-it-works">
        <div className="section-title" style={{ marginBottom: 16 }}>How It Works</div>
        {HOW_IT_WORKS.map((step, i) => (
          <div key={i} className="agent-how-step">
            <div className="agent-step-num">{i + 1}</div>
            <div>
              <div className="agent-step-title">{step.title}</div>
              <div className="agent-step-desc">{step.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
};
