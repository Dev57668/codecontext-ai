import { useState, useEffect } from 'react';
import { guardrailsApi } from '../services/api';

export default function GuardrailsPage({ activeRepo }) {
  const [violations, setViolations] = useState([]);
  const [summary, setSummary] = useState(null);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!activeRepo?.id) return;
    loadData();
  }, [activeRepo?.id]);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [v, s] = await Promise.all([
        guardrailsApi.getViolations(activeRepo.id),
        guardrailsApi.getSummary(activeRepo.id),
      ]);
      setViolations(v);
      setSummary(s);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(violationId, newStatus) {
    try {
      await guardrailsApi.updateStatus(activeRepo.id, violationId, newStatus);
      await loadData();
    } catch (e) {
      setError(e.message);
    }
  }

  const filtered = filter === 'all'
    ? violations
    : violations.filter((v) => v.severity === filter);

  if (!activeRepo) {
    return (
      <div className="page-container">
        <div className="empty-state fade-in">
          <div className="icon">🛡️</div>
          <h3>No Repository Selected</h3>
          <p>Load a repository first to view guardrail violations.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Guardrails</h2>
        <p>Architecture rule violations detected in {activeRepo.analysis_result?.project_name || activeRepo.name}</p>
      </div>

      {loading && (
        <div className="loading-container"><div className="spinner" /><span>Loading violations…</span></div>
      )}
      {error && <div className="card" style={{ borderColor: 'var(--accent-red)', marginBottom: 20 }}>
        <p style={{ color: 'var(--accent-red)', fontSize: 13 }}>{error}</p>
      </div>}

      {!loading && (
        <>
          {/* ── Summary Cards ──────────────────────────────────── */}
          {summary && (
            <div className="grid-4" style={{ marginBottom: 28 }}>
              <div className="card fade-in">
                <div className="card-title">Total Violations</div>
                <div className="card-value">{summary.summary?.total || 0}</div>
              </div>
              <div className="card fade-in" style={{ borderColor: 'rgba(239, 68, 68, 0.3)' }}>
                <div className="card-title">High</div>
                <div className="card-value" style={{ color: 'var(--accent-red)' }}>
                  {summary.summary?.HIGH || 0}
                </div>
              </div>
              <div className="card fade-in" style={{ borderColor: 'rgba(245, 158, 11, 0.3)' }}>
                <div className="card-title">Medium</div>
                <div className="card-value" style={{ color: 'var(--accent-amber)' }}>
                  {summary.summary?.MEDIUM || 0}
                </div>
              </div>
              <div className="card fade-in" style={{ borderColor: 'rgba(16, 185, 129, 0.3)' }}>
                <div className="card-title">Low</div>
                <div className="card-value" style={{ color: 'var(--accent-green)' }}>
                  {summary.summary?.LOW || 0}
                </div>
              </div>
            </div>
          )}

          {/* ── Filter Tabs ───────────────────────────────────── */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            {['all', 'HIGH', 'MEDIUM', 'LOW'].map((f) => (
              <button
                key={f}
                className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setFilter(f)}
              >
                {f === 'all' ? 'All' : f}
              </button>
            ))}
          </div>

          {/* ── Violations List ────────────────────────────────── */}
          {filtered.length > 0 ? (
            filtered.map((v) => (
              <div
                className="card fade-in"
                key={v.id}
                style={{
                  marginBottom: 16,
                  borderLeftWidth: 3,
                  borderLeftColor: v.severity === 'HIGH' ? 'var(--accent-red)'
                    : v.severity === 'MEDIUM' ? 'var(--accent-amber)' : 'var(--accent-green)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <span className={`badge badge-${v.severity.toLowerCase()}`}>{v.severity}</span>
                  <span style={{ fontSize: 14, fontWeight: 600, flex: 1 }}>{v.rule}</span>
                  <span className={`badge ${v.status === 'open' ? 'badge-info' : 'badge-low'}`}>
                    {v.status}
                  </span>
                </div>

                <div style={{
                  fontSize: 12, fontFamily: 'var(--font-mono)',
                  color: 'var(--accent-cyan)', marginBottom: 10,
                  background: 'var(--bg-input)', padding: '6px 10px',
                  borderRadius: 'var(--radius-sm)', display: 'inline-block',
                }}>
                  📄 {v.file_path}{v.line_number ? `:${v.line_number}` : ''}
                </div>

                {v.explanation && (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>
                      EXPLANATION
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                      {v.explanation}
                    </p>
                  </div>
                )}

                {v.suggested_fix && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent-green)', marginBottom: 4 }}>
                      SUGGESTED FIX
                    </div>
                    <p style={{
                      fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6,
                      background: 'var(--accent-green-soft)', padding: '10px 14px',
                      borderRadius: 'var(--radius-sm)',
                    }}>
                      {v.suggested_fix}
                    </p>
                  </div>
                )}

                {v.status === 'open' && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() => handleStatusChange(v.id, 'resolved')}
                    >
                      ✅ Mark Resolved
                    </button>
                    <button
                      className="btn btn-sm btn-ghost"
                      onClick={() => handleStatusChange(v.id, 'ignored')}
                    >
                      ⏭️ Ignore
                    </button>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="empty-state fade-in">
              <div className="icon">✅</div>
              <h3>No Violations Found</h3>
              <p>
                {filter !== 'all'
                  ? `No ${filter} severity violations detected.`
                  : 'All architecture rules are satisfied.'}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
