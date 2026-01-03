/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Space Grotesk', 'system-ui', 'sans-serif'],
      },
      colors: {
        metro: {
          purple: '#702F8A',
          magenta: '#E20074',
          blue: '#00A1E4',
          yellow: '#FFCD00',
          green: '#78BE20',
          orange: '#FF6900',
        },
        brutal: {
          black: '#0A0A0A',
          white: '#FFFFFF',
          cream: '#F5F5F0',
          gray: '#E5E5E0',
          'dark-bg': '#1A1A1A',
          'dark-surface': '#2A2A2A',
          'dark-border': '#404040',
        },
      },
      boxShadow: {
        brutal: '4px 4px 0px 0px #0A0A0A',
        'brutal-sm': '2px 2px 0px 0px #0A0A0A',
        'brutal-lg': '6px 6px 0px 0px #0A0A0A',
        'brutal-hover': '6px 6px 0px 0px #0A0A0A',
        'brutal-active': '2px 2px 0px 0px #0A0A0A',
        'brutal-dark': '4px 4px 0px 0px #404040',
        'brutal-dark-sm': '2px 2px 0px 0px #404040',
        'brutal-dark-hover': '6px 6px 0px 0px #404040',
        'brutal-dark-active': '2px 2px 0px 0px #404040',
      },
      borderWidth: {
        3: '3px',
        4: '4px',
      },
    },
  },
  plugins: [],
};
