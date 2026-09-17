/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        warm: {
          canvas: '#f5f4f0',
          card: '#fbfbfa',
          surface: '#f3f2ec',
          border: '#e8e6df',
          borderSubtle: '#eeebe3',
          muted: '#78756e',
          text: '#1c1b18',
        },
        slate: {
          950: '#070b14',
          900: '#0b0f19',
          850: '#0f172a',
          800: '#1e293b',
          750: '#273549',
          700: '#334155',
          600: '#475569',
        },
        erp: {
          bg: '#0b0f19',
          surface: '#0f172a',
          card: '#1e293b',
          cardHover: '#243247',
          border: '#334155',
          borderLight: '#475569',
          accent: '#3b82f6',
          accentHover: '#2563eb',
          success: '#10b981',
          warning: '#f59e0b',
          danger: '#ef4444',
          purple: '#8b5cf6',
          cyan: '#06b6d4',
          text: '#f8fafc',
          textMuted: '#94a3b8'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Courier New', 'monospace'],
      },
      boxShadow: {
        '2xs': '0 1px 2px 0 rgba(0, 0, 0, 0.03)',
        'xs': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'glow-blue': '0 0 25px -5px rgba(59, 130, 246, 0.3)',
        'glow-cyan': '0 0 25px -5px rgba(6, 182, 212, 0.3)',
        'glow-purple': '0 0 25px -5px rgba(139, 92, 246, 0.3)',
        'glow-emerald': '0 0 25px -5px rgba(16, 185, 129, 0.3)',
      },
      backdropBlur: {
        'xs': '2px',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.25s ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        }
      }
    },
  },
  plugins: [],
}