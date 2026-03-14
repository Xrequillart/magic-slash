/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: '#0a0a0b',
          secondary: '#141416',
          tertiary: '#1c1c1f',
        },
        accent: {
          DEFAULT: '#6366f1',
          hover: '#818cf8',
        },
        purple: '#a855f7',
        green: '#22c55e',
        red: '#ef4444',
        yellow: '#eab308',
        border: '#27272a',
        'text-secondary': '#a1a1aa',
      },
      fontFamily: {
        sans: ['Cera Pro', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['SF Mono', 'Monaco', 'monospace'],
      },
      animation: {
        'float-1': 'float1 10s ease-in-out infinite',
        'float-2': 'float2 12s ease-in-out infinite',
        'float-3': 'float3 11s ease-in-out infinite',
        'fade-in': 'fadeIn 0.2s ease',
        'slide-in': 'slideIn 0.3s ease',
        'slide-out': 'slideOut 0.3s ease forwards',
        'tada': 'tada 0.8s ease-in-out',
      },
      keyframes: {
        tada: {
          '0%': { transform: 'scale(1)' },
          '10%, 20%': { transform: 'scale(0.95) rotate(-3deg)' },
          '30%, 50%, 70%, 90%': { transform: 'scale(1.05) rotate(3deg)' },
          '40%, 60%, 80%': { transform: 'scale(1.05) rotate(-3deg)' },
          '100%': { transform: 'scale(1) rotate(0)' },
        },
        float1: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '50%': { transform: 'translate(-30px, 30px) scale(1.05)' },
        },
        float2: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '50%': { transform: 'translate(20px, -25px) scale(1.03)' },
        },
        float3: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '50%': { transform: 'translate(-25px, -20px) scale(1.04)' },
        },
        fadeIn: {
          from: { opacity: 0, transform: 'translateY(10px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
        slideIn: {
          from: { transform: 'translateX(100%)', opacity: 0 },
          to: { transform: 'translateX(0)', opacity: 1 },
        },
        slideOut: {
          from: { transform: 'translateX(0)', opacity: 1 },
          to: { transform: 'translateX(100%)', opacity: 0 },
        },
      },
    },
  },
  plugins: [],
}
