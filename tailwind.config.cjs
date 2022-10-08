/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{vue,js,ts,jsx,tsx}"],
  theme: {
    fontFamily: {
      sans: "Google Sans",
    },
    extend: {
      colors: {
        stroke: "#DEDEDE",
        fadedStroke: "#F4F4F4",
        fadedFill: "#F9F9F9",
        hover: "#F0F0F0",
      },
    },
  },
  plugins: [],
};
