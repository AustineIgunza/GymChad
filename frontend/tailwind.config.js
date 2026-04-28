/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // GymChad Superman design system — Red & Blue
        bg: {
          primary: '#07070f',
          secondary: '#0f0f1c',
          tertiary: '#141428',
          card: '#111120',
          hover: '#1a1a30',
        },
        border: {
          DEFAULT: '#1e1e3a',
          subtle: '#252545',
          strong: '#2d2d55',
        },
        // Superman Red — primary action color
        primary: {
          50:  '#fff1f1',
          100: '#ffe0e0',
          200: '#ffc7c7',
          300: '#ffa0a0',
          400: '#ff6b6b',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
          950: '#450a0a',
        },
        // Superman Blue — secondary accent
        blue: {
          50:  '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
        accent: {
          blue:   '#3b82f6',
          green:  '#22c55e',
          red:    '#ef4444',
          orange: '#f97316',
          yellow: '#eab308',
        },
        text: {
          primary:  '#f8fafc',
          secondary: '#94a3b8',
          muted:    '#64748b',
          disabled: '#334155',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'hero-glow':   'radial-gradient(ellipse at center, rgba(220,38,38,0.12) 0%, rgba(29,78,216,0.06) 50%, transparent 80%)',
        'card-gradient': 'linear-gradient(135deg, rgba(220,38,38,0.07) 0%, rgba(29,78,216,0.04) 100%)',
        'blue-glow':  'radial-gradient(ellipse at center, rgba(29,78,216,0.15) 0%, transparent 70%)',
      },
      boxShadow: {
        'glow-red':   '0 0 20px rgba(220,38,38,0.35), 0 0 40px rgba(220,38,38,0.12)',
        'glow-blue':  '0 0 20px rgba(29,78,216,0.35), 0 0 40px rgba(29,78,216,0.12)',
        'glow-sm':    '0 0 10px rgba(220,38,38,0.25)',
        'card':       '0 4px 24px rgba(0,0,0,0.5)',
        'card-hover': '0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(220,38,38,0.12)',
      },
      animation: {
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'float':      'float 6s ease-in-out infinite',
        'shimmer':    'shimmer 2s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':      { transform: 'translateY(-8px)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      borderRadius: {
        xl:   '0.75rem',
        '2xl':'1rem',
        '3xl':'1.5rem',
      },
    },
  },
  plugins: [],
}
