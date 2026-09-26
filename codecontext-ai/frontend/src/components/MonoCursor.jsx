import React, { useEffect, useRef, useState } from 'react';

/**
 * CodeContext AI — Morphing & Magnetic Precision Cursor
 * Inspired by Linear's interaction language:
 * - Fluid lerp-smoothed trailing layer
 * - Morphing shape hugging buttons, icons, links, and cards
 * - Selective micro-magnetic pull on primary controls
 * - Fully hardware-accelerated, pointer-events: none
 */
export function MonoCursor() {
  const dotRef = useRef(null);
  const ringRef = useRef(null);
  const stateRef = useRef({
    mouseX: -100,
    mouseY: -100,
    // Ring lerp properties
    currentX: -100,
    currentY: -100,
    currentW: 22,
    currentH: 22,
    currentR: 11,
    // Target morph properties
    targetX: -100,
    targetY: -100,
    targetW: 22,
    targetH: 22,
    targetR: 11,
    isHoveringElement: false,
    hoveredEl: null,
    magneticEl: null,
  });

  const [visible, setVisible] = useState(false);
  const [clicking, setClicking] = useState(false);
  const [cursorType, setCursorType] = useState('default'); // default | button | icon | card | link

  useEffect(() => {
    // Only run on desktop devices with fine pointer
    if (window.matchMedia('(pointer: coarse)').matches) {
      return;
    }

    let animId;

    const handleMouseMove = (e) => {
      const state = stateRef.current;
      state.mouseX = e.clientX;
      state.mouseY = e.clientY;

      if (!visible) setVisible(true);

      // Handle magnetic interaction if hovering a magnetic control
      if (state.magneticEl) {
        const rect = state.magneticEl.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const dx = Math.max(-5, Math.min(5, (e.clientX - centerX) * 0.18));
        const dy = Math.max(-5, Math.min(5, (e.clientY - centerY) * 0.18));
        state.magneticEl.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
      }

      // If not currently locked to an element, target is mouse position
      if (!state.isHoveringElement) {
        state.targetW = 22;
        state.targetH = 22;
        state.targetR = 11;
        state.targetX = e.clientX - 11;
        state.targetY = e.clientY - 11;
      }
    };

    const handleMouseOver = (e) => {
      const target = e.target;
      if (!target) return;

      const state = stateRef.current;

      // 1. Check for icon buttons
      const iconTarget = target.closest(
        '.btn-icon-action, .btn-icon-close, .sidebar-logo-icon, .stat-icon-wrap, .workflow-icon-box, .decision-icon-badge, .timeline-badge-circle, .repo-btn-icon'
      );
      if (iconTarget) {
        const rect = iconTarget.getBoundingClientRect();
        state.isHoveringElement = true;
        state.hoveredEl = iconTarget;
        state.targetX = rect.left - 4;
        state.targetY = rect.top - 4;
        state.targetW = rect.width + 8;
        state.targetH = rect.height + 8;
        state.targetR = 8;
        setCursorType('icon');

        // Apply magnetic setup
        state.magneticEl = iconTarget;
        iconTarget.style.transition = 'none';
        return;
      }

      // 2. Check for buttons
      const btnTarget = target.closest(
        '.btn, button, .repo-selector-btn, .dep-filter-btn, .source-tab-btn, .tech-chip-btn, .pr-subtab-btn, .diff-file-chip, .starter-task-pill, .mono-roadmap-node'
      );
      if (btnTarget) {
        const rect = btnTarget.getBoundingClientRect();
        state.isHoveringElement = true;
        state.hoveredEl = btnTarget;
        state.targetX = rect.left - 3;
        state.targetY = rect.top - 3;
        state.targetW = rect.width + 6;
        state.targetH = rect.height + 6;
        state.targetR = Math.min(10, rect.height / 2);
        setCursorType('button');

        if (btnTarget.classList.contains('btn-primary') || btnTarget.classList.contains('btn-tour-trigger')) {
          state.magneticEl = btnTarget;
          btnTarget.style.transition = 'none';
        }
        return;
      }

      // 3. Check for architecture nodes / cards
      const nodeTarget = target.closest('.topology-node-card');
      if (nodeTarget) {
        const rect = nodeTarget.getBoundingClientRect();
        state.isHoveringElement = true;
        state.hoveredEl = nodeTarget;
        state.targetX = rect.left - 3;
        state.targetY = rect.top - 3;
        state.targetW = rect.width + 6;
        state.targetH = rect.height + 6;
        state.targetR = 12;
        setCursorType('card');
        return;
      }

      // 4. Check for links & navigation items
      const linkTarget = target.closest('.sidebar-link, a, [role="link"]');
      if (linkTarget) {
        const rect = linkTarget.getBoundingClientRect();
        state.isHoveringElement = true;
        state.hoveredEl = linkTarget;
        state.targetX = rect.left - 2;
        state.targetY = rect.top - 2;
        state.targetW = rect.width + 4;
        state.targetH = rect.height + 4;
        state.targetR = 6;
        setCursorType('link');
        return;
      }

      // Not an interactive element
      if (state.isHoveringElement) {
        if (state.magneticEl) {
          state.magneticEl.style.transition = 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
          state.magneticEl.style.transform = 'translate3d(0, 0, 0)';
          state.magneticEl = null;
        }
        state.isHoveringElement = false;
        state.hoveredEl = null;
        setCursorType('default');
      }
    };

    const handleMouseOut = (e) => {
      const state = stateRef.current;
      if (state.hoveredEl && !state.hoveredEl.contains(e.relatedTarget)) {
        if (state.magneticEl) {
          state.magneticEl.style.transition = 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
          state.magneticEl.style.transform = 'translate3d(0, 0, 0)';
          state.magneticEl = null;
        }
        state.isHoveringElement = false;
        state.hoveredEl = null;
        setCursorType('default');
      }
    };

    const handleMouseDown = () => setClicking(true);
    const handleMouseUp = () => setClicking(false);
    const handleMouseLeaveWindow = () => setVisible(false);

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('mouseover', handleMouseOver, { passive: true });
    document.addEventListener('mouseout', handleMouseOut, { passive: true });
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mouseleave', handleMouseLeaveWindow);

    // Fluid render loop with organic lerp interpolation
    const render = () => {
      const s = stateRef.current;

      // When hovering an element, recalculate in case element moves/scrolls
      if (s.isHoveringElement && s.hoveredEl) {
        const rect = s.hoveredEl.getBoundingClientRect();
        s.targetX = rect.left - 3;
        s.targetY = rect.top - 3;
        s.targetW = rect.width + 6;
        s.targetH = rect.height + 6;
      }

      // Lerp interpolations
      const lerpSpeed = s.isHoveringElement ? 0.28 : 0.2;
      s.currentX += (s.targetX - s.currentX) * lerpSpeed;
      s.currentY += (s.targetY - s.currentY) * lerpSpeed;
      s.currentW += (s.targetW - s.currentW) * lerpSpeed;
      s.currentH += (s.targetH - s.currentH) * lerpSpeed;
      s.currentR += (s.targetR - s.currentR) * lerpSpeed;

      // Update dot position (follows real mouse directly)
      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${s.mouseX}px, ${s.mouseY}px, 0)`;
      }

      // Update morphing ring position & dimensions
      if (ringRef.current) {
        ringRef.current.style.transform = `translate3d(${s.currentX}px, ${s.currentY}px, 0)`;
        ringRef.current.style.width = `${s.currentW}px`;
        ringRef.current.style.height = `${s.currentH}px`;
        ringRef.current.style.borderRadius = `${s.currentR}px`;
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseover', handleMouseOver);
      document.removeEventListener('mouseout', handleMouseOut);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mouseleave', handleMouseLeaveWindow);
      cancelAnimationFrame(animId);
    };
  }, [visible]);

  // Don't render on coarse touch devices
  if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(pointer: coarse)').matches) {
    return null;
  }

  return (
    <>
      {/* Precision Center Dot */}
      <div
        ref={dotRef}
        className={`mono-cursor-dot ${visible ? 'is-visible' : ''} ${cursorType !== 'default' ? 'cursor-hovering' : ''}`}
      />

      {/* Morphing Interaction Ring */}
      <div
        ref={ringRef}
        className={`mono-cursor-morph ${visible ? 'is-visible' : ''} type-${cursorType} ${
          clicking ? 'is-clicking' : ''
        }`}
      />
    </>
  );
}
