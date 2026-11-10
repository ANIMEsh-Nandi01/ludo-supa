import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        ludo: {
          red: '#ef4444',
          green: '#22c55e',
          yellow: '#eab308',
          blue: '#3b82f6',
        },
      },
      keyframes: {
        'ring-pulse': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(59,130,246,0.7)' },
          '50%': { boxShadow: '0 0 0 6px rgba(59,130,246,0)' },
        },
      },
      animation: {
        'ring-pulse': 'ring-pulse 1.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
