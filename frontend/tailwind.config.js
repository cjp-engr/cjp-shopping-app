/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Trust Orange — primary brand palette ──────────────────────────────
        primary: {
          50:  '#FFF8F0',  // warm white tint
          100: '#FFE0B2',  // soft orange
          200: '#FFCC80',
          300: '#FFB74D',
          400: '#FFA726',
          500: '#FF9900',  // brand orange
          600: '#FF6B00',  // CTA / active
          700: '#E65100',  // deep orange
          800: '#232F3E',  // dark navy (nav/header)
          900: '#1A252F',  // deep navy
        },
        secondary: {
          500: '#8b5cf6',
          600: '#7c3aed',
        },
        // ── Sale / discount accent ─────────────────────────────────────────────
        sale: {
          DEFAULT: '#E31837',
          light:   '#FFEBEE',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
