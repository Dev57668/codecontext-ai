import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  IconRepository,
  IconChevronDown,
  IconSparkles,
  IconPlay,
  IconLayers,
} from './Icons';

export function TopHeader({ activeRepo, onLoadDemo, loadingDemo, onOpenTour }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [apiOnline, setApiOnline] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Scroll detection for header boundary depth
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 8);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Quick check on backend ping
  useEffect(() => {
    fetch('http://localhost:8000/api/status')
      .then((res) => {
        if (res.ok) setApiOnline(true);
      })
      .catch(() => setApiOnline(false));
  }, [location.pathname]);

  const analysis = activeRepo?.analysis_result;
  const healthScore = analysis?.health_score || 71;

  const getScoreColorClass = (score) => {
    if (score >= 70) return 'health-good';
    if (score >= 45) return 'health-warning';
    return 'health-critical';
  };

  return (
    <header className={`top-header ${scrolled ? 'is-scrolled' : ''}`}>
      <div className="top-header-left">
        {/* Active Repository Pill & Selector */}
        <div className="repo-selector-container" ref={dropdownRef}>
          <button
            className={`repo-selector-btn ${activeRepo ? 'active' : 'unselected'}`}
            onClick={() => setDropdownOpen(!dropdownOpen)}
            aria-expanded={dropdownOpen}
          >
            <div className="repo-btn-icon">
              <IconRepository size={16} />
            </div>
            <div className="repo-btn-info">
              <span className="repo-label">WORKSPACE / REPOSITORY</span>
              <span className="repo-name">
                {activeRepo ? (analysis?.project_name || activeRepo.name) : 'No Repository Selected'}
              </span>
            </div>
            <IconChevronDown size={14} className={`dropdown-chevron ${dropdownOpen ? 'open' : ''}`} />
          </button>

          {dropdownOpen && (
            <div className="repo-dropdown-menu fade-in">
              <div className="repo-dropdown-header">
                <span className="dropdown-title">Repository Context</span>
                <span className="dropdown-status-tag">
                  {activeRepo ? 'READY' : 'NONE'}
                </span>
              </div>

              {activeRepo ? (
                <div className="repo-dropdown-body">
                  <div className="dropdown-repo-details">
                    <div className="detail-row">
                      <span className="detail-key">Files Analyzed:</span>
                      <span className="detail-val">{analysis?.total_files || 83}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-key">Lines of Code:</span>
                      <span className="detail-val">{analysis?.total_lines?.toLocaleString() || '12,847'}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-key">Frameworks:</span>
                      <span className="detail-val">{analysis?.frameworks?.slice(0, 3).join(', ') || 'FastAPI, React'}</span>
                    </div>
                  </div>

                  <div className="dropdown-divider" />

                  <button
                    className="dropdown-action-item"
                    onClick={() => {
                      setDropdownOpen(false);
                      navigate('/repository');
                    }}
                  >
                    <IconLayers size={14} />
                    <span>Manage / Ingest Repositories</span>
                  </button>

                  <button
                    className="dropdown-action-item"
                    onClick={() => {
                      setDropdownOpen(false);
                      onLoadDemo();
                    }}
                    disabled={loadingDemo}
                  >
                    <IconPlay size={14} />
                    <span>{loadingDemo ? 'Reloading Demo...' : 'Reload ShopFlow Demo'}</span>
                  </button>
                </div>
              ) : (
                <div className="repo-dropdown-body">
                  <p className="dropdown-empty-text">
                    Select or load a repository to generate architecture models and enable guardrails.
                  </p>
                  <button
                    className="btn btn-primary btn-sm dropdown-cta-btn"
                    onClick={() => {
                      setDropdownOpen(false);
                      onLoadDemo();
                    }}
                    disabled={loadingDemo}
                  >
                    <IconPlay size={14} />
                    <span>{loadingDemo ? 'Loading Demo...' : 'Load ShopFlow Demo'}</span>
                  </button>
                  <button
                    className="btn btn-secondary btn-sm dropdown-cta-btn"
                    style={{ marginTop: 6 }}
                    onClick={() => {
                      setDropdownOpen(false);
                      navigate('/repository');
                    }}
                  >
                    <IconLayers size={14} />
                    <span>Analyze Local Directory</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Health Score Pill (if repo loaded) */}
        {activeRepo && (
          <div
            className={`top-health-pill ${getScoreColorClass(healthScore)}`}
            onClick={() => navigate('/dashboard')}
            title="Click to view detailed Health Dashboard"
          >
            <div className="health-dot" />
            <span className="health-label">Architecture Health:</span>
            <span className="health-score">{healthScore}/100</span>
          </div>
        )}
      </div>

      <div className="top-header-right">
        {/* Backend Status indicator */}
        <div className="backend-status-pill" title={apiOnline ? 'FastAPI Backend Online' : 'FastAPI Backend Offline'}>
          <span className={`status-indicator-dot ${apiOnline ? 'online' : 'offline'}`} />
          <span className="backend-status-text">{apiOnline ? 'API 8000 Online' : 'API Offline'}</span>
        </div>

        {/* Demo Tour Trigger for IBM Bob 2.0 */}
        <button
          className="btn btn-tour-trigger"
          onClick={onOpenTour}
          title="Open interactive walkthrough for IBM Bob 2.0 Hackathon"
        >
          <IconSparkles size={14} className="tour-sparkle-icon" />
          <span>Hackathon Tour</span>
        </button>

        {/* Quick Demo CTA if not loaded */}
        {!activeRepo && (
          <button
            className="btn btn-primary btn-sm"
            onClick={onLoadDemo}
            disabled={loadingDemo}
          >
            <IconPlay size={14} />
            <span>{loadingDemo ? 'Loading...' : 'Quick Demo'}</span>
          </button>
        )}
      </div>
    </header>
  );
}
