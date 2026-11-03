export const tailwindPreset = {
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",

        // ── Surface scale (Theming enabled) ──
        surface: {
          DEFAULT: "hsl(var(--surface))",
          dim: "hsl(var(--surface-dim))",
          bright: "hsl(var(--surface-bright))",
          container: {
            lowest: "hsl(var(--surface-container-lowest))",
            low: "hsl(var(--surface-container-low))",
            DEFAULT: "hsl(var(--surface-container))",
            high: "hsl(var(--surface-container-high))",
            highest: "hsl(var(--surface-container-highest))",
          },
        },
        "on-surface": {
          DEFAULT: "hsl(var(--on-surface))",
          variant: "hsl(var(--on-surface-variant))",
          /** Tertiary text (labels, captions, placeholders) — ≥4.5:1. Use instead of text-on-surface-variant/NN. */
          subtle: "hsl(var(--on-surface-subtle))",
        },
        inverse: "hsl(var(--surface-inverse))",
        "on-inverse": "hsl(var(--on-surface-inverse))",
        outline: {
          DEFAULT: "hsl(var(--outline))",
          variant: "hsl(var(--outline-variant))",
        },

        // ── Brand colors ──
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--on-primary))",
          container: "hsl(var(--primary-container))",
          "on-container": "hsl(var(--on-primary-container))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--on-secondary))",
          container: "hsl(var(--secondary-container))",
          "on-container": "hsl(var(--on-secondary-container))",
        },
        // Material-style aliases (optional; prefer text-primary-foreground in components)
        "on-primary": "hsl(var(--on-primary))",
        "on-secondary": "hsl(var(--on-secondary))",

        // ── Semantic state colors ──
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
          subtle: "hsl(var(--success-subtle))",
          "subtle-foreground": "hsl(var(--success-subtle-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
          subtle: "hsl(var(--warning-subtle))",
          "subtle-foreground": "hsl(var(--warning-subtle-foreground))",
        },
        error: {
          DEFAULT: "hsl(var(--error))",
          foreground: "hsl(var(--error-foreground))",
          subtle: "hsl(var(--error-subtle))",
          "subtle-foreground": "hsl(var(--error-subtle-foreground))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
          subtle: "hsl(var(--info-subtle))",
          "subtle-foreground": "hsl(var(--info-subtle-foreground))",
        },

        // ── shadcn compat ──
        // Note: `--secondary` is the brand CTA blue (MASTER accent). `--accent` is soft fill.
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },

      // ── Type tokens ──
      // `label`: 12px semibold — the floor for UI labels, table headers, captions.
      fontSize: {
        label: ["0.75rem", { lineHeight: "1rem", letterSpacing: "0.02em", fontWeight: "600" }],
      },

      fontFamily: {
        sans: ["Plus Jakarta Sans", "system-ui", "sans-serif"],
        display: ["Plus Jakarta Sans", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },

      // ── Border radius scale ──
      borderRadius: {
        sm: "var(--radius-sm)",
        DEFAULT: "var(--radius-md)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        // Legacy: 2xl === xl (16px) — 50+ app usages depend on it. Prefer `xl` in new code.
        "2xl": "var(--radius-xl)",
        "3xl": "var(--radius-3xl)",
        full: "var(--radius-full)",
      },

      // ── Box shadow scale ──
      boxShadow: {
        xs: "var(--shadow-xs)",
        sm: "var(--shadow-sm)",
        card: "var(--shadow-card)",
        overlay: "var(--shadow-overlay)",
      },

      // ── Layout spacing (do not remap sm/md/lg — keeps Tailwind scale intact) ──
      // Fallbacks keep utilities usable if token CSS fails to load.
      spacing: {
        page: "var(--space-page, 40px)",
        section: "var(--space-section, 32px)",
        card: "var(--space-card, 24px)",
      },

      // ── Keyframes & Animations ──
      // Keyframes use the standalone `translate` / `scale` properties, not `transform`,
      // so they compose with positioning transforms (e.g. a centred dialog's
      // -translate-x-1/2) instead of overwriting them mid-animation.
      keyframes: {
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "fade-out": { from: { opacity: "1" }, to: { opacity: "0" } },
        "slide-up": { from: { opacity: "0", translate: "0 8px" }, to: { opacity: "1", translate: "0 0" } },
        "scale-in": { from: { opacity: "0", scale: "0.96" }, to: { opacity: "1", scale: "1" } },
        "scale-out": { from: { opacity: "1", scale: "1" }, to: { opacity: "0", scale: "0.96" } },
        "slide-in-right": { from: { translate: "100% 0" }, to: { translate: "0 0" } },
        "slide-out-right": { from: { translate: "0 0" }, to: { translate: "100% 0" } },
        "slide-in-left": { from: { translate: "-100% 0" }, to: { translate: "0 0" } },
        "slide-out-left": { from: { translate: "0 0" }, to: { translate: "-100% 0" } },
        "slide-in-top": { from: { translate: "0 -100%" }, to: { translate: "0 0" } },
        "slide-out-top": { from: { translate: "0 0" }, to: { translate: "0 -100%" } },
        "slide-in-bottom": { from: { translate: "0 100%" }, to: { translate: "0 0" } },
        "slide-out-bottom": { from: { translate: "0 0" }, to: { translate: "0 100%" } },
      },
      animation: {
        "fade-in": "fade-in var(--duration-base, 200ms) var(--ease-enter, ease-out)",
        "fade-out": "fade-out var(--duration-fast, 150ms) var(--ease-exit, ease-in) forwards",
        "slide-up": "slide-up var(--duration-base, 200ms) var(--ease-enter, ease-out)",
        "scale-in": "scale-in var(--duration-base, 200ms) var(--ease-enter, ease-out)",
        "scale-out": "scale-out var(--duration-fast, 150ms) var(--ease-exit, ease-in) forwards",
        // Sheets travel further, so they get the slow duration on enter.
        "slide-in-right": "slide-in-right var(--duration-slow, 300ms) var(--ease-enter, ease-out)",
        "slide-out-right": "slide-out-right var(--duration-base, 200ms) var(--ease-exit, ease-in) forwards",
        "slide-in-left": "slide-in-left var(--duration-slow, 300ms) var(--ease-enter, ease-out)",
        "slide-out-left": "slide-out-left var(--duration-base, 200ms) var(--ease-exit, ease-in) forwards",
        "slide-in-top": "slide-in-top var(--duration-slow, 300ms) var(--ease-enter, ease-out)",
        "slide-out-top": "slide-out-top var(--duration-base, 200ms) var(--ease-exit, ease-in) forwards",
        "slide-in-bottom": "slide-in-bottom var(--duration-slow, 300ms) var(--ease-enter, ease-out)",
        "slide-out-bottom": "slide-out-bottom var(--duration-base, 200ms) var(--ease-exit, ease-in) forwards",
      },

      // ── Motion tokens ──
      transitionDuration: {
        fast: "var(--duration-fast, 150ms)",
        DEFAULT: "var(--duration-base, 200ms)",
        base: "var(--duration-base, 200ms)",
        slow: "var(--duration-slow, 300ms)",
      },
      transitionTimingFunction: {
        DEFAULT: "var(--ease-standard, cubic-bezier(0.4, 0, 0.2, 1))",
        standard: "var(--ease-standard, cubic-bezier(0.4, 0, 0.2, 1))",
        enter: "var(--ease-enter, cubic-bezier(0, 0, 0.2, 1))",
        exit: "var(--ease-exit, cubic-bezier(0.4, 0, 1, 1))",
      },
    },
  },
};
