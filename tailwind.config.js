/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0faf6',
          100: '#d5f0e5',
          200: '#a8dfc8',
          300: '#6fc9a3',
          400: '#3da87a',
          500: '#267a54',
          600: '#1F4D3A',
          700: '#193f30',
          800: '#133126',
          900: '#0d231c',
        },
        gray: {
          50: '#FAF8F4',
          100: '#F3EFE7',
          200: '#E6E0D3',
          300: '#D2C9B8',
          400: '#A69C89',
          500: '#847A67',
          600: '#635A49',
          700: '#4A4336',
          800: '#37312A',
          900: '#28241F',
        },
        'brand-cream': '#F5F0E8',
      },
      fontFamily: {
        sans: ['"Montserrat"', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Helvetica', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
}