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
