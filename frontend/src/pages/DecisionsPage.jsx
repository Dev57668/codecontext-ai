import { useState, useEffect } from 'react';
import { decisionsApi } from '../services/api';

export default function DecisionsPage({ activeRepo }) {
  const [decisions, setDecisions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showExtract, setShowExtract] = useState(false);
  const [extractText, setExtractText] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [expanded, setExpanded] = useState(null);

  // Form state
  const [form, setForm] = useState({
    title: '', context: '', problem: '', chosen_approach: '',
    alternatives: '', reasoning: '', affected_components: '',
  });

  useEffect(() => {
    if (!activeRepo?.id) return;
    loadDecisions();
  }, [activeRepo?.id]);

  async function loadDecisions() {
    setLoading(true);
    setError(null);
    try {
      const data = await decisionsApi.list(activeRepo.id);
      setDecisions(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    setError(null);
    try {
      await decisionsApi.create(activeRepo.id, {
        ...form,
        alternatives: form.alternatives ? form.alternatives.split('\n').filter(Boolean) : [],
        affected_components: form.affected_components ? form.affected_components.split('\n').filter(Boolean) : [],
      });
      setShowForm(false);
      setForm({ title: '', context: '', problem: '', chosen_approach: '', alternatives: '', reasoning: '', affected_components: '' });
      await loadDecisions();
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleExtract() {
    if (!extractText.trim()) return;
    setExtracting(true);
    setError(null);
    try {
      await decisionsApi.extract(activeRepo.id, extractText);
      setShowExtract(false);
      setExtractText('');
      await loadDecisions();
    } catch (e) {
      setError(e.message);
    } finally {
      setExtracting(false);
    }
  }

  if (!activeRepo) {
    return (
      <div className="page-container">
        <div className="empty-state fade-in">
          <div className="icon">📝</div>
          <h3>No Repository Selected</h3>
          <p>Load a repository first to manage technical decisions.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2>Decision Memory</h2>
          <p>Technical decisions and architectural choices for {activeRepo.analysis_result?.project_name || activeRepo.name}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => { setShowExtract(!showExtract); setShowForm(false); }}>
            🤖 Extract from Text
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => { setShowForm(!showForm); setShowExtract(false); }}>
            ➕ New Decision
          </button>
        </div>
      </div>

      {error && <div className="card" style={{ borderColor: 'var(--accent-red)', marginBottom: 20 }}>
        <p style={{ color: 'var(--accent-red)', fontSize: 13 }}>{error}</p>
      </div>}

      {/* ── Extract Form ──────────────────────────────────────── */}
      {showExtract && (
        <div className="card fade-in" style={{ marginBottom: 24 }}>
          <div className="card-title" style={{ marginBottom: 12 }}>Extract Decision from Text</div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
            Paste a commit message, PR description, meeting notes, or discussion thread.
            The system will extract a structured technical decision.
          </p>
          <div className="form-group">
            <textarea
              className="textarea"
              rows={8}
              placeholder={"Example:\n\nDecision: Use JWT for authentication\nContext: We need stateless auth across multiple services\nProblem: Session-based auth requires sticky sessions\nApproach: JWT with 15-minute access tokens\nAlternatives:\n- Session cookies with Redis\n- OAuth via Auth0\nReason: Simpler to implement and the team has prior experience"}
              value={extractText}
              onChange={(e) => setExtractText(e.target.value)}
            />
          </div>
          <button className="btn btn-primary" onClick={handleExtract} disabled={extracting || !extractText.trim()}>
            {extracting ? '⏳ Extracting...' : '🤖 Extract Decision'}
          </button>
        </div>
      )}

      {/* ── Create Form ───────────────────────────────────────── */}
      {showForm && (
        <form className="card fade-in" style={{ marginBottom: 24 }} onSubmit={handleCreate}>
          <div className="card-title" style={{ marginBottom: 16 }}>Create Technical Decision</div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Decision Title *</label>
              <input className="input" required value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Use JWT for Authentication"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Problem</label>
              <input className="input" value={form.problem}
                onChange={(e) => setForm({ ...form, problem: e.target.value })}
                placeholder="What problem does this solve?"
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Context</label>
            <textarea className="textarea" rows={3} value={form.context}
              onChange={(e) => setForm({ ...form, context: e.target.value })}
              placeholder="Background and context for this decision"
              style={{ fontFamily: 'var(--font-sans)' }}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Chosen Approach</label>
            <textarea className="textarea" rows={3} value={form.chosen_approach}
              onChange={(e) => setForm({ ...form, chosen_approach: e.target.value })}
              placeholder="What approach was chosen and why"
              style={{ fontFamily: 'var(--font-sans)' }}
            />
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Alternatives (one per line)</label>
              <textarea className="textarea" rows={3} value={form.alternatives}
                onChange={(e) => setForm({ ...form, alternatives: e.target.value })}
                placeholder={"Session cookies\nOAuth via Auth0\nAPI keys"}
                style={{ fontFamily: 'var(--font-sans)' }}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Affected Components (one per line)</label>
              <textarea className="textarea" rows={3} value={form.affected_components}
                onChange={(e) => setForm({ ...form, affected_components: e.target.value })}
                placeholder={"src/auth/jwt_handler.py\nsrc/auth/middleware.py"}
                style={{ fontFamily: 'var(--font-sans)' }}
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Reasoning</label>
            <textarea className="textarea" rows={3} value={form.reasoning}
              onChange={(e) => setForm({ ...form, reasoning: e.target.value })}
              placeholder="Why this approach was chosen over alternatives"
              style={{ fontFamily: 'var(--font-sans)' }}
            />
          </div>
          <button className="btn btn-primary" type="submit">💾 Save Decision</button>
        </form>
      )}

      {/* ── Decisions List ─────────────────────────────────────── */}
      {loading ? (
        <div className="loading-container"><div className="spinner" /><span>Loading decisions…</span></div>
      ) : decisions.length > 0 ? (
        decisions.map((d) => (
          <div
            className="card fade-in"
            key={d.id}
            style={{ marginBottom: 16, cursor: 'pointer' }}
            onClick={() => setExpanded(expanded === d.id ? null : d.id)}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 20 }}>📝</span>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>{d.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    {new Date(d.decision_date).toLocaleDateString()} &bull;{' '}
                    <span className="badge badge-info" style={{ fontSize: 9, padding: '1px 6px' }}>{d.status}</span>
                  </div>
                </div>
              </div>
              <span style={{ color: 'var(--text-muted)' }}>{expanded === d.id ? '▲' : '▼'}</span>
            </div>

            {expanded === d.id && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border-subtle)' }}>
                {d.context && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>CONTEXT</div>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{d.context}</p>
                  </div>
                )}
                {d.problem && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>PROBLEM</div>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{d.problem}</p>
                  </div>
                )}
                {d.chosen_approach && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent-green)', marginBottom: 4 }}>CHOSEN APPROACH</div>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{d.chosen_approach}</p>
                  </div>
                )}
                {d.alternatives?.length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>ALTERNATIVES CONSIDERED</div>
                    {d.alternatives.map((a, i) => (
                      <div key={i} style={{ fontSize: 13, color: 'var(--text-muted)', padding: '3px 0' }}>• {a}</div>
                    ))}
                  </div>
                )}
                {d.reasoning && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>REASONING</div>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{d.reasoning}</p>
                  </div>
                )}
                {d.affected_components?.length > 0 && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>AFFECTED COMPONENTS</div>
                    <div className="tags">
                      {d.affected_components.map((c, i) => (
                        <span key={i} className="tag">{c}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))
      ) : (
        <div className="empty-state fade-in">
          <div className="icon">📝</div>
          <h3>No Decisions Yet</h3>
          <p>Create your first technical decision or extract one from text.</p>
        </div>
      )}
    </div>
  );
}
