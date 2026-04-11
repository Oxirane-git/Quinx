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
      },
      fontFamily: {
        sans: ['"Inter"', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
