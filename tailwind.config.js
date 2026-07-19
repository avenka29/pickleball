/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "court-green": "#1B4B73",
        "deep-green": "#10202B",
        "grass-green": "#2E7D4F",
        cream: "#F1F4F2",
        "warm-white": "#FFFFFF",
        "pickle-yellow": "#D7E021",
        "clay-red": "#C4362B",
        "dark-grey": "#10202B",
        "soft-grey": "#E3E8E3",
        ink: "#33424A",
        "net-line": "#D7DEDA",
      },
      fontFamily: {
        display: ['"Anton"', '"Archivo Narrow"', "sans-serif"],
        sans: ['"IBM Plex Sans"', "system-ui", "sans-serif"],
        mono: ['"IBM Plex Mono"', "ui-monospace", "monospace"],
      },
      borderWidth: {
        3: "2px",
      },
      maxWidth: {
        dashboard: "1180px",
      },
      borderRadius: {
        xl: "10px",
      },
    },
  },
  plugins: [],
};
