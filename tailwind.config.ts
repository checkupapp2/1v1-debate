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
    },
  },
  plugins: [],
};
export default config;
