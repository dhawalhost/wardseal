/** @type {import('tailwindcss').Config} */
import { tailwindPreset } from "@dhawalhost/wardseal-ui-kit/tailwind-preset";

export default {
  darkMode: ["class"],
  presets: [tailwindPreset],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "../ui/src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Plus Jakarta Sans", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      fontSize: {
        detail: ["10px", { lineHeight: "1.4", letterSpacing: "-0.01em" }],
        label: ["11px", { lineHeight: "1.4", letterSpacing: "-0.01em", fontWeight: "700" }],
        caption: ["12px", { lineHeight: "1.5", letterSpacing: "-0.01em" }],
        body: ["14px", { lineHeight: "1.5" }],
        "body-lg": ["16px", { lineHeight: "1.5" }],
        heading: ["20px", { lineHeight: "1.3", letterSpacing: "-0.02em", fontWeight: "700" }],
        title: ["24px", { lineHeight: "1.25", letterSpacing: "-0.02em", fontWeight: "700" }],
        hero: ["32px", { lineHeight: "1.1", letterSpacing: "-0.03em", fontWeight: "800" }],
      },
      // Concrete px — do not use var(--space-*) here. If those CSS vars fail to load,
      // p-card / gap-section / px-page collapse to zero padding (dashboard "no space").
      spacing: {
        page: "40px",
        section: "32px",
        card: "24px",
      },
      colors: {
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
          subtle: "hsl(var(--info-subtle))",
        },
      },
    },
  },
  plugins: [],
};
