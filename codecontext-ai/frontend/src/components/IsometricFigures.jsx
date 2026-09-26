import React from 'react';

/**
 * CodeContext AI — Minimalist Isometric Wireframe Figures
 * Inspired by Linear's visual language:
 * High-precision vector line-art on dark surfaces with thin monochrome strokes.
 */

// FIG 0.1: Layered Isometric Stack (Architecture Tiers)
export function FigureArchitecture({ size = 200, className = '' }) {
  return (
    <svg
      width={size}
      height={size * 0.72}
      viewBox="0 0 240 170"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="FIG 0.1 Multi-tier architecture stack"
    >
      {/* Top Floating Plate */}
      <polygon points="120,20 185,52 120,84 55,52" stroke="#ffffff" strokeWidth="1.2" fill="rgba(255, 255, 255, 0.04)" />
      {/* Top Plate Inner Circle Pattern */}
      <ellipse cx="120" cy="52" rx="32" ry="16" stroke="rgba(255, 255, 255, 0.45)" strokeWidth="0.8" strokeDasharray="3 3" />
      <line x1="120" y1="36" x2="120" y2="68" stroke="rgba(255, 255, 255, 0.3)" strokeWidth="0.8" />
      <line x1="88" y1="52" x2="152" y2="52" stroke="rgba(255, 255, 255, 0.3)" strokeWidth="0.8" />
      
      {/* Top Plate Extrusion */}
      <line x1="55" y1="52" x2="55" y2="62" stroke="#ffffff" strokeWidth="1.2" />
      <line x1="185" y1="52" x2="185" y2="62" stroke="#ffffff" strokeWidth="1.2" />
      <line x1="120" y1="84" x2="120" y2="94" stroke="#ffffff" strokeWidth="1.2" />
      <polygon points="55,62 120,94 185,62 185,52 120,84 55,52" stroke="rgba(255, 255, 255, 0.5)" strokeWidth="1" fill="rgba(255, 255, 255, 0.02)" />

      {/* Middle Plate 1 */}
      <polygon points="120,70 185,102 120,134 55,102" stroke="rgba(255, 255, 255, 0.7)" strokeWidth="1" fill="rgba(255, 255, 255, 0.02)" />
      <line x1="55" y1="102" x2="55" y2="110" stroke="rgba(255, 255, 255, 0.7)" strokeWidth="1" />
      <line x1="185" y1="102" x2="185" y2="110" stroke="rgba(255, 255, 255, 0.7)" strokeWidth="1" />
      <line x1="120" y1="134" x2="120" y2="142" stroke="rgba(255, 255, 255, 0.7)" strokeWidth="1" />

      {/* Middle Plate 2 */}
      <polygon points="120,88 185,120 120,152 55,120" stroke="rgba(255, 255, 255, 0.45)" strokeWidth="0.9" fill="rgba(255, 255, 255, 0.015)" />
      
      {/* Base Solid Plate */}
      <polygon points="120,105 185,137 120,168 55,137" stroke="rgba(255, 255, 255, 0.3)" strokeWidth="0.8" fill="rgba(255, 255, 255, 0.01)" />
      
      {/* Vertical Axis Guide Lines */}
      <line x1="120" y1="20" x2="120" y2="168" stroke="rgba(255, 255, 255, 0.15)" strokeWidth="0.8" strokeDasharray="2 4" />
      <line x1="55" y1="52" x2="55" y2="137" stroke="rgba(255, 255, 255, 0.15)" strokeWidth="0.8" strokeDasharray="2 4" />
      <line x1="185" y1="52" x2="185" y2="137" stroke="rgba(255, 255, 255, 0.15)" strokeWidth="0.8" strokeDasharray="2 4" />

      {/* Vertex Dots */}
      <circle cx="120" cy="20" r="2.5" fill="#ffffff" />
      <circle cx="55" cy="52" r="2" fill="rgba(255, 255, 255, 0.8)" />
      <circle cx="185" cy="52" r="2" fill="rgba(255, 255, 255, 0.8)" />
      <circle cx="120" cy="84" r="2" fill="rgba(255, 255, 255, 0.8)" />
    </svg>
  );
}

