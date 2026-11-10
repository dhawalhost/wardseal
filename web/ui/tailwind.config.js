/** @type {import('tailwindcss').Config} */
import { tailwindPreset } from "./src/tailwind-preset.ts";

/**
 * Storybook / local Tailwind config.
 * Always extend the kit preset so utilities match production apps.
 */
export default {
  darkMode: ["class"],
  presets: [tailwindPreset],
  content: ["./src/**/*.{js,ts,jsx,tsx}", "./.storybook/**/*.{js,ts,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [],
};
