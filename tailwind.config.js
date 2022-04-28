module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    fontFamily: {
      sans: 'Inter UI',
      serif: 'Mulish'
    },
    fontSize: {
      xs: ['9px', '18px'],
      sm: ['11px', '18px'],
      base: ['13px', '20px'],
      lg: ['15px', '20px'],
      xl: ['17px', '22px'],
      '2xl': ['19px', '24px'],
      '3xl': ['21px', '24px'],
      '4xl': ['24px', '24px'],
      '5xl': ['27px', '26px']
    },
    extend: {
      colors: {
        primary: {
          basic: '#007AFF',
          vibrant: '#0040DD'
        }
      }
    },
  },
  plugins: [],
}