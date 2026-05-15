/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        felt: {
          50: "#e7f1ec",
          100: "#bfd9cb",
          200: "#8fbca5",
          300: "#5b9c7d",
          400: "#2f7d5a",
          500: "#185f42",
          600: "#0f4a32",
          700: "#0c3d2a",
          800: "#0a3122",
          900: "#08251a",
        },
        gold: {
          400: "#e6c177",
          500: "#d4a574",
          600: "#b88652",
          700: "#8d6438",
        },
        ink: {
          900: "#0b0f14",
          800: "#121821",
        },
      },
      boxShadow: {
        card: "0 8px 24px -8px rgba(0,0,0,0.55), 0 2px 4px rgba(0,0,0,0.35)",
        "card-hover": "0 16px 36px -10px rgba(0,0,0,0.65), 0 2px 6px rgba(0,0,0,0.4)",
        glow: "0 0 0 3px rgba(230,193,119,0.55), 0 0 22px rgba(230,193,119,0.55)",
        "glow-soft": "0 0 0 2px rgba(230,193,119,0.35), 0 0 14px rgba(230,193,119,0.35)",
      },
      fontFamily: {
        display: ['"Cinzel"', "serif"],
        sans: ['"Inter"', "system-ui", "sans-serif"],
      },
      keyframes: {
        pulseRing: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(230,193,119,0.7)" },
          "50%": { boxShadow: "0 0 0 10px rgba(230,193,119,0)" },
        },
        floatIn: {
          "0%": { opacity: "0", transform: "translateY(8px) scale(.98)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        pulseRing: "pulseRing 1.6s cubic-bezier(0.4,0,0.6,1) infinite",
        floatIn: "floatIn .35s ease-out both",
        shimmer: "shimmer 2.4s linear infinite",
      },
      backgroundImage: {
        "felt-radial":
          "radial-gradient(ellipse at center, #185f42 0%, #0c3d2a 55%, #08251a 100%)",
        "felt-table":
          "radial-gradient(ellipse at center, #2f7d5a 0%, #0f4a32 50%, #0a3122 100%)",
      },
    },
  },
  plugins: [],
};
