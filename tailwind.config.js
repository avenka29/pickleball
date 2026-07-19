/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "court-green": "#2E6F40",
        "deep-green": "#235733",
        "grass-green": "#2E6F40",
        cream: "#FAEFD8",
        "warm-white": "#FAEFD8",
        "pickle-yellow": "#F4D068",
        "clay-red": "#C26D4D",
        "burnt-crimson": "#A83232",
        "dark-grey": "#1C2826",
        "soft-grey": "#E7DED0",
        ink: "#1C2826",
        "net-line": "#D7C8A9",
      },
      fontFamily: {
        display: ['"Baloo 2"', '"Cooper Black"', "serif"],
        sans: ['"Nunito"', "system-ui", "sans-serif"],
      },
      borderWidth: {
        3: "3px",
      },
      maxWidth: {
        dashboard: "1240px",
      },
      borderRadius: {
        xl: "16px",
      },
    },
  },
  plugins: [],
};
