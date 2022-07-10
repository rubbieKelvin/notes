module.exports = {
  content: ["./index.html", "./src/**/*.{vue,js,ts,jsx,tsx}"],
  theme: {
    fontFamily: {
      sans: "Poppins",
      serif: "Mulish",
    },
    fontSize: {
      xs: ["11px", "18px"],
      sm: ["13px", "18px"],
      base: ["15px", "20px"],
      lg: ["17px", "20px"],
      xl: ["19px", "22px"],
      "2xl": ["21px", "24px"],
      "3xl": ["23px", "24px"],
      "4xl": ["26px", "24px"],
      "5xl": ["30px", "26px"],
    },
    extend: {
      colors: {
        primary: {
          basic: "#1a73e8",
          vibrant: "#0040DD",
        },
        wall: "#c1c4c8",
      },
    },
  },
  plugins: [],
};
