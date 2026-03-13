/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'media',
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      /* NOTE: Tailwind v4 ignores this file. Font config is in index.css @theme block. */
      fontFamily: {
        sans: ['SF Pro Rounded', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-15px)' },
        },
        rain: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '50%': { opacity: '1' },
          '100%': { transform: 'translateY(30px)', opacity: '0' },
        },
        'spin-slow': {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        float: 'float 4s ease-in-out infinite',
        'float-delayed': 'float 4s ease-in-out 2s infinite',
        rain: 'rain 1s linear infinite',
        'spin-slow': 'spin-slow 12s linear infinite',
      },
    },
  },
}
