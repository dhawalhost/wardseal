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
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
          subtle: "hsl(var(--warning-subtle))",
        },
        error: {
          DEFAULT: "hsl(var(--error))",
          foreground: "hsl(var(--error-foreground))",
          subtle: "hsl(var(--error-subtle))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
          subtle: "hsl(var(--info-subtle))",
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
        "2xl": "16px",
        "3xl": "24px",
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
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.3s ease-out",
        "slide-up": "slide-up 0.3s ease-out",
        "scale-in": "scale-in 0.2s ease-out",
      },
    },
  },
};
