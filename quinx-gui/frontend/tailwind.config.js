/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#f8fafc', // slate-50
        surface: '#ffffff',
        border: '#e2e8f0', // slate-200
        primary: '#0ea5e9', // sky-500
        primaryHover: '#0284c7', // sky-600
        textMain: '#0f172a', // slate-900
        textMuted: '#64748b', // slate-500
        danger: '#ef4444', // red-500
        success: '#10b981', // emerald-500
        // Quinx dark theme (Campaign page)
        'quinx-surface': '#0d1117',
        'quinx-border': '#21262d',
        'quinx-green': '#00ff88',
        'quinx-muted': '#8b949e',
        // Landing Page theme
        'obsidian': '#0A0A0B',
        'gunmetal': '#161618',
        'matrix': '#00FF41',
        'matrix-hover': '#00e63a',
        'divider': '#262629',
        'pure-white': '#FFFFFF',
      },
      fontFamily: {
        sans: ['"Inter"', 'sans-serif'],
        mono: ['"Geist Mono"', 'monospace'],
      }
    },
  },
  plugins: [],
}
