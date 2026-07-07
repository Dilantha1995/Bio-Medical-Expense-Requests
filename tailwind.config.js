/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          teal: "#2AACC4",
          red: "#E4372B",
          pink: "#C6377A",
          orange: "#F0A22E",
          navy: "#1F3A5F",
        },
      },
    },
  },
  plugins: [],
};
