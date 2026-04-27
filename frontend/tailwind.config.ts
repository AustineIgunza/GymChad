import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        gym: {
          bg: "#0b1220",
          card: "#111827",
          accent: "#22c55e",
          text: "#e5e7eb",
          muted: "#9ca3af",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
