import { useState } from 'react';
import { prApi } from '../services/api';

function DiffDisplay({ diff }) {
  if (!diff) return null;
  const lines = diff.split('\n');
  return (
    <div className="diff-display">
      {lines.map((line, i) => {
        let cls = 'line-context';
        if (line.startsWith('+') && !line.startsWith('+++')) cls = 'line-added';
        else if (line.startsWith('-') && !line.startsWith('---')) cls = 'line-removed';
        else if (line.startsWith('@@')) cls = 'line-header';
        else if (line.startsWith('diff') || line.startsWith('index')) cls = 'line-header';
        return <div key={i} className={cls}>{line}</div>;
      })}
    </div>
  );
}

export default function PRReviewPage({ activeRepo }) {
  const [diff, setDiff] = useState('');
  const [title, setTitle] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleAnalyze() {
    if (!diff.trim() || !activeRepo?.id) return;
    setLoading(true);
    setError(null);
    setAnalysis(null);
    try {
      const result = await prApi.analyze({
        repository_id: activeRepo.id,
        pr_title: title || undefined,
        diff_content: diff,
      });
      setAnalysis(result);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleLoadDemo() {
    setLoading(true);
    setError(null);
    try {
      const demoData = await prApi.getDemo();
      setDiff(demoData.diff);
      setTitle('feat: Add checkout endpoint with Stripe payment');
      setAnalysis({
        ...demoData.analysis,
        id: 'demo',
        repository_id: activeRepo?.id,
        created_at: new Date().toISOString(),
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const riskColor = (level) => {
    if (level === 'CRITICAL') return 'var(--accent-red)';
    if (level === 'HIGH') return '#f97316';
    if (level === 'MEDIUM') return 'var(--accent-amber)';
    return 'var(--accent-green)';
  };

  if (!activeRepo) {
    return (
      <div className="page-container">
        <div className="empty-state fade-in">
          <div className="icon">🔍</div>
          <h3>No Repository Selected</h3>
          <p>Load a repository first to analyze PR diffs against its architecture.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>PR Intelligence</h2>
        <p>Analyze code changes against architecture rules and conventions</p>
      </div>

      {/* ── Input ─────────────────────────────────────────────── */}
      <div className="card fade-in" style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button className="btn btn-primary btn-sm" onClick={handleLoadDemo}>
            🎯 Load Demo PR (problematic checkout)
          </button>
        </div>

        <div className="form-group">
          <label className="form-label">PR Title (optional)</label>
          <input
            className="input"
            placeholder="feat: Add checkout endpoint"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Paste Unified Diff</label>
          <textarea
            className="textarea"
            rows={12}
            placeholder="Paste your git diff output here..."
            value={diff}
            onChange={(e) => setDiff(e.target.value)}
          />
        </div>

        <button className="btn btn-primary" onClick={handleAnalyze} disabled={loading || !diff.trim()}>
          {loading ? '⏳ Analyzing...' : '🔍 Analyze PR'}
        </button>

        {error && <p style={{ color: 'var(--accent-red)', marginTop: 12, fontSize: 13 }}>{error}</p>}
      </div>

      {/* ── Analysis Results ──────────────────────────────────── */}
      {analysis && (
        <>
          {/* Risk Score */}
          <div className="card fade-in" style={{
            marginBottom: 24, textAlign: 'center', padding: '32px 24px',
            borderColor: riskColor(analysis.risk_level),
          }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>
              PR RISK SCORE
            </div>
            <div style={{
              fontSize: 56, fontWeight: 800, color: riskColor(analysis.risk_level),
              letterSpacing: -2,
            }}>
              {analysis.risk_score}
            </div>
            <span className={`badge badge-${analysis.risk_level?.toLowerCase()}`} style={{ fontSize: 13, padding: '4px 14px' }}>
              {analysis.risk_level}
            </span>
          </div>

          <div className="grid-2" style={{ marginBottom: 24 }}>
            {/* Changed Components */}
            <div className="card fade-in">
              <div className="card-title" style={{ marginBottom: 14 }}>Changed Components</div>
              {analysis.changed_components?.map((c, i) => (
                <div key={i} style={{
                  padding: '6px 0', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <span style={{ color: 'var(--accent-blue)' }}>●</span> {c}
                </div>
              ))}
            </div>

            {/* Violations */}
            <div className="card fade-in">
              <div className="card-title" style={{ marginBottom: 14 }}>
                Violations ({analysis.violations?.length || 0})
              </div>
              {analysis.violations?.map((v, i) => (
                <div key={i} style={{
                  padding: '8px 0',
                  borderBottom: i < analysis.violations.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span className={`badge badge-${v.severity?.toLowerCase()}`}>{v.severity}</span>
                    <span style={{ fontSize: 12, fontWeight: 600 }}>{v.rule}</span>
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{v.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Reviewer Questions */}
          <div className="card fade-in" style={{ marginBottom: 24 }}>
            <div className="card-title" style={{ marginBottom: 14 }}>
              Likely Reviewer Questions ({analysis.reviewer_questions?.length || 0})
            </div>
            {analysis.reviewer_questions?.map((q, i) => (
              <div key={i} style={{
                padding: '8px 0', fontSize: 13, color: 'var(--text-secondary)',
                borderBottom: i < analysis.reviewer_questions.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                display: 'flex', gap: 10,
              }}>
                <span style={{ color: 'var(--accent-amber)', flexShrink: 0 }}>❓</span>
                {q}
              </div>
            ))}
          </div>

          <div className="grid-2" style={{ marginBottom: 24 }}>
            {/* Suggested Fixes */}
            <div className="card fade-in">
              <div className="card-title" style={{ marginBottom: 14 }}>Suggested Fixes</div>
              {analysis.suggested_fixes?.map((f, i) => (
                <div key={i} style={{
                  padding: '8px 0', fontSize: 13, color: 'var(--text-secondary)',
                  borderBottom: i < analysis.suggested_fixes.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                  display: 'flex', gap: 10,
                }}>
                  <span style={{ color: 'var(--accent-green)', flexShrink: 0 }}>✅</span>
                  {f}
                </div>
              ))}
            </div>

            {/* Tests to Add */}
            <div className="card fade-in">
              <div className="card-title" style={{ marginBottom: 14 }}>Tests That Should Be Added</div>
              {analysis.tests_to_add?.map((t, i) => (
                <div key={i} style={{
                  padding: '8px 0', fontSize: 12, fontFamily: 'var(--font-mono)',
                  color: 'var(--text-secondary)',
                  borderBottom: i < analysis.tests_to_add.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                }}>
                  🧪 {t}
                </div>
              ))}
            </div>
          </div>

          {/* Diff Preview */}
          {diff && (
            <div className="card fade-in">
              <div className="card-title" style={{ marginBottom: 14 }}>Diff Preview</div>
              <DiffDisplay diff={diff} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
