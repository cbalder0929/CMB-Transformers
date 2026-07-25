import type { Config } from "tailwindcss";

/**
 * Palette sampled directly from the low-poly gradient artwork.
 * The image runs warm (bottom-left) → magenta → deep indigo (bottom-right)
 * → blue → cyan (top-right). Every accent below is pulled from a real pixel
 * in that image, which is why the UI and the background never fight.
 */
const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Sampled facet colors
        amber: { DEFAULT: "#EDA149" },
        flame: { DEFAULT: "#F56A29" },
        ember: { DEFAULT: "#D83627" },
        rose: { DEFAULT: "#A41B47" },
        plum: { DEFAULT: "#6E2576" },
        azure: { DEFAULT: "#6098D3" },
        cyan: { DEFAULT: "#56D3D7" },
        aqua: { DEFAULT: "#7AF0E4" },

        // Deep indigo base, extended down from the artwork's darkest corner
        night: {
          950: "#07041A",
          900: "#0B0726",
          800: "#120C38",
          700: "#1B1250",
          600: "#27106B",
          500: "#3A2490",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      letterSpacing: {
        tightest: "-0.045em",
      },
      backgroundImage: {
        "facet-warm": "linear-gradient(135deg, #EDA149 0%, #F56A29 45%, #D83627 100%)",
        "facet-cool": "linear-gradient(135deg, #56D3D7 0%, #6098D3 55%, #3A2490 100%)",
        "facet-full":
          "linear-gradient(120deg, #EDA149 0%, #F56A29 18%, #D83627 34%, #A41B47 50%, #6E2576 66%, #27106B 80%, #6098D3 92%, #7AF0E4 100%)",
      },
      boxShadow: {
        glow: "0 20px 60px -18px rgba(245, 106, 41, 0.55)",
        "glow-cool": "0 20px 60px -18px rgba(86, 211, 215, 0.4)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        drift: {
          "0%,100%": { transform: "translate3d(0,0,0) scale(1)" },
          "50%": { transform: "translate3d(-1.5%, -1%, 0) scale(1.04)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.6s cubic-bezier(0.16,1,0.3,1) both",
        drift: "drift 24s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
