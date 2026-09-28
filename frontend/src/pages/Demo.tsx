import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useToast } from '../components/Toast';

const DEMO_STEPS = [
  { num: '01', label: 'Create Incident' },
  { num: '02', label: 'Analyze' },
  { num: '03', label: 'Resolve' },
  { num: '04', label: 'Memory Stored' },
  { num: '05', label: 'Similar Incident' },
  { num: '06', label: 'Recall' },
  { num: '07', label: 'Better Result' },
];

// ── Confirm Reset Modal ────────────────────────────────────
const ConfirmModal: React.FC<{ onConfirm: () => void; onCancel: () => void; resetting: boolean }> = ({
  onConfirm,
  onCancel,
  resetting,
}) => (
  <div className="modal-backdrop" onClick={onCancel}>
    <div className="modal" onClick={e => e.stopPropagation()}>
      <div className="confirm-modal-title">Reset Demo Data?</div>
      <div className="confirm-modal-text">
        This will clear all incidents, analyses, and stored memories — resetting IncidentMind to a clean state.
        This action cannot be undone.
      </div>
      <div className="modal-actions">
        <button className="btn btn-danger" onClick={onConfirm} disabled={resetting}>
          {resetting && <span className="spinner" style={{ borderTopColor: 'var(--critical)' }} />}
          {resetting ? 'Resetting…' : 'Yes, Reset Everything'}
        </button>
        <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  </div>
);

// ── Demo Flow Visual ───────────────────────────────────────
const DemoFlowVisual: React.FC = () => (
  <div className="demo-flow-visual">
    {[
      { icon: '📝', label: 'Create' },
      { icon: '🧠', label: 'Analyze' },
      { icon: '✅', label: 'Resolve' },
      { icon: '💾', label: 'Memory Stored' },
    ].map((step, i, arr) => (
      <React.Fragment key={step.label}>
        <div className="demo-flow-node">
          <span style={{ fontSize: 14 }}>{step.icon}</span>
          {step.label}
        </div>
        {i < arr.length - 1 && <span className="demo-flow-arrow-sm">→</span>}
      </React.Fragment>
    ))}
  </div>
);

