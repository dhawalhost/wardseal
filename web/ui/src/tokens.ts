/**
 * Programmatic token reference for JS/TS (charts, inline styles, docs).
 * CSS (styles/tokens.css) is authoritative. Hex values here are the exact sRGB
 * conversion of the CSS HSL channels — `npm run check:tokens` fails if they drift.
 */

/** Light theme (default). Keys kept stable for existing consumers. */
export const brandHex = {
  primary: "#0F1729",
  onPrimary: "#FFFFFF",
  secondary: "#0369A0",
  onSecondary: "#FFFFFF",
  accent: "#E2F5FD",
  background: "#F8FAFC",
  foreground: "#080C16",
  card: "#FFFFFF",
  muted: "#EBEFF5",
  mutedForeground: "#4B5768",
  subtleForeground: "#5A6677",
  border: "#E1E7EF",
  input: "#7A8A9F",
  ring: "#0369A0",
  destructive: "#DC2828",
  success: "#157F3C",
  successSubtle: "#E2F8EB",
  successSubtleForeground: "#116931",
  warning: "#B35309",
  warningSubtle: "#FDF7DD",
  warningSubtleForeground: "#914308",
  error: "#DC2828",
  errorSubtle: "#FCE8E8",
  errorSubtleForeground: "#B11B1B",
  info: "#0369A0",
  infoSubtle: "#E2F5FD",
  infoSubtleForeground: "#024F78",
} as const;

/** Dark theme — same keys as brandHex. */
export const brandHexDark = {
  primary: "#F1F5F9",
  onPrimary: "#0F1729",
  secondary: "#189EDC",
  onSecondary: "#080C16",
  accent: "#18212F",
  background: "#080C16",
  foreground: "#F8FAFC",
  card: "#111822",
  muted: "#18212F",
  mutedForeground: "#94A3B8",
  subtleForeground: "#7D8CA1",
  border: "#1F2A3D",
  input: "#5E6D82",
  ring: "#189EDC",
  destructive: "#DC2828",
  success: "#2E9E6A",
  successSubtle: "#153225",
  successSubtleForeground: "#85E0AB",
  warning: "#DB8B0A",
  warningSubtle: "#2B2612",
  warningSubtleForeground: "#F6CE55",
  error: "#DC2828",
  errorSubtle: "#361212",
  errorSubtleForeground: "#F58989",
  info: "#189EDC",
  infoSubtle: "#173545",
  infoSubtleForeground: "#9FDDF9",
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
