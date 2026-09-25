import { useState, useRef } from 'react';
import { repositoryApi } from '../services/api';

export default function RepositoryPage({ activeRepo, setActiveRepo }) {
  const [mode, setMode] = useState('demo'); // demo | path | upload
  const [path, setPath] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const fileRef = useRef();

  const analysis = activeRepo?.analysis_result;

  async function handleLoadDemo() {
    setLoading(true);
    setError(null);
    try {
      const repo = await repositoryApi.loadDemo();
      setActiveRepo(repo);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAnalyzePath() {
    if (!path.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const repo = await repositoryApi.analyze(path.trim());
      setActiveRepo(repo);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const repo = await repositoryApi.upload(file);
      setActiveRepo(repo);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Repository Analyzer</h2>
        <p>Upload or point to a repository to analyze its architecture</p>
      </div>

      {/* ── Input Section ─────────────────────────────────────────── */}
      <div className="card fade-in" style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {['demo', 'path', 'upload'].map((m) => (
            <button
              key={m}
              className={`btn ${mode === m ? 'btn-primary' : 'btn-secondary'} btn-sm`}
              onClick={() => setMode(m)}
            >
              {m === 'demo' ? '🎯 Demo Repository' : m === 'path' ? '📂 Local Path' : '📤 Upload ZIP'}
            </button>
          ))}
        </div>

        {mode === 'demo' && (
          <div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
              Load the built-in <strong>ShopFlow Platform</strong> demo — a realistic eCommerce
              application with authentication, payment processing, and background jobs.
            </p>
            <button className="btn btn-primary" onClick={handleLoadDemo} disabled={loading}>
              {loading ? '⏳ Analyzing...' : '🚀 Load ShopFlow Demo'}
            </button>
          </div>
        )}

        {mode === 'path' && (
          <div>
            <div className="form-group">
              <label className="form-label">Repository Path</label>
              <input
                className="input"
                placeholder="e.g. C:\projects\my-app or /home/user/project"
                value={path}
                onChange={(e) => setPath(e.target.value)}
              />
            </div>
            <button className="btn btn-primary" onClick={handleAnalyzePath} disabled={loading || !path.trim()}>
              {loading ? '⏳ Scanning...' : '🔬 Analyze Repository'}
            </button>
          </div>
        )}

        {mode === 'upload' && (
          <div>
            <div className="form-group">
              <label className="form-label">ZIP File</label>
              <input
                ref={fileRef}
                type="file"
                accept=".zip"
                className="input"
                style={{ padding: '8px 12px' }}
              />
            </div>
            <button className="btn btn-primary" onClick={handleUpload} disabled={loading}>
              {loading ? '⏳ Uploading...' : '📤 Upload & Analyze'}
            </button>
          </div>
        )}

        {error && <p style={{ color: 'var(--accent-red)', marginTop: 12, fontSize: 13 }}>{error}</p>}
      </div>

      {/* ── Analysis Results ──────────────────────────────────────── */}
      {analysis && (
        <>
          <div className="card fade-in" style={{ marginBottom: 20 }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: 20,
            }}>
              <div>
                <h3 style={{ fontSize: 20, fontWeight: 700 }}>{analysis.project_name}</h3>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
                  {analysis.total_files} files &bull; {analysis.total_lines?.toLocaleString()} lines of code
                </p>
              </div>
              <div className="score-circle">{analysis.health_score}</div>
            </div>

            <div className="tags" style={{ marginBottom: 16 }}>
              {analysis.frameworks?.map((f) => (
                <span key={f} className="tag">⚙️ {f}</span>
              ))}
            </div>
          </div>

          <div className="grid-2" style={{ marginBottom: 20 }}>
            <div className="card fade-in">
              <div className="card-title" style={{ marginBottom: 14 }}>Languages</div>
              {analysis.languages?.map((l) => (
                <div key={l.name} style={{
                  display: 'flex', justifyContent: 'space-between',
                  padding: '6px 0', fontSize: 13,
                }}>
                  <span>{l.name}</span>
                  <span style={{ color: 'var(--text-muted)' }}>{l.percentage}% ({l.files} files)</span>
                </div>
              ))}
            </div>

            <div className="card fade-in">
              <div className="card-title" style={{ marginBottom: 14 }}>Dependencies</div>
              <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                {analysis.dependencies?.map((d, i) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between',
                    padding: '5px 0', fontSize: 12, borderBottom: '1px solid var(--border-subtle)',
                  }}>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>{d.name}</span>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {d.version && <span style={{ color: 'var(--text-muted)' }}>v{d.version}</span>}
                      <span className={`badge ${d.type === 'dev' ? 'badge-info' : 'badge-low'}`}
                            style={{ fontSize: 9, padding: '1px 6px' }}>
                        {d.type}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid-2">
            <div className="card fade-in">
              <div className="card-title" style={{ marginBottom: 14 }}>Important Files</div>
              <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                {analysis.important_files?.map((f, i) => (
                  <div key={i} style={{
                    padding: '4px 0', fontSize: 12, fontFamily: 'var(--font-mono)',
                    color: 'var(--text-secondary)',
                  }}>
                    📄 {f}
                  </div>
                ))}
              </div>
            </div>

            <div className="card fade-in">
              <div className="card-title" style={{ marginBottom: 14 }}>Directories</div>
              <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                {analysis.directories?.map((d, i) => (
                  <div key={i} style={{
                    padding: '4px 0', fontSize: 12, fontFamily: 'var(--font-mono)',
                    color: 'var(--text-secondary)',
                  }}>
                    📁 {d}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {!analysis && !loading && (
        <div className="empty-state fade-in">
          <div className="icon">📁</div>
          <h3>No Repository Loaded</h3>
          <p>Choose a method above to load and analyze a repository.</p>
        </div>
      )}
    </div>
  );
}
