/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#3B82F6',
        'primary-700': '#1D4ED8',
        secondary: '#22C55E',
        error: '#EF4444',
        bg: '#0F172A',
        surface: '#1E293B',
        border: '#334155',
        muted: '#94A3B8'
      },
      borderRadius: {
        lg: '12px',
        md: '8px'
      },
      boxShadow: {
        card: '0 2px 8px rgba(0,0,0,0.3)'
      }
    }
  },
  plugins: []
};

