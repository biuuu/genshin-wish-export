module.exports = {
  purge: ['./src/renderer/index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  darkMode: false, // or 'media' or 'class'
  theme: {
    extend: {
      minWidth: {
        '10': '60px'
      }
    },
  },
  variants: {
    extend: {
      backgroundColor: ['active']
    }
  },
  plugins: [],
}
