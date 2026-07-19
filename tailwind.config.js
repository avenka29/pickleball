/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "court-green": "#A84A30",
        "deep-green": "#26332D",
        "grass-green": "#3C7A54",
        cream: "#EFEBE0",
        "warm-white": "#FAF8F2",
        "pickle-yellow": "#E7B15A",
        "clay-red": "#B23A29",
        "dark-grey": "#26332D",
        "soft-grey": "#E6E0D3",
        ink: "#5C574B",
        "net-line": "#D9D2C2",
      },
      fontFamily: {
        display: ['"Fraunces"', "Georgia", "serif"],
        sans: ['"Archivo"', "system-ui", "sans-serif"],
      },
      borderWidth: {
        3: "2px",
      },
      maxWidth: {
        dashboard: "1180px",
      },
      borderRadius: {
        xl: "14px",
      },
    },
  },
  plugins: [],
};
