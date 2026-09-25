import { useState, useEffect } from 'react';
import { architectureApi } from '../services/api';

const TYPE_COLORS = {
  frontend: 'var(--accent-cyan)',
  backend: 'var(--accent-purple)',
  api: 'var(--accent-blue)',
  service: 'var(--accent-green)',
  database: 'var(--accent-amber)',
  utility: 'var(--text-muted)',
  external: 'var(--accent-red)',
};

const TYPE_ICONS = {
  frontend: '🖥️',
  backend: '⚙️',
  api: '🔌',
  service: '🧩',
  database: '🗄️',
  utility: '🔧',
  external: '☁️',
};

export default function ArchitecturePage({ activeRepo }) {
  const [components, setComponents] = useState(null);
  const [rules, setRules] = useState([]);
  const [patterns, setPatterns] = useState([]);
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
      const [archData, rulesData] = await Promise.all([
        architectureApi.getComponents(activeRepo.id),
        architectureApi.getRules(activeRepo.id),
      ]);
      setComponents(archData.components || []);
      setPatterns(archData.patterns || []);
      setRules(rulesData || []);
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
          <div className="icon">🏗️</div>
          <h3>No Repository Selected</h3>
          <p>Load a repository from the Repository page to view its architecture.</p>
        </div>
      </div>
    );
  }

  // Group components by type
  const grouped = {};
  (components || []).forEach((c) => {
    const type = c.type || 'utility';
    if (!grouped[type]) grouped[type] = [];
    grouped[type].push(c);
  });

  const typeOrder = ['frontend', 'api', 'service', 'backend', 'database', 'external', 'utility'];

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Architecture View</h2>
        <p>Visual architecture of {activeRepo.analysis_result?.project_name || activeRepo.name}</p>
      </div>

      {loading && (
        <div className="loading-container"><div className="spinner" /><span>Loading architecture…</span></div>
      )}
      {error && <div className="card" style={{ borderColor: 'var(--accent-red)', marginBottom: 20 }}>
        <p style={{ color: 'var(--accent-red)', fontSize: 13 }}>{error}</p>
      </div>}

      {!loading && components && (
        <>
          {/* ── Architecture Diagram ─────────────────────────────── */}
          <div className="card fade-in" style={{ marginBottom: 28 }}>
            <div className="card-title" style={{ marginBottom: 20 }}>Architecture Components</div>
            <div className="arch-diagram">
              {typeOrder.map((type) => {
                const items = grouped[type];
                if (!items?.length) return null;
                return (
                  <div key={type}>
                    <div style={{
                      fontSize: 10, textTransform: 'uppercase', letterSpacing: 1,
                      color: TYPE_COLORS[type] || 'var(--text-muted)',
                      fontWeight: 600, textAlign: 'center', marginBottom: 8,
                    }}>
                      {TYPE_ICONS[type] || '📦'} {type} layer
                    </div>
                    <div className="arch-row">
                      {items.map((comp) => (
                        <div className="arch-node" key={comp.name}>
                          <div className="type-badge" style={{ color: TYPE_COLORS[comp.type] }}>
                            {comp.type}
                          </div>
                          <div className="name">{comp.name}</div>
                          {comp.path && (
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
                              {comp.path}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="arch-arrow" style={{ textAlign: 'center', padding: '4px 0' }}>↕</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Component Details ─────────────────────────────────── */}
          <div className="grid-2" style={{ marginBottom: 28 }}>
            {components.map((comp) => (
              <div className="card fade-in" key={comp.name}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <span style={{ fontSize: 20 }}>{TYPE_ICONS[comp.type] || '📦'}</span>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600 }}>{comp.name}</div>
                    <span className={`badge badge-info`} style={{ fontSize: 9, marginTop: 2 }}>
                      {comp.type}
                    </span>
                  </div>
                </div>
                {comp.description && (
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 10 }}>
                    {comp.description}
                  </p>
                )}
                {comp.files?.length > 0 && (
                  <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                    {comp.files.slice(0, 4).map((f) => (
                      <div key={f} style={{ padding: '2px 0' }}>📄 {f}</div>
                    ))}
                    {comp.files.length > 4 && (
                      <div style={{ color: 'var(--accent-blue)' }}>+{comp.files.length - 4} more</div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* ── Detected Patterns ─────────────────────────────────── */}
          {patterns.length > 0 && (
            <div className="card fade-in" style={{ marginBottom: 28 }}>
              <div className="card-title" style={{ marginBottom: 16 }}>Detected Patterns</div>
              {patterns.map((p, i) => (
                <div key={i} style={{
                  padding: '12px 0',
                  borderBottom: i < patterns.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>{p.name}</span>
                    <span style={{
                      fontSize: 12, fontWeight: 600,
                      color: p.confidence >= 0.9 ? 'var(--accent-green)' : 'var(--accent-amber)',
                    }}>
                      {Math.round(p.confidence * 100)}% confidence
                    </span>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{p.description}</p>
                </div>
              ))}
            </div>
          )}

          {/* ── Architecture Rules ─────────────────────────────────── */}
          <div className="card fade-in">
            <div className="card-title" style={{ marginBottom: 16 }}>Architecture Rules</div>
            {rules.length > 0 ? rules.map((r, i) => (
              <div key={r.id || i} style={{
                padding: '12px 0',
                borderBottom: i < rules.length - 1 ? '1px solid var(--border-subtle)' : 'none',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <span className={`badge badge-${r.severity?.toLowerCase()}`}>{r.severity}</span>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{r.rule}</span>
                </div>
                {r.description && (
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 70 }}>
                    {r.description}
                  </p>
                )}
              </div>
            )) : (
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                No architecture rules defined yet.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
