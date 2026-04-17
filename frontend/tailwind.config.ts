import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0A0612",
        surface: "#100B1E",
        foreground: "#F0EAD6",
        primary: {
          50:  "#FDF9E7",
          100: "#FAF0BF",
          200: "#F5E07A",
          300: "#F0C842",
          400: "#D4AF37",
          500: "#B8960F",
          600: "#9A7A08",
          700: "#7A5F06",
          800: "#5A4404",
          900: "#3A2C02",
          DEFAULT: "#D4AF37",
        },
        secondary: {
          50:  "#F3E8FF",
          100: "#E4C6FF",
          200: "#C98EFF",
          300: "#A855F7",
          400: "#9D50E0",
          500: "#7B2FBE",
          600: "#5A1A9A",
          700: "#3D0F73",
          800: "#250852",
          900: "#1A0533",
          DEFAULT: "#7B2FBE",
        },
        muted: {
          DEFAULT: "#1E1430",
          foreground: "#8B7FA8",
        },
        border: "rgba(212, 175, 55, 0.12)",
        input: "rgba(212, 175, 55, 0.08)",
        success: "#10b981",
        error:   "#ef4444",
        warning: "#F59E0B",
      },
      borderRadius: {
        xl:  "12px",
        lg:  "10px",
        md:  "8px",
        sm:  "6px",
      },
      fontFamily: {
        serif: ["'Cormorant Garamond'", "Georgia", "serif"],
        sans:  ["Inter", "system-ui", "sans-serif"],
      },
      fontSize: {
        "display-2xl": ["4.5rem",  { lineHeight: "1.1", letterSpacing: "-0.02em" }],
        "display-xl":  ["3.75rem", { lineHeight: "1.1", letterSpacing: "-0.02em" }],
        "display-lg":  ["3rem",    { lineHeight: "1.15", letterSpacing: "-0.02em" }],
        "display-md":  ["2.25rem", { lineHeight: "1.2",  letterSpacing: "-0.01em" }],
        "display-sm":  ["1.875rem",{ lineHeight: "1.25", letterSpacing: "-0.01em" }],
      },
      boxShadow: {
        "gold-sm":  "0 0 12px rgba(212, 175, 55, 0.15)",
        "gold-md":  "0 0 24px rgba(212, 175, 55, 0.2), 0 0 48px rgba(212, 175, 55, 0.08)",
        "gold-lg":  "0 0 40px rgba(212, 175, 55, 0.25), 0 0 80px rgba(212, 175, 55, 0.1)",
        "purple-sm":"0 0 12px rgba(123, 47, 190, 0.2)",
        "purple-md":"0 0 24px rgba(123, 47, 190, 0.3), 0 0 48px rgba(123, 47, 190, 0.1)",
        "luxury":   "0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(212,175,55,0.06), inset 0 1px 0 rgba(212,175,55,0.1)",
        "luxury-lg":"0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(212,175,55,0.08), inset 0 1px 0 rgba(212,175,55,0.12)",
        "inner-gold":"inset 0 1px 0 rgba(212,175,55,0.15), inset 0 -1px 0 rgba(0,0,0,0.3)",
      },
      backgroundImage: {
        "gold-gradient":         "linear-gradient(135deg, #D4AF37 0%, #F0C842 50%, #B8960F 100%)",
        "gold-gradient-subtle":  "linear-gradient(135deg, rgba(212,175,55,0.15) 0%, rgba(240,200,66,0.05) 100%)",
        "purple-gradient":       "linear-gradient(135deg, #7B2FBE 0%, #9D50E0 100%)",
        "luxury-bg":             "radial-gradient(ellipse at 20% 50%, rgba(123,47,190,0.08) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(212,175,55,0.05) 0%, transparent 50%), linear-gradient(180deg, #0A0612 0%, #0D0919 100%)",
        "card-gradient":         "linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)",
        "sidebar-gradient":      "linear-gradient(180deg, #0D0920 0%, #080614 100%)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(20px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in-fast": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-right": {
          from: { opacity: "0", transform: "translateX(30px)" },
          to:   { opacity: "1", transform: "translateX(0)" },
        },
        "slide-in-left": {
          from: { opacity: "0", transform: "translateX(-30px)" },
          to:   { opacity: "1", transform: "translateX(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.92)" },
          to:   { opacity: "1", transform: "scale(1)" },
        },
        "shimmer": {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "pulse-gold": {
          "0%, 100%": { boxShadow: "0 0 12px rgba(212,175,55,0.2)" },
          "50%":       { boxShadow: "0 0 28px rgba(212,175,55,0.4), 0 0 60px rgba(212,175,55,0.15)" },
        },
        "orbit-slow": {
          from: { transform: "rotate(0deg)" },
          to:   { transform: "rotate(360deg)" },
        },
        "orbit-reverse": {
          from: { transform: "rotate(360deg)" },
          to:   { transform: "rotate(0deg)" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%":      { transform: "translateY(-8px)" },
        },
        "glow-pulse": {
          "0%, 100%": { opacity: "0.6" },
          "50%":      { opacity: "1" },
        },
        "shooting-star": {
          from: { transform: "translateY(0) translateX(0)", opacity: "1" },
          to:   { transform: "translateY(400px) translateX(-400px)", opacity: "0" },
        },
        "typing": {
          "0%, 60%, 100%": { opacity: "0.2", transform: "scale(0.8)" },
          "30%":            { opacity: "1",   transform: "scale(1)" },
        },
      },
      animation: {
        "fade-in":       "fade-in 0.8s ease-out both",
        "fade-in-fast":  "fade-in-fast 0.4s ease-out both",
        "slide-in-right":"slide-in-right 0.6s ease-out both",
        "slide-in-left": "slide-in-left 0.6s ease-out both",
        "scale-in":      "scale-in 0.5s ease-out both",
        "shimmer":       "shimmer 2.5s linear infinite",
        "pulse-gold":    "pulse-gold 3s ease-in-out infinite",
        "orbit-slow":    "orbit-slow 30s linear infinite",
        "orbit-reverse": "orbit-reverse 20s linear infinite",
        "float":         "float 6s ease-in-out infinite",
        "glow-pulse":    "glow-pulse 2s ease-in-out infinite",
        "shooting-star": "shooting-star 1s ease-out forwards",
        "typing-1":      "typing 1.2s ease-in-out infinite 0s",
        "typing-2":      "typing 1.2s ease-in-out infinite 0.2s",
        "typing-3":      "typing 1.2s ease-in-out infinite 0.4s",
      },
      transitionTimingFunction: {
        "luxury": "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
      },
      transitionDuration: {
        "250": "250ms",
        "350": "350ms",
        "450": "450ms",
      },
    },
  },
  plugins: [],
};

export default config;
