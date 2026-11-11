/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#F4F4F6',
        surface: '#E7E7E7',
        border: '#D2D2D4',
        accent: {
          DEFAULT: '#FF634A',
          hover: '#E5533D',
          muted: 'rgba(255, 99, 74, 0.08)',
          border: 'rgba(255, 99, 74, 0.3)',
        },
        primary: {
          DEFAULT: '#FF634A',
          hover: '#E5533D',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Manrope', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'sm': '4px',
        DEFAULT: '6px',
        'md': '8px',
        'lg': '10px',
        'xl': '12px',
        '2xl': '16px',
      }
    },
  },
  plugins: [],
}
