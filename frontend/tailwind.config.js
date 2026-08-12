/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#00288e',
          container: '#1e40af',
          fixed: '#dde1ff',
          dim: '#b8c4ff',
          50: '#eef2ff',
          100: '#dde1ff',
          500: '#1e40af',
          600: '#00288e',
          700: '#001453',
        },
        secondary: {
          DEFAULT: '#006a61',
          container: '#0d9488',
          light: '#86f2e4',
        },
        tertiary: {
          DEFAULT: '#2000b1',
          container: '#4f46e5',
        },
        surface: {
          DEFAULT: '#f8f9ff',
          bg: '#F8FAFC',
          container: '#e5eeff',
          dim: '#cbdbf5',
          bright: '#f8f9ff',
          lowest: '#ffffff',
          variant: '#d3e4fe',
        },
        border: {
          subtle: '#E2E8F0',
        },
        attendance: {
          present: '#10B981',
          absent: '#EF4444',
          late: '#F59E0B',
          excused: '#6366F1',
        },
        participation: {
          active: '#059669',
          disruptive: '#B91C1C',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        label: ['Geist', 'Inter', 'sans-serif'],
        data: ['Geist', 'monospace'],
      },
      borderRadius: {
        'eight': '8px',
      },
    },
  },
  plugins: [],
}