// ── Main Page ─────────────────────────────────────────────
export const Demo: React.FC = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [showConfirm, setShowConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [activeStep, setActiveStep] = useState(0);

  const handleReset = async () => {
    setResetting(true);
    try {
      await api('/api/demo/reset', { method: 'POST' });
      addToast('Demo data reset successfully. Start fresh!', 'success');
      setShowConfirm(false);
      setActiveStep(0);
    } catch (e: any) {
      addToast(`Reset failed: ${e.message}`, 'error');
    } finally {
      setResetting(false);
    }
  };

  const handleStartDemo = () => {
    // Navigate to new incident with pre-filled data via state
    navigate('/incidents/new', {
      state: {
        prefill: {
          title: 'Payment API returning 503 errors',
          service: 'Payment Service',
          severity: 'critical',
          environment: 'production',
          error_logs: 'ERROR 2024-01-15 14:23:01 [payment-service] HTTP 503 Service Unavailable\nERROR Connection pool exhausted: max_connections=100, active=100\nERROR Timeout connecting to postgres://db-primary:5432/payments after 30000ms\nWARN Retry attempt 3/3 failed for transaction TXN-789456',
          symptoms: 'Payment transactions failing with 503 errors. Database connection pool exhausted. High latency on checkout endpoint (p99 > 30s). Revenue impact detected.',
          context: 'Deployed new payment processing feature 2 hours ago. Traffic is 2x normal due to promotional event.',
        },
      },
    });
  };

  return (
    <>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div className="demo-eyebrow">GUIDED DEMO</div>
        <div className="demo-heading">See IncidentMind Learn</div>
        <div className="demo-desc">
          This guided walkthrough shows judges exactly how IncidentMind's Hindsight memory system works —
          from the first incident, through learning, to improved AI recommendations on the next similar incident.
        </div>
      </div>

      {/* Progress steps bar */}
      <div className="demo-steps-bar">
        {DEMO_STEPS.map((step, i) => (
          <button
            key={step.num}
            className={`demo-step-item${i === activeStep ? ' active' : ''}`}
            onClick={() => setActiveStep(i)}
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <span className="demo-step-num">{step.num}</span>
            {step.label}
          </button>
        ))}
      </div>

      {/* Demo cards */}
      <div className="demo-cards-grid">
        {/* Card 1: First Incident */}
        <div className="demo-card">
          <div className="demo-card-eyebrow">STEP 1 · FIRST INCIDENT</div>
          <div className="demo-card-title">Payment API returning 503 errors</div>
          <div className="demo-incident-field">
            <span className="demo-field-label">Service</span>
            <span className="demo-field-value">Payment Service</span>
          </div>
          <div className="demo-incident-field">
            <span className="demo-field-label">Severity</span>
            <span className="severity-badge severity-critical">CRITICAL</span>
          </div>
          <div className="demo-incident-field">
            <span className="demo-field-label">Environment</span>
            <span className="demo-field-value">Production</span>
          </div>
          <div className="demo-incident-field" style={{ alignItems: 'flex-start' }}>
            <span className="demo-field-label">Symptoms</span>
            <span className="demo-field-value" style={{ fontSize: 11, lineHeight: 1.6 }}>
              503 errors on checkout, DB connection pool exhausted, p99 latency &gt;30s
            </span>
          </div>
          <button
            className="btn btn-primary"
            style={{ marginTop: 16, width: '100%' }}
            onClick={handleStartDemo}
          >
            <svg viewBox="0 0 16 16" fill="currentColor"><path d="M7.75 2a.75.75 0 0 1 .75.75V7h4.25a.75.75 0 0 1 0 1.5H8.5v4.25a.75.75 0 0 1-1.5 0V8.5H2.75a.75.75 0 0 1 0-1.5H7V2.75A.75.75 0 0 1 7.75 2Z"/></svg>
            Create This Incident
          </button>
        </div>

        {/* Card 2: What Happens */}
        <div className="demo-card">
          <div className="demo-card-eyebrow">STEP 2–4 · WHAT HAPPENS</div>
          <div className="demo-card-title">The Incident Lifecycle</div>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 14, lineHeight: 1.7 }}>
            After creating the incident, run AI analysis. IncidentMind will search its memory bank
            (empty on first run) and generate a root cause recommendation. Then resolve it to teach the system.
          </p>
          <DemoFlowVisual />
          <div style={{ marginTop: 16, padding: '10px 14px', background: 'var(--bg-overlay)', borderRadius: 8, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            <strong style={{ color: 'var(--text-primary)' }}>On first run:</strong> No memory found → generic recommendation.
            <br />
            <strong style={{ color: 'var(--teal)' }}>After resolution:</strong> Memory stored → next time is smarter.
          </div>
        </div>

        {/* Card 3: Learning Loop */}
        <div className="demo-card purple">
          <div className="demo-card-eyebrow">STEP 4 · THE LEARNING LOOP</div>
          <div className="demo-card-title">Memory is Stored 🧠</div>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 14, lineHeight: 1.7 }}>
            When you resolve the incident and provide the actual root cause and fix, IncidentMind stores
            this as a structured memory entry. It includes the service, error pattern, root cause, and resolution.
          </p>
          <div style={{ padding: '12px 14px', background: 'rgba(163,113,247,0.08)', borderRadius: 8, border: '1px solid rgba(163,113,247,0.2)', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            <strong style={{ color: 'var(--memory-accent)' }}>What gets stored:</strong>
            <ul style={{ marginTop: 6, paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <li>Incident summary and service</li>
              <li>Actual root cause (from engineer)</li>
              <li>Resolution steps applied</li>
              <li>Pattern tags for future matching</li>
            </ul>
          </div>
          <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
            <span className="memory-type-chip memory-type-resolution">resolution</span>
            <span className="service-chip">Payment Service</span>
          </div>
        </div>

        {/* Card 4: Similar Incident */}
        <div className="demo-card">
          <div className="demo-card-eyebrow">STEP 5–7 · THE PAYOFF</div>
          <div className="demo-card-title">Similar Incident → Better AI</div>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 14, lineHeight: 1.7 }}>
            Create a second incident with similar symptoms (Payment API, 503s, DB issues).
            This time, Hindsight will find the stored memory and generate a far more specific recommendation —
            immediately referencing the previous root cause and resolution.
          </p>
          <div style={{ padding: '10px 14px', background: 'rgba(57,211,83,0.06)', border: '1px solid rgba(57,211,83,0.2)', borderRadius: 8, fontSize: 12, color: 'var(--teal)', marginBottom: 14 }}>
            ✓ Memory recalled → higher confidence → specific fix → faster resolution
          </div>
          <button
            className="btn btn-secondary"
            style={{ width: '100%' }}
            onClick={() =>
              navigate('/incidents/new', {
                state: {
                  prefill: {
                    title: 'Checkout service failing — connection errors',
                    service: 'Payment Service',
                    severity: 'high',
                    environment: 'production',
                    error_logs: 'ERROR [checkout-service] 503 Service Unavailable\nERROR Database connection refused: pool exhausted\nWARN Retrying payment processor connection...',
                    symptoms: 'Checkout failures, customers cannot complete purchases, DB errors in logs',
                  },
                },
              })
            }
          >
            Create Similar Incident (Step 5)
          </button>
        </div>
      </div>

      {/* Action row */}
      <div className="demo-actions-row">
        <button className="btn btn-primary btn-lg" onClick={handleStartDemo}>
          <svg viewBox="0 0 16 16" fill="currentColor"><polygon points="5 3 19 12 5 21"/></svg>
          Start Demo
        </button>
        <button className="btn btn-danger" onClick={() => setShowConfirm(true)}>
          <svg viewBox="0 0 16 16" fill="currentColor"><path d="M11 1.75V3h2.25a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1 0-1.5H5V1.75C5 .784 5.784 0 6.75 0h2.5C10.216 0 11 .784 11 1.75ZM4.496 6.675l.66 6.6a.25.25 0 0 0 .249.225h5.19a.25.25 0 0 0 .249-.225l.66-6.6a.75.75 0 0 1 1.492.149l-.66 6.6A1.748 1.748 0 0 1 10.595 15h-5.19a1.75 1.75 0 0 1-1.741-1.575l-.66-6.6a.75.75 0 1 1 1.492-.15ZM6.5 1.75V3h3V1.75a.25.25 0 0 0-.25-.25h-2.5a.25.25 0 0 0-.25.25Z"/></svg>
          Reset Demo Data
        </button>
      </div>

      {/* Confirm modal */}
      {showConfirm && (
        <ConfirmModal
          onConfirm={handleReset}
          onCancel={() => setShowConfirm(false)}
          resetting={resetting}
        />
      )}
    </>
  );
};
