/**
 * Programmatic token reference for JS/TS (charts, inline styles, docs).
 * CSS (styles/tokens.css) is authoritative. Hex values here are the exact sRGB
 * conversion of the CSS HSL channels — `npm run check:tokens` fails if they drift.
 */

/** Light theme (default). Keys kept stable for existing consumers. */
export const brandHex = {
  primary: "#11192C",
  onPrimary: "#FFFFFF",
  secondary: "#075EA2",
  onSecondary: "#FFFFFF",
  accent: "#EBF3FA",
  background: "#F6F7F9",
  foreground: "#10141E",
  card: "#FFFFFF",
  muted: "#F0F2F4",
  mutedForeground: "#4A515E",
  subtleForeground: "#5C6370",
  border: "#E2E4E9",
  input: "#747C8B",
  ring: "#075EA2",
  destructive: "#CE2222",
  success: "#157F3C",
  successSubtle: "#E2F8EB",
  successSubtleForeground: "#116931",
  warning: "#B35309",
  warningSubtle: "#FDF7DD",
  warningSubtleForeground: "#914308",
  error: "#CE2222",
  errorSubtle: "#FCE8E8",
  errorSubtleForeground: "#B11B1B",
  info: "#075EA2",
  infoSubtle: "#E8F4FC",
  infoSubtleForeground: "#054576",
} as const;

/** Dark theme — same keys as brandHex. */
export const brandHexDark = {
  primary: "#F0F1F5",
  onPrimary: "#0F121A",
  secondary: "#3FA2F3",
  onSecondary: "#0B0D14",
  accent: "#1C1F26",
  background: "#0B0D14",
  foreground: "#F0F1F5",
  card: "#12151C",
  muted: "#1C1F26",
  mutedForeground: "#A9AFBC",
  subtleForeground: "#9096A2",
  border: "#21242C",
  input: "#6B7280",
  ring: "#3FA2F3",
  destructive: "#EF4343",
  success: "#2E9E6A",
  successSubtle: "#153225",
  successSubtleForeground: "#85E0AB",
  warning: "#DB8B0A",
  warningSubtle: "#2B2612",
  warningSubtleForeground: "#F6CE55",
  error: "#EF4343",
  errorSubtle: "#361212",
  errorSubtleForeground: "#F58989",
  info: "#3FA2F3",
  infoSubtle: "#182A39",
  infoSubtleForeground: "#A8D5FA",
} as const satisfies Record<keyof typeof brandHex, string>;

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
  "3xl": "24px",
  full: "9999px",
} as const;

export const motion = {
  durationFast: "150ms",
  durationBase: "200ms",
  durationSlow: "300ms",
  easeStandard: "cubic-bezier(0.4, 0, 0.2, 1)",
  easeEnter: "cubic-bezier(0, 0, 0.2, 1)",
  easeExit: "cubic-bezier(0.4, 0, 1, 1)",
} as const;

export const fontFamily = {
  sans: '"Geist", ui-sans-serif, system-ui, sans-serif',
  mono: '"Geist Mono", ui-monospace, "SF Mono", monospace',
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
  input: "--input",
  outline: "--outline",
  ring: "--ring",
  onSurfaceVariant: "--on-surface-variant",
  onSurfaceSubtle: "--on-surface-subtle",
  destructive: "--destructive",
  success: "--success",
  warning: "--warning",
  error: "--error",
  info: "--info",
  spacePage: "--space-page",
  spaceSection: "--space-section",
  spaceCard: "--space-card",
  durationFast: "--duration-fast",
  durationBase: "--duration-base",
} as const;

export const tokenMeta = {
  /** MASTER accent/CTA maps to --secondary in runtime CSS */
  ctaToken: "secondary",
  defaultTheme: "light" as const,
  package: "@dhawalhost/wardseal-ui-kit",
};
