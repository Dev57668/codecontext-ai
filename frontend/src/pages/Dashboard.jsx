import { useState, useEffect } from 'react';
import { repositoryApi, healthApi, guardrailsApi, decisionsApi } from '../services/api';

const WORKFLOW_STEPS = [
  { icon: '📁', label: 'Repository Upload' },
  { icon: '🔬', label: 'Context Extraction' },
  { icon: '🏗️', label: 'Architecture Analysis' },
  { icon: '🛡️', label: 'Guardrail Detection' },
  { icon: '📝', label: 'Decision Memory' },
  { icon: '🔍', label: 'PR Intelligence' },
  { icon: '🚀', label: 'Developer Guidance' },
];

export default function Dashboard({ activeRepo, setActiveRepo }) {
  const [health, setHealth] = useState(null);
  const [guardrailSummary, setGuardrailSummary] = useState(null);
  const [decisionsCount, setDecisionsCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [error, setError] = useState(null);

  const analysis = activeRepo?.analysis_result;

  useEffect(() => {
    if (!activeRepo?.id) return;
    loadDashboardData();
  }, [activeRepo?.id]);

  async function loadDashboardData() {
    setLoading(true);
    setError(null);
    try {
      const [h, g, d] = await Promise.all([
        healthApi.get(activeRepo.id),
        guardrailsApi.getSummary(activeRepo.id),
        decisionsApi.list(activeRepo.id),
      ]);
      setHealth(h);
      setGuardrailSummary(g);
      setDecisionsCount(d.length);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleLoadDemo() {
    setDemoLoading(true);
    setError(null);
    try {
      const repo = await repositoryApi.loadDemo();
      setActiveRepo(repo);
    } catch (e) {
      setError(e.message);
    } finally {
      setDemoLoading(false);
    }
  }

  // ── No repo loaded ────────────────────────────────────────────────
  if (!activeRepo) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h2>CodeContext AI</h2>
          <p>Turn your repository into institutional engineering memory</p>
        </div>

        <div className="card fade-in" style={{ textAlign: 'center', padding: '60px 40px' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚡</div>
          <h3 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
            Welcome to CodeContext AI
          </h3>
          <p style={{ color: 'var(--text-secondary)', maxWidth: 500, margin: '0 auto 28px', fontSize: 14 }}>
            Analyze a repository to generate architecture context, detect guardrail violations,
            track technical decisions, and power intelligent PR reviews.
          </p>
          <button className="btn btn-primary" onClick={handleLoadDemo} disabled={demoLoading}>
            {demoLoading ? '⏳ Loading Demo...' : '🚀 Load Demo Repository'}
          </button>
          {error && <p style={{ color: 'var(--accent-red)', marginTop: 12, fontSize: 13 }}>{error}</p>}
        </div>

        {/* AI Workflow Visualization */}
        <div style={{ marginTop: 40 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20, textAlign: 'center' }}>
            AI Development Workflow
          </h3>
          <div className="workflow-pipeline">
            {WORKFLOW_STEPS.map((step, i) => (
              <div key={step.label}>
                <div className="workflow-step fade-in" style={{ animationDelay: `${i * 0.06}s` }}>
                  <div className="step-icon">{step.icon}</div>
                  <span className="step-label">{step.label}</span>
                </div>
                {i < WORKFLOW_STEPS.length - 1 && <div className="workflow-connector" style={{ margin: '0 auto' }} />}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Dashboard with active repo ────────────────────────────────────
  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Dashboard</h2>
        <p>
          {analysis?.project_name || activeRepo.name} &mdash;{' '}
          {analysis?.total_files?.toLocaleString() || 0} files &bull;{' '}
          {analysis?.total_lines?.toLocaleString() || 0} lines
        </p>
      </div>

      {error && (
        <div className="card fade-in" style={{ borderColor: 'var(--accent-red)', marginBottom: 20 }}>
          <p style={{ color: 'var(--accent-red)', fontSize: 13 }}>{error}</p>
        </div>
      )}

      {loading ? (
        <div className="loading-container">
          <div className="spinner" />
          <span>Loading dashboard data…</span>
        </div>
      ) : (
        <>
          {/* ── Stat Cards ─────────────────────────────────────── */}
          <div className="grid-4" style={{ marginBottom: 28 }}>
            <div className="card fade-in fade-in-delay-1">
              <div className="card-title">Architecture Health</div>
              <div className="card-value" style={{ color: 'var(--accent-green)' }}>
                {health?.overall_score || analysis?.health_score || '—'}
              </div>
              <div className="health-bar">
                <div
                  className={`health-bar-fill ${(health?.overall_score || 70) >= 70 ? 'good' : (health?.overall_score || 70) >= 45 ? 'warning' : 'critical'}`}
                  style={{ width: `${health?.overall_score || analysis?.health_score || 70}%` }}
                />
              </div>
            </div>

            <div className="card fade-in fade-in-delay-2">
              <div className="card-title">Detected Patterns</div>
              <div className="card-value" style={{ color: 'var(--accent-blue)' }}>
                {analysis?.detected_patterns?.length || 0}
              </div>
              <div className="card-subtitle">
                {analysis?.frameworks?.slice(0, 3).join(', ') || 'No frameworks detected'}
              </div>
            </div>

            <div className="card fade-in fade-in-delay-3">
              <div className="card-title">Guardrail Violations</div>
              <div className="card-value" style={{ color: 'var(--accent-red)' }}>
                {guardrailSummary?.summary?.total || 0}
              </div>
              <div className="card-subtitle">
                {guardrailSummary?.summary?.HIGH || 0} high &bull;{' '}
                {guardrailSummary?.summary?.MEDIUM || 0} medium
              </div>
            </div>

            <div className="card fade-in fade-in-delay-4">
              <div className="card-title">Technical Decisions</div>
              <div className="card-value" style={{ color: 'var(--accent-purple)' }}>
                {decisionsCount}
              </div>
              <div className="card-subtitle">Active architecture decisions</div>
            </div>
          </div>

          {/* ── Health Metrics ─────────────────────────────────── */}
          {health?.metrics && (
            <div className="card fade-in" style={{ marginBottom: 28 }}>
              <div className="card-title" style={{ marginBottom: 20 }}>Repository Health Metrics</div>
              <div className="grid-3">
                {health.metrics.map((m) => (
                  <div key={m.name} style={{ padding: '12px 0' }}>
                    <div style={{
                      display: 'flex', justifyContent: 'space-between',
                      fontSize: 13, fontWeight: 600, marginBottom: 4,
                    }}>
                      <span>{m.name}</span>
                      <span style={{
                        color: m.status === 'good' ? 'var(--accent-green)' :
                               m.status === 'warning' ? 'var(--accent-amber)' : 'var(--accent-red)',
                      }}>
                        {m.score}/{m.max_score}
                      </span>
                    </div>
                    <div className="health-bar">
                      <div
                        className={`health-bar-fill ${m.status}`}
                        style={{ width: `${(m.score / m.max_score) * 100}%` }}
                      />
                    </div>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                      {m.details}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Languages & Risks ─────────────────────────────── */}
          <div className="grid-2">
            <div className="card fade-in">
              <div className="card-title" style={{ marginBottom: 16 }}>Languages</div>
              {analysis?.languages?.map((l) => (
                <div key={l.name} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 0', borderBottom: '1px solid var(--border-subtle)',
                }}>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{l.name}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{l.files} files</span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{l.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="card fade-in">
              <div className="card-title" style={{ marginBottom: 16 }}>Potential Risks</div>
              {analysis?.potential_risks?.length ? analysis.potential_risks.map((r, i) => (
                <div key={i} style={{
                  padding: '10px 0',
                  borderBottom: i < analysis.potential_risks.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span className={`badge badge-${r.severity.toLowerCase()}`}>{r.severity}</span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{r.name}</span>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.description}</p>
                </div>
              )) : (
                <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No risks detected</p>
              )}
            </div>
          </div>

          {/* ── AI Workflow ────────────────────────────────────── */}
          <div className="card fade-in" style={{ marginTop: 28 }}>
            <div className="card-title" style={{ marginBottom: 16, textAlign: 'center' }}>
              AI Development Workflow
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexWrap: 'wrap', gap: 8, padding: '16px 0',
            }}>
              {WORKFLOW_STEPS.map((step, i) => (
                <div key={step.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    background: 'var(--bg-input)', border: '1px solid var(--border-primary)',
                    borderRadius: 'var(--radius-md)', padding: '8px 16px',
                    display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 500,
                  }}>
                    <span>{step.icon}</span>
                    <span>{step.label}</span>
                  </div>
                  {i < WORKFLOW_STEPS.length - 1 && (
                    <span style={{ color: 'var(--text-muted)', fontSize: 16 }}>→</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
