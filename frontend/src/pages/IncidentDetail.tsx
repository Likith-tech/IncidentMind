import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { Incident, MemoryReference } from '../types';
import { SeverityBadge } from '../components/SeverityBadge';
import { StatusBadge } from '../components/StatusBadge';
import { useToast } from '../components/Toast';

// ── Helpers ────────────────────────────────────────────────
function relativeTime(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`;
  return new Date(iso).toLocaleDateString();
}

const ANALYSIS_STEPS = [
  'Retrieving historical memory…',
  'Analyzing incident pattern…',
  'Generating recommendation…',
];

// ── Resolution Modal ───────────────────────────────────────
interface ResolveModalProps {
  onClose: () => void;
  onSubmit: (data: { root_cause: string; resolution: string; notes: string }) => Promise<void>;
}

const ResolveModal: React.FC<ResolveModalProps> = ({ onClose, onSubmit }) => {
  const [rootCause, setRootCause] = useState('');
  const [resolution, setResolution] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rootCause.trim() || !resolution.trim()) return;
    setSubmitting(true);
    await onSubmit({ root_cause: rootCause, resolution, notes });
    setSubmitting(false);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2 className="modal-title">Resolve & Teach IncidentMind</h2>
        <p className="modal-subtitle">
          Provide the actual root cause and resolution. This will be stored as organizational memory
          to improve future AI recommendations.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label required">Actual Root Cause</label>
            <textarea
              className="form-control"
              placeholder="What was the actual root cause of this incident?"
              value={rootCause}
              onChange={e => setRootCause(e.target.value)}
              required
              rows={3}
            />
          </div>

          <div className="form-group">
            <label className="form-label required">Resolution Applied</label>
            <textarea
              className="form-control"
              placeholder="What steps were taken to resolve this incident?"
              value={resolution}
              onChange={e => setResolution(e.target.value)}
              required
              rows={3}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Additional Notes</label>
            <textarea
              className="form-control"
              placeholder="Any additional notes, preventive measures, or follow-up actions…"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          <div className="modal-note">
            🧠 This outcome will be stored as organizational memory and will influence recommendations
            for similar incidents in the future.
          </div>

          <div className="modal-actions">
            <button type="submit" className="btn btn-success" disabled={submitting || !rootCause.trim() || !resolution.trim()}>
              {submitting && <span className="spinner" style={{ borderTopColor: 'var(--teal)' }} />}
              {submitting ? 'Storing…' : 'Store Resolution Memory'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Memory Reference Card ─────────────────────────────────
const MemoryRefCard: React.FC<{ mem: MemoryReference; index: number }> = ({ mem, index }) => (
  <div className="memory-ref-card">
    <div className="memory-ref-summary">
      <span style={{ color: 'var(--text-muted)', fontSize: 10, fontWeight: 600, marginRight: 6 }}>#{index + 1}</span>
      {mem.summary}
    </div>
    {mem.root_cause && (
      <div className="memory-ref-detail">
        <strong>Root Cause:</strong> {mem.root_cause}
      </div>
    )}
    {mem.resolution && (
      <div className="memory-ref-detail">
        <strong>Resolution:</strong> {mem.resolution}
      </div>
    )}
    <div style={{ marginTop: 8 }}>
      <span className="relevance-indicator">Recalled from memory</span>
    </div>
  </div>
);

// ── Main Page ─────────────────────────────────────────────
export const IncidentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { addToast } = useToast();
  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const stepTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    api<Incident>(`/api/incidents/${id}`)
      .then(d => { setIncident(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // Cleanup step timer on unmount
  useEffect(() => () => { if (stepTimer.current) clearInterval(stepTimer.current); }, []);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setAnalysisStep(0);
    stepTimer.current = setInterval(() => {
      setAnalysisStep(prev => (prev + 1) % ANALYSIS_STEPS.length);
    }, 1800);

    try {
      // /analyze returns the analysis object; reload the full incident afterwards
      await api<unknown>(`/api/incidents/${id}/analyze`, { method: 'POST' });
      if (stepTimer.current) clearInterval(stepTimer.current);
      // Reload the full incident so we get the embedded analysis
      const refreshed = await api<Incident>(`/api/incidents/${id}`);
      setIncident(refreshed);
      setAnalyzing(false);
      addToast('AI analysis complete!', 'success');
    } catch (e: any) {
      if (stepTimer.current) clearInterval(stepTimer.current);
      setAnalyzing(false);
      addToast(`Analysis failed: ${e.message}`, 'error');
    }
  };

  const handleResolve = async (data: { root_cause: string; resolution: string; notes: string }) => {
    try {
      // Backend expects actual_root_cause and resolution_applied
      const result = await api<{ incident: Incident; memory_id: number; message: string }>(
        `/api/incidents/${id}/resolve`,
        {
          method: 'POST',
          body: JSON.stringify({
            actual_root_cause: data.root_cause,
            resolution_applied: data.resolution,
            notes: data.notes,
          }),
        }
      );
      setIncident(result.incident);
      setShowResolveModal(false);
      addToast('Resolution stored as organizational memory 🧠', 'success');
    } catch (e: any) {
      addToast(`Failed to resolve: ${e.message}`, 'error');
    }
  };

  if (loading) {
    return (
      <div style={{ color: 'var(--text-muted)', padding: 40, textAlign: 'center', fontSize: 13 }}>
        Loading incident…
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <div className="error-msg">{error}</div>
        <button className="btn btn-secondary btn-sm" onClick={load}>Retry</button>
      </div>
    );
  }

  if (!incident) return null;

  const incId = `INC-${String(incident.id).padStart(4, '0')}`;
  const hasAnalysis = !!incident.analysis;
  const pastMemories = incident.analysis?.relevant_past_incidents ?? [];
  const hasMemory = pastMemories.length > 0;
  const isResolved = incident.status === 'resolved';

  const timelineSteps = [
    { label: 'Incident created', time: incident.created_at, done: true },
    { label: 'Memory retrieval', time: hasAnalysis ? incident.created_at : null, done: hasAnalysis },
    { label: 'AI recommendation generated', time: hasAnalysis ? incident.created_at : null, done: hasAnalysis },
    { label: 'Resolution stored in memory', time: incident.resolved_at || null, done: isResolved },
  ];

  return (
    <>
      {/* Breadcrumb */}
      <div className="breadcrumb">
        <Link to="/incidents">Incidents</Link>
        <span className="breadcrumb-sep">›</span>
        <span style={{ color: 'var(--text-secondary)' }}>{incId}</span>
      </div>

      {/* Header */}
      <div className="detail-header">
        <div className="detail-id">{incId}</div>
        <div className="detail-title">{incident.title}</div>
        <div className="detail-meta">
          <SeverityBadge severity={incident.severity} />
          <span className="env-chip">{incident.environment}</span>
          <StatusBadge status={incident.status} />
          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
            {incident.service} · {relativeTime(incident.created_at)}
          </span>
        </div>

        {!isResolved && (
          <div className="detail-actions">
            <button
              className="btn btn-primary"
              onClick={handleAnalyze}
              disabled={analyzing}
            >
              {analyzing ? <span className="spinner" /> : (
                <svg viewBox="0 0 16 16" fill="currentColor"><path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Z" /><path d="M6.5 6.5l3 1.5-3 1.5z"/></svg>
              )}
              {analyzing ? 'Analyzing…' : hasAnalysis ? 'Re-run AI Analysis' : 'Run AI Analysis'}
            </button>
            <button className="btn btn-success" onClick={() => setShowResolveModal(true)}>
              <svg viewBox="0 0 16 16" fill="currentColor"><path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z"/></svg>
              Resolve Incident
            </button>
          </div>
        )}
      </div>

      {/* No analysis empty state */}
      {!hasAnalysis && !analyzing && (
        <div className="no-analysis-panel" style={{ marginBottom: 24 }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--memory-accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 12px', display: 'block', opacity: 0.6 }}>
            <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.44-4.14Z" />
            <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.44-4.14Z" />
          </svg>
          <div className="empty-state-title" style={{ marginBottom: 6 }}>Ready to use Hindsight</div>
          <div className="empty-state-desc" style={{ marginBottom: 18 }}>
            Click "Run AI Analysis" to let IncidentMind search its memory bank and generate a root cause recommendation.
          </div>
          {!isResolved && (
            <button className="btn btn-primary" onClick={handleAnalyze} disabled={analyzing}>
              Run AI Analysis
            </button>
          )}
        </div>
      )}

      {/* Analysis grid */}
      {(hasAnalysis || analyzing) && (
        <div className="detail-grid" style={{ marginBottom: 24 }}>
          {/* Left: Error Context */}
          <div className="card">
            <div className="card-title" style={{ marginBottom: 14 }}>Error Context</div>

            {incident.error_logs && (
              <>
                <div className="analysis-section-label">Error Logs</div>
                <div className="code-block" style={{ marginBottom: 14 }}>{incident.error_logs}</div>
              </>
            )}

            {incident.symptoms && (
              <>
                <div className="analysis-section-label">Symptoms</div>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{incident.symptoms}</p>
              </>
            )}

            {incident.context && (
              <>
                <div className="analysis-section-label" style={{ marginTop: 12 }}>Context</div>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{incident.context}</p>
              </>
            )}
          </div>

          {/* Right: AI Analysis Panel */}
          <div className="analysis-panel">
            {analyzing && (
              <div className="analysis-loading-overlay">
                <div className="analysis-loading-spinner" />
                <div className="analysis-loading-step" key={analysisStep}>
                  {ANALYSIS_STEPS[analysisStep]}
                </div>
              </div>
            )}

            {hasAnalysis && incident.analysis && (
              <>
                <div className="analysis-panel-header">
                  <div className="analysis-panel-title">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
                    Agent Analysis
                  </div>
                  <span className="confidence-badge">
                    {incident.analysis.confidence}% confidence
                  </span>
                </div>

                <div className="analysis-section-label">Likely Root Cause</div>
                <div className="root-cause-text">{incident.analysis.likely_root_cause}</div>

                {incident.analysis.recommended_actions.length > 0 && (
                  <>
                    <div className="analysis-section-label">Recommended Actions</div>
                    <ol className="action-list">
                      {incident.analysis.recommended_actions.map((action, i) => (
                        <li key={i}>
                          <span className="action-number">{i + 1}.</span>
                          <span>{action}</span>
                        </li>
                      ))}
                    </ol>
                  </>
                )}

                {incident.analysis.why_this_recommendation && (
                  <>
                    <div className="analysis-section-label">Why This Recommendation</div>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 14 }}>
                      {incident.analysis.why_this_recommendation}
                    </p>
                  </>
                )}

                <div className="warning-box">
                  <svg viewBox="0 0 16 16" fill="currentColor"><path d="M6.457 1.047c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75 1.75 0 0 1 14.082 15H1.918a1.75 1.75 0 0 1-1.543-2.575Zm1.763.707a.25.25 0 0 0-.44 0L1.698 13.132a.25.25 0 0 0 .22.368h12.164a.25.25 0 0 0 .22-.368Zm.53 3.996v2.5a.75.75 0 0 1-1.5 0v-2.5a.75.75 0 0 1 1.5 0ZM9 11a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z"/></svg>
                  AI-generated recommendations require engineer verification before applying.
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Hindsight Memory Panel */}
      {hasAnalysis && (
        <div className="memory-panel" style={{ marginBottom: 24 }}>
          <div className="memory-panel-header">
            <span className="memory-panel-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.44-4.14Z" />
                <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.44-4.14Z" />
              </svg>
            </span>
            <span className="memory-panel-title">🧠 Hindsight Memory</span>
          </div>

          {hasMemory ? (
            <>
              <div style={{ fontSize: 12, color: 'var(--memory-accent)', marginBottom: 12, fontWeight: 500 }}>
                {pastMemories.length} relevant experience{pastMemories.length !== 1 ? 's' : ''} found
              </div>
              {pastMemories.map((mem, i) => (
                <MemoryRefCard key={mem.memory_id} mem={mem} index={i} />
              ))}
              <div style={{ marginTop: 14, padding: '10px 14px', background: 'rgba(163,113,247,0.07)', borderRadius: 8, border: '1px solid rgba(163,113,247,0.15)' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--memory-accent)', marginBottom: 4 }}>Why This Matters</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                  {incident.analysis?.memory_impact ||
                    'Historical resolutions from similar incidents were used to improve the AI recommendation. Resolving this incident will further enhance future analyses.'}
                </div>
              </div>
            </>
          ) : (
            <div className="empty-state" style={{ padding: '20px 0' }}>
              <div className="empty-state-title" style={{ fontSize: 13 }}>No historical memory found for this incident type</div>
              <div className="empty-state-desc">
                Resolve this incident to create the first memory entry — future similar incidents will benefit from this experience.
              </div>
            </div>
          )}
        </div>
      )}

      {/* Timeline */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-title" style={{ marginBottom: 16 }}>Incident Timeline</div>
        <div className="timeline">
          {timelineSteps.map((step, i) => (
            <div key={i} className="timeline-item">
              <div className="timeline-icon-col">
                <div className={`timeline-dot ${step.done ? 'completed' : 'pending'}`}>
                  {step.done ? (
                    <svg viewBox="0 0 16 16" fill="currentColor"><path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z"/></svg>
                  ) : (
                    <svg viewBox="0 0 16 16" fill="currentColor"><circle cx="8" cy="8" r="3"/></svg>
                  )}
                </div>
                {i < timelineSteps.length - 1 && <div className="timeline-line" />}
              </div>
              <div className="timeline-content">
                <div className="timeline-title" style={{ color: step.done ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                  {step.label}
                </div>
                {step.time && (
                  <div className="timeline-time">{relativeTime(step.time)}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Resolve modal */}
      {showResolveModal && (
        <ResolveModal onClose={() => setShowResolveModal(false)} onSubmit={handleResolve} />
      )}
    </>
  );
};


