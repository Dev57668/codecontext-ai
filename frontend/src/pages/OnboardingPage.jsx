import { useState } from 'react';
import { onboardingApi } from '../services/api';

const ROLES = ['backend', 'frontend', 'fullstack', 'devops', 'qa', 'data'];
const LEVELS = ['junior', 'mid', 'senior'];

export default function OnboardingPage({ activeRepo }) {
  const [form, setForm] = useState({
    developer_role: 'backend',
    skill_level: 'mid',
    known_technologies: '',
    team_area: '',
  });
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleGenerate(e) {
    e.preventDefault();
    if (!activeRepo?.id) return;
    setLoading(true);
    setError(null);
    try {
      const result = await onboardingApi.generate({
        repository_id: activeRepo.id,
        developer_role: form.developer_role,
        skill_level: form.skill_level,
        known_technologies: form.known_technologies
          ? form.known_technologies.split(',').map((t) => t.trim()).filter(Boolean)
          : [],
        team_area: form.team_area || undefined,
      });
      setPlan(result);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  if (!activeRepo) {
    return (
      <div className="page-container">
        <div className="empty-state fade-in">
          <div className="icon">🚀</div>
          <h3>No Repository Selected</h3>
          <p>Load a repository first to generate onboarding plans.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Developer Onboarding</h2>
        <p>Generate a personalized onboarding path based on the repository structure</p>
      </div>

      {/* ── Input Form ────────────────────────────────────────── */}
      <form className="card fade-in" style={{ marginBottom: 28 }} onSubmit={handleGenerate}>
        <div className="card-title" style={{ marginBottom: 16 }}>New Developer Profile</div>
        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">Developer Role</label>
            <select className="select" value={form.developer_role}
              onChange={(e) => setForm({ ...form, developer_role: e.target.value })}>
              {ROLES.map((r) => (
                <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Skill Level</label>
            <select className="select" value={form.skill_level}
              onChange={(e) => setForm({ ...form, skill_level: e.target.value })}>
              {LEVELS.map((l) => (
                <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Known Technologies (comma-separated)</label>
            <input className="input" value={form.known_technologies}
              onChange={(e) => setForm({ ...form, known_technologies: e.target.value })}
              placeholder="Python, React, PostgreSQL"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Team / Project Area (optional)</label>
            <input className="input" value={form.team_area}
              onChange={(e) => setForm({ ...form, team_area: e.target.value })}
              placeholder="e.g. Payments, Auth, Frontend"
            />
          </div>
        </div>

        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? '⏳ Generating Plan...' : '🚀 Generate Onboarding Plan'}
        </button>

        {error && <p style={{ color: 'var(--accent-red)', marginTop: 12, fontSize: 13 }}>{error}</p>}
      </form>

      {/* ── Generated Plan ────────────────────────────────────── */}
      {plan && (
        <>
          {/* Day-by-day timeline */}
          <div className="card fade-in" style={{ marginBottom: 24 }}>
            <div className="card-title" style={{ marginBottom: 20 }}>
              Onboarding Path — {plan.developer_role} ({plan.skill_level})
            </div>

            {plan.plan?.map((day, i) => (
              <div key={i} style={{
                padding: '20px 0',
                borderBottom: i < plan.plan.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                display: 'flex', gap: 20,
              }}>
                {/* Day badge */}
                <div style={{
                  width: 50, height: 50, borderRadius: '50%',
                  background: 'var(--gradient-brand)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 700, flexShrink: 0,
                }}>
                  D{day.day}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
                    {day.title}
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
                    {day.description} &bull; ~{day.estimated_hours}h
                  </p>

                  {day.paths?.length > 0 && (
                    <div style={{ marginBottom: 10 }}>
                      {day.paths.map((p, j) => (
                        <div key={j} style={{
                          fontSize: 12, fontFamily: 'var(--font-mono)',
                          color: 'var(--accent-cyan)', padding: '2px 0',
                        }}>
                          → {p}
                        </div>
                      ))}
                    </div>
                  )}

                  {day.tasks?.length > 0 && (
                    <div>
                      {day.tasks.map((t, j) => (
                        <div key={j} style={{
                          fontSize: 13, color: 'var(--text-secondary)', padding: '3px 0',
                          display: 'flex', gap: 8,
                        }}>
                          <span style={{ color: 'var(--text-muted)' }}>☐</span> {t}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="grid-2">
            {/* Recommended Files */}
            <div className="card fade-in">
              <div className="card-title" style={{ marginBottom: 14 }}>Recommended Files</div>
              {plan.recommended_files?.length > 0 ? plan.recommended_files.map((f, i) => (
                <div key={i} style={{
                  padding: '5px 0', fontSize: 12, fontFamily: 'var(--font-mono)',
                  color: 'var(--text-secondary)',
                }}>
                  📄 {f}
                </div>
              )) : (
                <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No specific files recommended</p>
              )}
            </div>

            {/* Starter Tasks */}
            <div className="card fade-in">
              <div className="card-title" style={{ marginBottom: 14 }}>Starter Tasks</div>
              {plan.starter_tasks?.length > 0 ? plan.starter_tasks.map((t, i) => (
                <div key={i} style={{
                  padding: '8px 0', fontSize: 13, color: 'var(--text-secondary)',
                  borderBottom: i < plan.starter_tasks.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                  display: 'flex', gap: 8,
                }}>
                  <span style={{ color: 'var(--accent-blue)', flexShrink: 0 }}>▸</span> {t}
                </div>
              )) : (
                <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No starter tasks generated</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
