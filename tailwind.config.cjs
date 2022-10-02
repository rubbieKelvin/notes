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
        fadedFill: "#F9F9F9",
        hover: "#EEF5FA",
      },
    },
  },
  plugins: [],
};
