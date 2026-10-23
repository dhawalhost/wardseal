/**
 * Programmatic token reference for JS/TS (charts, inline styles, docs).
 * CSS remains authoritative — keep values in sync with styles/tokens.css.
 */

export const brandHex = {
  primary: "#0F172A",
  onPrimary: "#FFFFFF",
  secondary: "#0369A1",
  onSecondary: "#FFFFFF",
  accent: "#E0F2FE",
  background: "#F8FAFC",
  foreground: "#020617",
  card: "#FFFFFF",
  muted: "#E8ECF1",
  mutedForeground: "#475569",
  border: "#E2E8F0",
  destructive: "#DC2626",
  success: "#15803D",
  warning: "#B45309",
  info: "#0369A1",
} as const;

export const space = {
  xs: "4px",
  sm: "8px",
  md: "16px",
  lg: "24px",
  xl: "32px",
  "2xl": "48px",
  "3xl": "64px",
  page: "40px",
  section: "32px",
  card: "24px",
} as const;

export const radius = {
  sm: "4px",
  md: "8px",
  lg: "12px",
  xl: "16px",
} as const;

export const fontFamily = {
  sans: '"Plus Jakarta Sans", system-ui, sans-serif',
  mono: '"JetBrains Mono", ui-monospace, monospace',
} as const;

/** CSS variable names for documentation / theme tooling */
export const cssVars = {
  background: "--background",
  foreground: "--foreground",
  primary: "--primary",
  secondary: "--secondary",
  accent: "--accent",
  card: "--card",
  muted: "--muted",
  border: "--border",
  ring: "--ring",
  destructive: "--destructive",
  success: "--success",
  warning: "--warning",
  info: "--info",
  spacePage: "--space-page",
  spaceSection: "--space-section",
  spaceCard: "--space-card",
} as const;

export const tokenMeta = {
  /** MASTER accent/CTA maps to --secondary in runtime CSS */
  ctaToken: "secondary",
  defaultTheme: "light" as const,
  package: "@dhawalhost/wardseal-ui-kit",
};
