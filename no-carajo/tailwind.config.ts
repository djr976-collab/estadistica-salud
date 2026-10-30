import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        noche: { 950: "#050a1a", 900: "#0a1330", 800: "#0f1d45", 700: "#16275c" },
        guardia: { DEFAULT: "#ff2e4d", dark: "#c4122f" },
        neon: { cyan: "#22e4ff", lima: "#b6ff3b", rosa: "#ff4fd8" },
      },
      fontFamily: { display: ["var(--font-display)", "system-ui", "sans-serif"] },
      boxShadow: {
        neon: "0 0 12px rgba(34,228,255,.55), 0 0 32px rgba(34,228,255,.25)",
        rojo: "0 0 14px rgba(255,46,77,.7), 0 0 40px rgba(255,46,77,.35)",
        lima: "0 0 14px rgba(182,255,59,.6), 0 0 36px rgba(182,255,59,.25)",
      },
    },
  },
  plugins: [],
} satisfies Config;
