import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import RepositoryPage from './pages/RepositoryPage';
import ArchitecturePage from './pages/ArchitecturePage';
import GuardrailsPage from './pages/GuardrailsPage';
import PRReviewPage from './pages/PRReviewPage';
import DecisionsPage from './pages/DecisionsPage';
import OnboardingPage from './pages/OnboardingPage';

import {
  IconDashboard,
  IconRepository,
  IconArchitecture,
  IconGuardrails,
  IconPRReview,
  IconDecisions,
  IconOnboarding,
  IconZap,
} from './components/Icons';
import { TopHeader } from './components/TopHeader';
import { TourModal } from './components/TourModal';
import { ToastProvider, useToast } from './components/Toast';
import { MonoLoader } from './components/MonoLoader';
import { MonoCursor } from './components/MonoCursor';
import { useScrollReveal } from './hooks/useScrollReveal';
import { repositoryApi } from './services/api';
import './index.css';

const NAV_ITEMS = [
  { to: '/dashboard', Icon: IconDashboard, label: 'Dashboard' },
  { to: '/repository', Icon: IconRepository, label: 'Repository' },
  { to: '/architecture', Icon: IconArchitecture, label: 'Architecture' },
  { to: '/guardrails', Icon: IconGuardrails, label: 'Guardrails' },
  { to: '/pr-review', Icon: IconPRReview, label: 'PR Intelligence' },
  { to: '/decisions', Icon: IconDecisions, label: 'Decision Memory' },
  { to: '/onboarding', Icon: IconOnboarding, label: 'Onboarding' },
];

function AppContent() {
  const [activeRepo, setActiveRepo] = useState(() => {
    try {
      const saved = localStorage.getItem('codecontext_active_repo');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [tourOpen, setTourOpen] = useState(false);
  const [loadingDemo, setLoadingDemo] = useState(false);
  const [isWorkspaceRevealed, setIsWorkspaceRevealed] = useState(() => {
    try {
      return !!sessionStorage.getItem('codecontext_loader_shown');
    } catch {
      return true;
    }
  });

  const location = useLocation();
  const { showToast } = useToast();

  // Activate scroll-driven reveal system across routes
  useScrollReveal();

  useEffect(() => {
    if (activeRepo) {
      localStorage.setItem('codecontext_active_repo', JSON.stringify(activeRepo));
    }
  }, [activeRepo]);

  // Global demo loader handler
  const handleLoadDemo = useCallback(async () => {
    setLoadingDemo(true);
    try {
      const repo = await repositoryApi.loadDemo();
      setActiveRepo(repo);
      showToast('ShopFlow Platform demo loaded successfully!', 'success');
    } catch (e) {
      showToast(e.message || 'Failed to load demo repository', 'error');
    } finally {
      setLoadingDemo(false);
    }
  }, [showToast]);

  const handleWorkspaceReveal = useCallback(() => {
    setIsWorkspaceRevealed(true);
  }, []);

  return (
    <div className={`app-layout ${isWorkspaceRevealed ? 'workspace-ready' : 'workspace-entering'}`}>
      {/* ── Monochrome Intro Reveal & Custom Morphing Cursor ─────── */}
      <MonoLoader onWorkspaceReveal={handleWorkspaceReveal} />
      <MonoCursor />

      {/* ── Global Sidebar ────────────────────────────────────────── */}
      <nav className="sidebar" aria-label="Main Navigation">
        <div className="sidebar-brand">
          <div className="sidebar-logo-icon">
            <IconZap size={18} />
          </div>
          <div className="sidebar-brand-text">
            <h1>CodeContext AI</h1>
            <p>Codebase Intelligence</p>
          </div>
        </div>

        <div className="sidebar-nav">
          <div className="sidebar-section-label">Platform Navigation</div>
          {NAV_ITEMS.map(({ to, Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
            >
              <span className="icon">
                <Icon size={17} />
              </span>
              <span>{label}</span>
            </NavLink>
          ))}
        </div>

        <div className="sidebar-footer">
          <div className="sidebar-footer-badge">
            <span>BOB 2.0 AI Hackathon</span>
            <span className="hackathon-chip">IBM</span>
          </div>
        </div>
      </nav>

      {/* ── Main Content Area ─────────────────────────────────────── */}
      <div className="main-content">
        {/* Top Header with Repository Context and Quick Actions */}
        <TopHeader
          activeRepo={activeRepo}
          onLoadDemo={handleLoadDemo}
          loadingDemo={loadingDemo}
          onOpenTour={() => setTourOpen(true)}
        />

        {/* Page Content Outlet with Smooth Blur-to-Sharp Page Transition */}
        <div key={location.pathname} className="page-transition-container">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route
              path="/dashboard"
              element={<Dashboard activeRepo={activeRepo} setActiveRepo={setActiveRepo} />}
            />
            <Route
              path="/repository"
              element={<RepositoryPage activeRepo={activeRepo} setActiveRepo={setActiveRepo} />}
            />
            <Route
              path="/architecture"
              element={<ArchitecturePage activeRepo={activeRepo} setActiveRepo={setActiveRepo} onLoadDemo={handleLoadDemo} />}
            />
            <Route
              path="/guardrails"
              element={<GuardrailsPage activeRepo={activeRepo} setActiveRepo={setActiveRepo} onLoadDemo={handleLoadDemo} />}
            />
            <Route
              path="/pr-review"
              element={<PRReviewPage activeRepo={activeRepo} setActiveRepo={setActiveRepo} onLoadDemo={handleLoadDemo} />}
            />
            <Route
              path="/decisions"
              element={<DecisionsPage activeRepo={activeRepo} setActiveRepo={setActiveRepo} onLoadDemo={handleLoadDemo} />}
            />
            <Route
              path="/onboarding"
              element={<OnboardingPage activeRepo={activeRepo} setActiveRepo={setActiveRepo} onLoadDemo={handleLoadDemo} />}
            />
          </Routes>
        </div>
      </div>

      {/* ── IBM Bob 2.0 Guided Hackathon Demo Tour Modal ───────────── */}
      <TourModal
        isOpen={tourOpen}
        onClose={() => setTourOpen(false)}
        activeRepo={activeRepo}
        onLoadDemo={handleLoadDemo}
        loadingDemo={loadingDemo}
      />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </BrowserRouter>
  );
}
