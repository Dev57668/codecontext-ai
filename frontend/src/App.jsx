import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Dashboard from './pages/Dashboard';
import RepositoryPage from './pages/RepositoryPage';
import ArchitecturePage from './pages/ArchitecturePage';
import GuardrailsPage from './pages/GuardrailsPage';
import PRReviewPage from './pages/PRReviewPage';
import DecisionsPage from './pages/DecisionsPage';
import OnboardingPage from './pages/OnboardingPage';
import './index.css';

const NAV_ITEMS = [
  { to: '/dashboard', icon: '📊', label: 'Dashboard' },
  { to: '/repository', icon: '📁', label: 'Repository' },
  { to: '/architecture', icon: '🏗️', label: 'Architecture' },
  { to: '/guardrails', icon: '🛡️', label: 'Guardrails' },
  { to: '/pr-review', icon: '🔍', label: 'PR Intelligence' },
  { to: '/decisions', icon: '📝', label: 'Decision Memory' },
  { to: '/onboarding', icon: '🚀', label: 'Onboarding' },
];

export default function App() {
  const [activeRepo, setActiveRepo] = useState(null);

  // persist active repo in localStorage
  useEffect(() => {
    const saved = localStorage.getItem('codecontext_active_repo');
    if (saved) {
      try { setActiveRepo(JSON.parse(saved)); } catch { /* ignore */ }
    }
  }, []);

  useEffect(() => {
    if (activeRepo) {
      localStorage.setItem('codecontext_active_repo', JSON.stringify(activeRepo));
    }
  }, [activeRepo]);

  return (
    <BrowserRouter>
      <div className="app-layout">
        {/* ── Sidebar ─────────────────────────────────────────────── */}
        <nav className="sidebar">
          <div className="sidebar-brand">
            <h1>⚡ CodeContext AI</h1>
            <p>Codebase Intelligence</p>
          </div>

          <div className="sidebar-nav">
            <div className="sidebar-section-label">Navigation</div>
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `sidebar-link${isActive ? ' active' : ''}`
                }
              >
                <span className="icon">{item.icon}</span>
                {item.label}
              </NavLink>
            ))}

            {activeRepo && (
              <>
                <div className="sidebar-section-label">Active Repository</div>
                <div style={{
                  padding: '10px 14px',
                  fontSize: '12px',
                  color: 'var(--accent-green)',
                  background: 'var(--accent-green-soft)',
                  borderRadius: 'var(--radius-md)',
                  fontWeight: 600,
                }}>
                  ● {activeRepo.name}
                </div>
              </>
            )}
          </div>

          <div style={{
            padding: '16px 14px',
            borderTop: '1px solid var(--border-primary)',
            fontSize: '11px',
            color: 'var(--text-muted)',
          }}>
            IBM BOB 2.0 Hackathon
          </div>
        </nav>

        {/* ── Main Content ────────────────────────────────────────── */}
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard activeRepo={activeRepo} setActiveRepo={setActiveRepo} />} />
            <Route path="/repository" element={<RepositoryPage activeRepo={activeRepo} setActiveRepo={setActiveRepo} />} />
            <Route path="/architecture" element={<ArchitecturePage activeRepo={activeRepo} />} />
            <Route path="/guardrails" element={<GuardrailsPage activeRepo={activeRepo} />} />
            <Route path="/pr-review" element={<PRReviewPage activeRepo={activeRepo} />} />
            <Route path="/decisions" element={<DecisionsPage activeRepo={activeRepo} />} />
            <Route path="/onboarding" element={<OnboardingPage activeRepo={activeRepo} />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
