/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#e6f5fc',
          100: '#b3e2f6',
          200: '#80cff0',
          300: '#4dbce9',
          400: '#1aa9e3',
          500: '#0A8BCC', // Main brand color
          600: '#086fa3',
          700: '#06537a',
          800: '#043752',
          900: '#021b29',
        },
      },
    },
  },
  plugins: [],
}

