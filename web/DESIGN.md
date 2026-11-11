# Identity Platform Design System & Constraints

Source of truth for product direction: [`design-system/wardseal/MASTER.md`](../design-system/wardseal/MASTER.md).
Token + component SoT: [`@dhawalhost/wardseal-ui-kit`](../wardseal-ui-kit) (workspace mirror [`ui/`](ui/)).

1. **THEME (light-first):** Warm paper surfaces, ink (`bg-primary`, also the CTA `bg-secondary`) for text and actions, brass (`bg-brand`, `ring`) only for the seal, focus and signature details. Optional `.dark` mode uses warm graphite. No blue brand colour.
2. **TYPOGRAPHY:** Geist for UI and display, Geist Mono for IDs, timestamps and code. Use the kit type scale (`text-title-lg`, `text-title`, `text-heading`, `text-body`, `text-caption`). Body text ≥16px where primary content; dense tables may use 14px with adequate line-height.
3. **ACCESSIBILITY (WCAG 2.1 AA):** High contrast. Interactive elements MUST use `focus-visible:ring-2` + offset. `aria-label` on icon-only buttons. Respect `prefers-reduced-motion`.
4. **SUSTAINABILITY:** Lean code. Lucide SVG icons only. No heavy animation libraries (Three.js, etc.).
5. **MOTION:** Micro-interactions only — 150–200ms `ease-in-out` on hovers. No scroll-jacking or page-level transition theater.
6. **AVOID:** Hue gradients and gradient text, glows, emoji-as-icons, glass blur, uppercase tracked labels, 700+ weights, `transition-all`, hover lifts, pulsing dots, unverified claims, playful consumer chrome on trust surfaces (login, MFA, billing). Enforced by `npm run check:craft` in `web/` (kit `THEMES.md` → Craft rules).
7. **LANDING:** Marketing SPA imports kit `tokens.css` and maps local aliases (`--accent` = CTA → kit `--secondary`). Do not fork a second palette.
8. **PRODUCT APPS:** Depend on `@dhawalhost/wardseal-ui-kit@0.5.0`. App layouts (`FilterBar`, `PageSection`, shells) may live in-app but must compose kit components. `@/components/ui/*` primitives are kit re-exports (thin adapters only for API tweaks).
