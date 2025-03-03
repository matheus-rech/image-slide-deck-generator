/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  safelist: [
    'scale-in',
    'slide-in-right',
    'animate-fadeIn',
  ],
  theme: {
    extend: {
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
      animation: {
        'fadeIn': 'fadeIn 0.6s ease-out forwards',
        'slideInRight': 'slideInRight 0.4s ease-out forwards',
        'scaleIn': 'scaleIn 0.5s ease-out forwards',
      },
      colors: {
        'slide-bg': {
          50: '#f0f7ff',
          100: '#e0efff',
        },
      },
      transitionProperty: {
        'transform': 'transform',
      },
      scale: {
        '102': '1.02',
      },
      boxShadow: {
        'slide': '0 4px 15px rgba(0, 0, 0, 0.05)',
        'slide-hover': '0 10px 25px rgba(0, 0, 0, 0.08)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
