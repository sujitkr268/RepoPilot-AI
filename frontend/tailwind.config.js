/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#080b10",
        surface: "#0f141c",
        "surface-card": "#151b26",
        "surface-border": "#1e293b",
        primary: {
          DEFAULT: "#10b981", // emerald
          hover: "#059669",
        },
        accent: {
          blue: "#38bdf8",
          purple: "#a855f7",
          amber: "#f59e0b",
          rose: "#f43f5e",
        },
      },
    },
  },
  plugins: [],
};
