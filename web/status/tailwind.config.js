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