// FIG 0.2: Clustered Isometric Service Cubes (Autonomous Agents)
export function FigureAgents({ size = 200, className = '' }) {
  return (
    <svg
      width={size}
      height={size * 0.72}
      viewBox="0 0 240 170"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="FIG 0.2 Autonomous agent clusters"
    >
      {/* Back Cube (Top Center) */}
      <g stroke="rgba(255, 255, 255, 0.45)" strokeWidth="1" fill="rgba(255, 255, 255, 0.02)">
        <polygon points="120,24 148,38 120,52 92,38" />
        <polygon points="92,38 120,52 120,82 92,68" />
        <polygon points="120,52 148,38 148,68 120,82" />
        <circle cx="120" cy="38" r="1.5" fill="#ffffff" />
      </g>

      {/* Left Cube */}
      <g stroke="#ffffff" strokeWidth="1.1" fill="rgba(255, 255, 255, 0.03)">
        <polygon points="82,56 114,72 82,88 50,72" />
        <polygon points="50,72 82,88 82,126 50,110" />
        <polygon points="82,88 114,72 114,110 82,126" />
        <circle cx="82" cy="72" r="2" fill="#ffffff" />
        <line x1="82" y1="88" x2="82" y2="126" stroke="rgba(255, 255, 255, 0.4)" strokeWidth="0.8" />
      </g>

      {/* Right Tall Cube */}
      <g stroke="rgba(255, 255, 255, 0.75)" strokeWidth="1.1" fill="rgba(255, 255, 255, 0.03)">
        <polygon points="155,50 188,66 155,82 122,66" />
        <polygon points="122,66 155,82 155,130 122,114" />
        <polygon points="155,82 188,66 188,114 155,130" />
        <circle cx="155" cy="66" r="2" fill="#ffffff" />
      </g>

      {/* Front Small Cube */}
      <g stroke="#ffffff" strokeWidth="1.2" fill="rgba(255, 255, 255, 0.05)">
        <polygon points="120,95 146,108 120,121 94,108" />
        <polygon points="94,108 120,121 120,150 94,137" />
        <polygon points="120,121 146,108 146,137 120,150" />
        <circle cx="120" cy="108" r="2" fill="#ffffff" />
      </g>

      {/* Connection Links between cubes */}
      <line x1="82" y1="72" x2="120" y2="38" stroke="rgba(255, 255, 255, 0.3)" strokeWidth="0.8" strokeDasharray="3 3" />
      <line x1="155" y1="66" x2="120" y2="38" stroke="rgba(255, 255, 255, 0.3)" strokeWidth="0.8" strokeDasharray="3 3" />
      <line x1="82" y1="88" x2="120" y2="108" stroke="rgba(255, 255, 255, 0.3)" strokeWidth="0.8" strokeDasharray="3 3" />
      <line x1="155" y1="82" x2="120" y2="108" stroke="rgba(255, 255, 255, 0.3)" strokeWidth="0.8" strokeDasharray="3 3" />
    </svg>
  );
}

// FIG 0.3: Cascading Planes (PR Gatekeeper & Timeline Memory)
export function FigureMemory({ size = 200, className = '' }) {
  return (
    <svg
      width={size}
      height={size * 0.72}
      viewBox="0 0 240 170"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="FIG 0.3 Cascading decision planes"
    >
      {/* Step 1 (Back Tallest) */}
      <g stroke="rgba(255, 255, 255, 0.35)" strokeWidth="0.9" fill="rgba(255, 255, 255, 0.015)">
        <polygon points="160,20 185,32 185,115 160,103" />
        <line x1="160" y1="20" x2="140" y2="30" stroke="rgba(255, 255, 255, 0.25)" />
      </g>

      {/* Step 2 */}
      <g stroke="rgba(255, 255, 255, 0.45)" strokeWidth="1" fill="rgba(255, 255, 255, 0.02)">
        <polygon points="146,35 171,47 171,123 146,111" />
      </g>

      {/* Step 3 */}
      <g stroke="rgba(255, 255, 255, 0.6)" strokeWidth="1" fill="rgba(255, 255, 255, 0.025)">
        <polygon points="132,50 157,62 157,131 132,119" />
      </g>

      {/* Step 4 */}
      <g stroke="rgba(255, 255, 255, 0.75)" strokeWidth="1.1" fill="rgba(255, 255, 255, 0.03)">
        <polygon points="118,65 143,77 143,139 118,127" />
      </g>

      {/* Step 5 */}
      <g stroke="#ffffff" strokeWidth="1.2" fill="rgba(255, 255, 255, 0.04)">
        <polygon points="104,80 129,92 129,147 104,135" />
      </g>

      {/* Step 6 (Front Lowest) */}
      <g stroke="#ffffff" strokeWidth="1.2" fill="rgba(255, 255, 255, 0.05)">
        <polygon points="90,95 115,107 115,155 90,143" />
        <circle cx="90" cy="95" r="2" fill="#ffffff" />
        <circle cx="115" cy="107" r="2" fill="#ffffff" />
      </g>

      {/* Cascading baseline grid */}
      <path d="M50,140 L90,160 L195,105 L155,85 Z" stroke="rgba(255, 255, 255, 0.15)" strokeWidth="0.8" strokeDasharray="3 3" />
    </svg>
  );
}
