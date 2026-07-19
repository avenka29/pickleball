/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "court-green": "#1D4A34",
        "deep-green": "#12261C",
        "grass-green": "#1E8E5A",
        cream: "#F4F5F1",
        "warm-white": "#FFFFFF",
        "pickle-yellow": "#CBFF3D",
        "clay-red": "#C93A22",
        "dark-grey": "#12261C",
        "soft-grey": "#E8EAE3",
        ink: "#3A453D",
        "net-line": "#D6D9CE",
      },
      fontFamily: {
        display: ['"Anton"', "Arial Black", "sans-serif"],
        sans: ['"Archivo"', "system-ui", "sans-serif"],
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
