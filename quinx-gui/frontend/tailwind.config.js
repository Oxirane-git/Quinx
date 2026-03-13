/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                quinx: {
                    green: '#00ff88',
                    bg: '#0a0a0a',
                    surface: '#111111',
                    border: '#222222',
                    text: '#e5e5e5',
                    muted: '#888888'
                }
            },
            fontFamily: {
                mono: ['"JetBrains Mono"', 'monospace'],
            }
        },
    },
    plugins: [],
}
