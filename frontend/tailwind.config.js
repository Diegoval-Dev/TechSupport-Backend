/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef4ff',
          100: '#dbe6ff',
          200: '#bdd0ff',
          300: '#8fb0ff',
          400: '#5b85ff',
          500: '#3660fb',
          600: '#243def',
          700: '#1c2fd6',
          800: '#1c2aac',
          900: '#1c2988',
        },
      },
    },
  },
  plugins: [],
}
