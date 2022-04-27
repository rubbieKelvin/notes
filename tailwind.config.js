module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    fontFamily: {
      'sans': ['Inter']
    },
    extend: {
      colors: {
        primary: {
          basic: '#2934D0'
        }
      }
    },
  },
  plugins: [],
}