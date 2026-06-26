/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        indigo: { 50:'#eef2ff',100:'#e0e7ff',200:'#c7d2fe',300:'#a5b4fc',400:'#818cf8',500:'#6366f1',600:'#4f46e5',700:'#4338ca',800:'#3730a3',900:'#312e81' },
        violet: { 50:'#f5f3ff',500:'#8b5cf6',600:'#7c3aed' },
      },
      fontFamily: { sans: ['-apple-system','BlinkMacSystemFont','Segoe UI','sans-serif'] },
      borderRadius: { '2xl':'1rem','3xl':'1.5rem','4xl':'2rem' },
      boxShadow: {
        'card':'0 4px 24px rgba(0,0,0,0.07)',
        'hero':'0 4px 20px rgba(99,102,241,0.35)',
      },
    },
  },
  plugins: [],
}
