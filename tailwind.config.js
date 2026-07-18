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
        "pickle-yellow": "#E8C84A",
        "clay-red": "#D22B2B",
        "midnight-blue": "#191970",
        "sky-blue": "#ADD8E6",
        "wimbledon-purple": "#800080",
        ink: "#1D241F",
        "net-line": "#D8C59B",
      },
      fontFamily: {
        display: ['"Baloo 2"', "Cooper Black", "serif"],
        sans: ["Nunito", "Inter", "system-ui", "sans-serif"],
      },
      borderWidth: {
        3: "3px",
      },
      maxWidth: {
        dashboard: "1180px",
      },
      borderRadius: {
        xl: "12px",
      },
    },
  },
  plugins: [],
};
