/**
 * Programmatic token reference for JS/TS (charts, inline styles, docs).
 * CSS (styles/tokens.css) is authoritative. Hex values here are the exact sRGB
 * conversion of the CSS HSL channels — `npm run check:tokens` fails if they drift.
 */

/** Light theme (default). Keys kept stable for existing consumers. */
export const brandHex = {
  primary: "#14151A",
  onPrimary: "#F8F6F2",
  secondary: "#14151A",
  onSecondary: "#F8F6F2",
  accent: "#F4EEE1",
  background: "#F7F6F2",
  foreground: "#14161A",
  card: "#FEFEFD",
  muted: "#F2F1ED",
  mutedForeground: "#54504A",
  subtleForeground: "#66625C",
  border: "#E5E2DC",
  input: "#7F7971",
  ring: "#826630",
  destructive: "#CE2222",
  success: "#246B45",
  successSubtle: "#E2F3E8",
  successSubtleForeground: "#1A5B38",
  warning: "#B64A0C",
  warningSubtle: "#FCEDDE",
  warningSubtleForeground: "#8E370B",
  error: "#CE2222",
  errorSubtle: "#FCE8E8",
  errorSubtleForeground: "#B11B1B",
  info: "#425A76",
  infoSubtle: "#E6EBF0",
  infoSubtleForeground: "#2F435B",
} as const;

/** Dark theme — same keys as brandHex. */
export const brandHexDark = {
  primary: "#F0ECE6",
  onPrimary: "#121317",
  secondary: "#F0ECE6",
  onSecondary: "#121317",
  accent: "#352C1D",
  background: "#111110",
  foreground: "#F2EFE9",
  card: "#181716",
  muted: "#23211F",
  mutedForeground: "#BBB7AF",
  subtleForeground: "#A29D96",
  border: "#282624",
  input: "#7E7972",
  ring: "#C9A65E",
  destructive: "#EF4343",
  success: "#2E9E6A",
  successSubtle: "#153225",
  successSubtleForeground: "#85E0AB",
  warning: "#F37616",
  warningSubtle: "#2E1E14",
  warningSubtleForeground: "#F7AE6E",
  error: "#EF4343",
  errorSubtle: "#361212",
  errorSubtleForeground: "#F58989",
  info: "#819EBB",
  infoSubtle: "#1F262E",
  infoSubtleForeground: "#BACCDE",
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
