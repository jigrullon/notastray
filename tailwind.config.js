/** @type {import('tailwindcss').Config} */
module.exports = {
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
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#4B4B4B',
          900: '#373737',
        },
        'brand-cream': '#F5F0E8',
      },
      fontFamily: {
        sans: ['"Fredoka"', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Helvetica', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
}