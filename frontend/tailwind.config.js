/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["'DM Serif Display'", "Georgia", "serif"],
        body:    ["'DM Sans'", "system-ui", "sans-serif"],
        mono:    ["'JetBrains Mono'", "monospace"],
      },
      colors: {
        bone: {
          50:  "#F8F7F4",
          100: "#EFEEE9",
          200: "#DDDBD2",
          300: "#C4C1B5",
          400: "#A8A498",
          500: "#8A8578",
          600: "#6E6A5E",
          700: "#534F46",
          800: "#3A3731",
          900: "#211F1C",
        },
        cancer: {
          light: "#FFF1F0",
          mid:   "#FF6B6B",
          deep:  "#C0392B",
        },
        healthy: {
          light: "#F0FDF4",
          mid:   "#4CAF50",
          deep:  "#1B5E20",
        },
        warn: {
          light: "#FFFBEB",
          mid:   "#F59E0B",
          deep:  "#92400E",
        },
      },
      animation: {
        "fade-up":    "fadeUp 0.5s ease forwards",
        "fade-in":    "fadeIn 0.4s ease forwards",
        "pulse-slow": "pulse 3s ease-in-out infinite",
        "scan-line":  "scanLine 2s linear infinite",
        "spin-slow":  "spin 3s linear infinite",
      },
      keyframes: {
        fadeUp: {
          "0%":   { opacity: 0, transform: "translateY(20px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
        fadeIn: {
          "0%":   { opacity: 0 },
          "100%": { opacity: 1 },
        },
        scanLine: {
          "0%":   { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(400%)" },
        },
      },
      boxShadow: {
        "panel":  "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
        "card":   "0 4px 24px rgba(0,0,0,0.07), 0 1px 4px rgba(0,0,0,0.04)",
        "lift":   "0 8px 32px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06)",
        "glow-red":   "0 0 24px rgba(192,57,43,0.18)",
        "glow-green": "0 0 24px rgba(76,175,80,0.18)",
      },
    },
  },
  plugins: [],
};
