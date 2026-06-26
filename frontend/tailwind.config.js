/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        nocny: {
          900: '#060e06',
          800: '#0a1a0a',
          700: '#112211',
          600: '#1a3a1a',
          500: '#2d5a2d',
          400: '#6b9e6b',
        },
        grafit: {
          900: '#16170f',
          850: '#1c1d18',
          800: '#1f201a',
          700: '#26271f',
          600: '#34362b',
          500: '#4a4d3e',
          400: '#9a9b8c',
          300: '#cfcbbd',
          100: '#f1ede2',
        },
        limonka: {
          300: '#d4f57e',
          400: '#c2f04f',
          500: '#aee63a',
          600: '#94cc28',
        },
        zielony: {
          50:  '#f0fdf4',
          100: '#dcfce7',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
        },
        bursztyn: {
          50:  '#fffbeb',
          100: '#fef3c7',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
        },
      },
    },
  },
  plugins: [],
}
