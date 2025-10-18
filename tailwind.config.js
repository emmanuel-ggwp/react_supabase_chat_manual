/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        chat: {
          background: '#0f172a',
          surface: '#1e293b',
          primary: '#2563eb',
          secondary: '#7c3aed',
          accent: '#f97316',
          success: '#22c55e',
          warning: '#facc15',
          danger: '#ef4444',
          muted: '#94a3b8'
        }
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui']
      }
    }
  },
  plugins: []
};
