/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "court-green": "#006400",
        "deep-green": "#063B22",
        "grass-green": "#2E8B57",
        cream: "#FFFDD0",
        "warm-white": "#FFFBF0",
        "pickle-yellow": "#E4B83A",
        "clay-red": "#D22B2B",
        "dark-grey": "#2B2B2B",
        "soft-grey": "#EFE9DA",
        ink: "#1D241F",
        "net-line": "#D8C59B",
      },
      fontFamily: {
        display: ['"Baloo 2"', "Cooper Black", "serif"],
        sans: ['"Nunito"', "system-ui", "sans-serif"],
      },
      borderWidth: {
        3: "3px",
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
