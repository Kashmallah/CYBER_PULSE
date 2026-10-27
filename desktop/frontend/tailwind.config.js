/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        cyber: {
          bg: "#07090e",
          card: "#0f141f",
          border: "#1e293b",
          primary: "#00f0ff",
          secondary: "#7000ff",
          accent: "#ff0055",
          success: "#00ff88",
          warning: "#ffaa00",
          danger: "#ff2244",
          text: "#e2e8f0",
          muted: "#94a3b8"
        },
        cyan: {
          50: "rgb(var(--cyan-50) / <alpha-value>)",
          100: "rgb(var(--cyan-100) / <alpha-value>)",
          200: "rgb(var(--cyan-200) / <alpha-value>)",
          300: "rgb(var(--cyan-300) / <alpha-value>)",
          400: "rgb(var(--cyan-400) / <alpha-value>)",
          500: "rgb(var(--cyan-50) / <alpha-value>)", // Fallback or direct map
          500: "rgb(var(--cyan-500) / <alpha-value>)",
          600: "rgb(var(--cyan-600) / <alpha-value>)",
          700: "rgb(var(--cyan-700) / <alpha-value>)",
          800: "rgb(var(--cyan-800) / <alpha-value>)",
          900: "rgb(var(--cyan-900) / <alpha-value>)",
          950: "rgb(var(--cyan-950) / <alpha-value>)",
        },
        purple: {
          50: "rgb(var(--purple-50) / <alpha-value>)",
          100: "rgb(var(--purple-100) / <alpha-value>)",
          200: "rgb(var(--purple-200) / <alpha-value>)",
          300: "rgb(var(--purple-300) / <alpha-value>)",
          400: "rgb(var(--purple-400) / <alpha-value>)",
          500: "rgb(var(--purple-500) / <alpha-value>)",
          600: "rgb(var(--purple-600) / <alpha-value>)",
          700: "rgb(var(--purple-700) / <alpha-value>)",
          800: "rgb(var(--purple-800) / <alpha-value>)",
          900: "rgb(var(--purple-900) / <alpha-value>)",
          950: "rgb(var(--purple-950) / <alpha-value>)",
        },
        slate: {
          50: "rgb(var(--slate-50) / <alpha-value>)",
          100: "rgb(var(--slate-100) / <alpha-value>)",
          200: "rgb(var(--slate-200) / <alpha-value>)",
          300: "rgb(var(--slate-300) / <alpha-value>)",
          400: "rgb(var(--slate-400) / <alpha-value>)",
          500: "rgb(var(--slate-500) / <alpha-value>)",
          600: "rgb(var(--slate-600) / <alpha-value>)",
          700: "rgb(var(--slate-700) / <alpha-value>)",
          800: "rgb(var(--slate-800) / <alpha-value>)",
          900: "rgb(var(--slate-900) / <alpha-value>)",
          950: "rgb(var(--slate-950) / <alpha-value>)",
        }
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 12s linear infinite',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: '1', filter: 'drop-shadow(0 0 15px rgba(0, 240, 255, 0.6))' },
          '50%': { opacity: '.6', filter: 'drop-shadow(0 0 5px rgba(0, 240, 255, 0.2))' },
        }
      }
    },
  },
  plugins: [],
}
