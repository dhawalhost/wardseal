import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge must know the preset's custom scales, otherwise it treats
 * e.g. `text-label` as a text *colour* and drops it when a colour class follows.
 * Keep in sync with tailwind-preset.ts.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: ["label"] }],
      shadow: [{ shadow: ["xs", "card", "overlay"] }],
      duration: [{ duration: ["fast", "base", "slow"] }],
      ease: [{ ease: ["standard", "enter", "exit"] }],
      p: [{ p: ["page", "section", "card"] }],
      px: [{ px: ["page", "section", "card"] }],
      py: [{ py: ["page", "section", "card"] }],
      gap: [{ gap: ["page", "section", "card"] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
