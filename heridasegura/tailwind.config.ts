import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        petrol: {
          50: '#eef7f8', 100: '#d5ebee', 200: '#acd6dc', 300: '#78b9c3', 400: '#4795a3',
          500: '#2c7886', 600: '#1f5f6c', 700: '#154c58', 800: '#0f3d48', 900: '#0b2f38', 950: '#061d23',
        },
        turq: { 50: '#ecfdfa', 100: '#cff8f1', 200: '#9ff0e3', 300: '#62e0cf', 400: '#2cc8b6', 500: '#14ad9c', 600: '#0d8b7f', 700: '#0f6f66' },
      },
      fontFamily: { sans: ['var(--font-sans)', 'system-ui', 'sans-serif'] },
      borderRadius: { xl2: '1.25rem' },
    },
  },
  plugins: [],
} satisfies Config;
