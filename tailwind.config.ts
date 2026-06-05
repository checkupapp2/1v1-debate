import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        checkup: {
          orange: "#F9A825",
          black: "#1E1E1E",
          white: "#FFFFFF",
        },
      },
      fontFamily: {
        display: ["Impact", "Oswald", "sans-serif"],
      },
      keyframes: {
        growBar: {
          from: { width: "0%" },
          to: { width: "var(--bar-width)" },
        },
        fadeUp: {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        popIn: {
          "0%": { transform: "scale(0.8)", opacity: "0" },
          "70%": { transform: "scale(1.1)" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        slideUp: {
          from: { transform: "translateY(20px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        confetti: {
          "0%": { transform: "translateY(0) rotate(0deg)", opacity: "1" },
          "100%": { transform: "translateY(-200px) rotate(720deg)", opacity: "0" },
        },
      },
      animation: {
        growBar: "growBar 1.1s ease-out forwards",
        fadeUp: "fadeUp 0.5s ease-out both",
        popIn: "popIn 0.4s ease-out forwards",
        slideUp: "slideUp 0.5s ease-out forwards",
        shimmer: "shimmer 2s linear infinite",
        confetti: "confetti 1.5s ease-out forwards",
      },
    },
  },
  plugins: [],
};
export default config;