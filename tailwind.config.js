/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      colors: {
        surface: {
          DEFAULT: '#0f0f0f',
          1: '#141414',
          2: '#1a1a1a',
          3: '#222222',
          4: '#2a2a2a',
        },
        border: {
          DEFAULT: '#2a2a2a',
          subtle: '#1f1f1f',
        },
        faro: {
          DEFAULT: '#4ade80',
          dim: '#166534',
          muted: '#14532d',
        },
        text: {
          DEFAULT: '#e5e5e5',
          muted: '#737373',
          subtle: '#404040',
        },
      },
    },
  },
  plugins: [],
};
