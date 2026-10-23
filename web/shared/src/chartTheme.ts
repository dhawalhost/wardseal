/**
 * Chart / programmatic theme helpers shared by product apps.
 * Colors resolve from wardseal-ui-kit CSS variables at runtime.
 */

export const colors = {
  primary: "hsl(var(--primary))",
  secondary: "hsl(var(--secondary))",
  success: "hsl(var(--success))",
  warning: "hsl(var(--warning))",
  error: "hsl(var(--destructive))",
  info: "hsl(var(--info))",

  surface: "hsl(var(--background))",
  surfaceContainer: "hsl(var(--surface-container))",
  surfaceContainerLow: "hsl(var(--surface-container-low))",
  onSurface: "hsl(var(--on-surface))",
  onSurfaceVariant: "hsl(var(--on-surface-variant))",

  chart: [
    "hsl(var(--secondary))",
    "hsl(var(--primary))",
    "hsl(var(--success))",
    "hsl(var(--warning))",
    "hsl(var(--muted-foreground))",
    "hsl(var(--destructive))",
    "hsl(199 89% 48%)",
    "hsl(222 20% 40%)",
  ],
} as const;

export const radii = {
  sm: "var(--radius-sm)",
  md: "var(--radius-md)",
  lg: "var(--radius-lg)",
  xl: "var(--radius-xl)",
  card: "var(--radius-lg)",
  overlay: "var(--radius-xl)",
  pill: "999px",
} as const;

export const shadows = {
  xs: "var(--shadow-xs)",
  sm: "var(--shadow-sm)",
  card: "var(--shadow-card)",
  overlay: "var(--shadow-overlay)",
} as const;

export const spacing = {
  page: "var(--space-page)",
  section: "var(--space-section)",
  card: "var(--space-card)",
  row: "var(--space-card)",
} as const;

export const chartTooltipStyle = {
  contentStyle: {
    backgroundColor: "hsl(var(--card))",
    borderRadius: radii.card,
    border: "none",
    boxShadow: "0 10px 40px -10px hsla(var(--on-surface)/0.2)",
    padding: "16px",
  },
  itemStyle: { color: colors.primary, fontWeight: "bold", fontSize: "12px" },
  labelStyle: {
    color: colors.onSurfaceVariant,
    fontWeight: "bold",
    fontSize: "10px",
    marginBottom: "8px",
  },
  cursor: { stroke: colors.primary, strokeWidth: 2, strokeDasharray: "4 4" },
} as const;

export const chartGridStyle = {
  strokeDasharray: "8 8",
  vertical: false,
  stroke: "hsl(var(--on-surface)/.05)",
} as const;

export const chartAxisTickStyle = {
  fontSize: 10,
  fontWeight: 700,
  fill: "hsl(var(--on-surface-variant)/.4)",
} as const;
