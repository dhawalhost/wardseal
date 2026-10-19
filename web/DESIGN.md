# Identity Platform Design System & Constraints

Source of truth for product direction: [`design-system/wardseal/MASTER.md`](../design-system/wardseal/MASTER.md).
Token + component SoT: [`@dhawalhost/wardseal-ui-kit`](../wardseal-ui-kit) (workspace mirror [`ui/`](ui/)).

1. **THEME (light-first):** Default is light slate surfaces (`bg-background` ≈ `#F8FAFC`), navy primary (`#0F172A`), blue CTA (`bg-secondary` / `#0369A1`). Optional `.dark` mode is supported but secondary. Do not use neon cyberpunk green as the default brand color.
2. **TYPOGRAPHY:** Plus Jakarta Sans for UI and display. Body text ≥16px where primary content; dense tables may use 14px with adequate line-height.
3. **ACCESSIBILITY (WCAG 2.1 AA):** High contrast. Interactive elements MUST use `focus-visible:ring-2` + offset. `aria-label` on icon-only buttons. Respect `prefers-reduced-motion`.
4. **SUSTAINABILITY:** Lean code. Lucide SVG icons only. No heavy animation libraries (Three.js, etc.).
5. **MOTION:** Micro-interactions only — 150–200ms `ease-in-out` on hovers. No scroll-jacking or page-level transition theater.
6. **AVOID:** Purple/pink AI gradients, emoji-as-icons, glass-card overuse, playful consumer chrome on trust surfaces (login, MFA, billing).
7. **LANDING:** Marketing SPA imports kit `tokens.css` and maps local aliases (`--accent` = CTA → kit `--secondary`). Do not fork a second palette.
8. **PRODUCT APPS:** Depend on `@dhawalhost/wardseal-ui-kit@0.2.0`. App layouts (`FilterBar`, `PageSection`, shells) may live in-app but must compose kit components. `@/components/ui/*` primitives are kit re-exports (thin adapters only for API tweaks).
