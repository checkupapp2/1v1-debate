import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        checkup: {
          // Exact colors from AppColors in the Check-Up Flutter app
          orange:       "#FF9800",  // primaryOrange / orangeGradientStart
          "orange-deep":"#FF5722",  // darkOrange / orangeGradientEnd
          "orange-mid": "#FF6B35",  // accent between the two
          black:        "#0A0A0A",  // true app background
          "surface-1":  "#1A1A1A",  // primaryBlack (cards, sheets)
          "surface-2":  "#2A2A2A",  // secondaryBlack (slightly lifted)
          "surface-3":  "#333333",  // darkGray (dividers, inactive)
          "surface-4":  "#3A3A3A",  // mid surface
          white:        "#FFFFFF",
        },
      },
      fontFamily: {
        // Montserrat is the Check-Up app's primary font (275 occurrences vs nothing else)
        display: ["'Montserrat'", "Impact", "Oswald", "sans-serif"],
        body:    ["'Montserrat'", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        // The core orange gradient used on every CTA in the app
        "cu-orange": "linear-gradient(135deg, #FF9800 0%, #FF5722 100%)",
        "cu-orange-v": "linear-gradient(180deg, #FF9800 0%, #FF5722 100%)",
        // Card/surface gradient (bottom-nav background)
        "cu-surface": "linear-gradient(180deg, #1A1A1A 0%, #0A0A0A 100%)",
      },
      boxShadow: {
        // Orange glow — used on selected nav items, FAB, active cards
        "cu-glow":   "0 4px 14px rgba(255,152,0,0.45), 0 2px 4px rgba(255,152,0,0.2)",
        "cu-glow-sm":"0 2px 8px rgba(255,152,0,0.35)",
        "cu-glow-lg":"0 6px 24px rgba(255,152,0,0.5), 0 0 48px rgba(255,152,0,0.15)",
      },
      keyframes: {
        growBar: {
          from: { width: "0%" },
          to:   { width: "var(--bar-width)" },
        },
        fadeUp: {
          from: { opacity: "0", transform: "translateY(8px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        popIn: {
          "0%":   { transform: "scale(0.8)",  opacity: "0" },
          "70%":  { transform: "scale(1.08)" },
          "100%": { transform: "scale(1)",    opacity: "1" },
        },
        slideUp: {
          from: { transform: "translateY(20px)", opacity: "0" },
          to:   { transform: "translateY(0)",    opacity: "1" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        confetti: {
          "0%":   { transform: "translateY(0) rotate(0deg)",    opacity: "1" },
          "100%": { transform: "translateY(-200px) rotate(720deg)", opacity: "0" },
        },
        orangePulse: {
          "0%, 100%": { boxShadow: "0 0 12px rgba(255,152,0,0.3)" },
          "50%":      { boxShadow: "0 0 24px rgba(255,152,0,0.6)" },
        },
        shimmerSlide: {
          "0%":   { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(400%)" },
        },
      },
      animation: {
        growBar:     "growBar 1.1s ease-out forwards",
        fadeUp:      "fadeUp 0.5s ease-out both",
        popIn:       "popIn 0.4s ease-out forwards",
        slideUp:     "slideUp 0.5s ease-out forwards",
        shimmer:     "shimmer 2s linear infinite",
        confetti:    "confetti 1.5s ease-out forwards",
        orangePulse: "orangePulse 2s ease-in-out infinite",
        shimmerSlide:"shimmerSlide 1.8s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
