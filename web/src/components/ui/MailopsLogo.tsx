import React from 'react';

interface MailopsLogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
  textColor?: string;
  variant?: 'minimal' | 'monogram' | 'full';
}

/**
 * Classy, Minimalist Mailops Logo
 * Sober Obsidian / Brushed Slate & Titanium with subtle deep Indigo accent
 */
export const MailopsLogo: React.FC<MailopsLogoProps> = ({
  size = 28,
  className = '',
  showText = true,
  textColor = 'currentColor',
  variant = 'full'
}) => {
  return (
    <div className={`inline-flex items-center space-x-2.5 select-none ${className}`}>
      {/* Precision Geometric Origami Monogram */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 transition-transform duration-300 hover:scale-105"
      >
        <defs>
          {/* Subtle Sober Slate / Obsidian Gradient */}
          <linearGradient id="mailops-bg" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>

          {/* Titanium Silver Edge */}
          <linearGradient id="mailops-edge" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#94a3b8" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#475569" stopOpacity="0.1" />
          </linearGradient>

          {/* Discreet Deep Indigo Accent for Fold */}
          <linearGradient id="mailops-accent" x1="12" y1="16" x2="36" y2="34" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="50%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#4f46e5" />
          </linearGradient>

          {/* Sleek Inner Shadow */}
          <filter id="subtle-shadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.25" />
          </filter>
        </defs>

        {/* Outer Rounded Obsidian Hexagon/Squircle */}
        <rect
          x="4"
          y="4"
          width="40"
          height="40"
          rx="12"
          fill="url(#mailops-bg)"
          stroke="url(#mailops-edge)"
          strokeWidth="1.2"
          filter="url(#subtle-shadow)"
        />

        {/* Minimalist Geometric Envelope Fold Lines */}
        {/* Left Wing */}
        <path
          d="M 12 16 L 24 26 L 12 34 Z"
          fill="#334155"
          fillOpacity="0.5"
        />

        {/* Right Wing */}
        <path
          d="M 36 16 L 24 26 L 36 34 Z"
          fill="#334155"
          fillOpacity="0.3"
        />

        {/* Bottom Fold */}
        <path
          d="M 12 34 L 24 25 L 36 34 Z"
          fill="#1e293b"
          stroke="#475569"
          strokeWidth="0.8"
        />

        {/* Top Minimal Origami Flap with discreet Indigo Glow */}
        <path
          d="M 12 16 L 24 27 L 36 16"
          stroke="url(#mailops-accent)"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Precision Center Security Node */}
        <circle
          cx="24"
          cy="27"
          r="2.2"
          fill="#38bdf8"
          className="animate-pulse"
        />
      </svg>

      {/* Classy Typography */}
      {showText && (
        <div className="flex flex-col leading-none">
          <div className="flex items-center space-x-1.5">
            <span className="font-semibold tracking-tight text-sm text-zinc-900 dark:text-zinc-100 font-sans">
              mailops
            </span>
            <span className="text-[9px] uppercase font-mono font-medium tracking-wider px-1.5 py-0.2 bg-zinc-200/60 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 rounded">
              pro
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
