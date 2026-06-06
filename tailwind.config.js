/** @type {import('tailwindcss').Config} */
export default {
  content: [ './index.html','./src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#26428B',
          dark:    '#101B3B',
          accent:  '#516AC8',
          gold:    '#E3AF64',
          light:   '#F8F7F5',
          warm:    '#FAEBD7',
        },
      },
      fontFamily: {
        tajawal: ['Tajawal', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
