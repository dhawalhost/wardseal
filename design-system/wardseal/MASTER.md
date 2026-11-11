# Design System Master File

> **LOGIC:** When building a specific page, first check `design-system/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** WardSeal
**Generated:** 2026-10-12 21:39:06
**Category:** B2B Service

---

## Global Rules

### Color Palette

| Role | Hex | CSS Variable |
|------|-----|--------------|
| Primary (ink) | `#14161B` | `--primary` |
| On Primary | `#FFFFFF` | `--color-on-primary` |
| Secondary | `#334155` | `--color-secondary` |
| On Secondary | `#FFFFFF` | `--color-on-secondary` |
| Accent/CTA | `#0369A1` | `--color-accent` |
| On Accent/CTA | `#FFFFFF` | `--color-on-accent` |
| Background | `#F8FAFC` | `--color-background` |
| Foreground | `#020617` | `--color-foreground` |
| Card | `#FFFFFF` | `--color-card` |
| Card Foreground | `#020617` | `--color-card-foreground` |
| Muted | `#E8ECF1` | `--color-muted` |
| Muted Foreground | `#475569` | `--color-muted-foreground` |
| Border | `#E2E8F0` | `--color-border` |
| Destructive | `#DC2626` | `--color-destructive` |
| On Destructive | `#FFFFFF` | `--color-on-destructive` |
| Ring | `#0F172A` | `--color-ring` |

**Color Notes:** Ink and brass (since kit 0.5.0). Ink (`#14161B`) for text and every primary action; brass (`#836A30`, `--brand`) only for the seal, focus rings and signature details; warm paper surfaces. Blue is retired as a brand colour because it is the category default for identity products.

**Runtime mapping (ui-kit):** In `@dhawalhost/wardseal-ui-kit`, MASTER **Accent/CTA** is implemented as `--secondary` (Tailwind `bg-secondary`) so product CTAs stay one token. Soft fills use `--accent`. Do not use `--accent` for primary buttons.

**Maintenance:** Brand UI SoT is the `wardseal-ui-kit` repo. See that repo’s [`MAINTENANCE.md`](../../../wardseal-ui-kit/MAINTENANCE.md) (sibling) for “update X → edit Y”, and [`docs/UI_KIT.md`](../../docs/UI_KIT.md) inside WardSeal for the ecosystem overview. Do not redefine the palette inside product apps.

### Typography

- **Heading Font:** Geist
- **Body Font:** Geist
- **Mono partner:** Geist Mono — IDs, timestamps, counts, figures in meta lines
- **Character:** exact, sober, quietly sure. World: a notary's desk — signed records, ink on paper, the seal
- **Weights:** 400 and 500; 600 only for the wordmark and rare emphasis. No 700/800 headings. Sentence case everywhere, no uppercase tracked labels
- **Google Fonts:** [Geist + Geist Mono](https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500&display=swap)

**CSS Import:** `tokens.css` from the kit imports both families. Apps must not override `fontFamily` or `fontSize`.

**Surfaces:** cool ink neutral ramp; admin and developer consoles use the inset canvas (dim rail, raised content panel). Sign-in screens use the kit `AuthLayout` with the ink brand plate.

**Signature detail:** a mono "seal chip" (`ed25519:8fa1…0b93` with a small success dot) beside verified decisions — hero record, audit rows, live status. Nowhere else.

### Spacing Variables

| Token | Value | Usage |
|-------|-------|-------|
| `--space-xs` | `4px` / `0.25rem` | Tight gaps |
| `--space-sm` | `8px` / `0.5rem` | Icon gaps, inline spacing |
| `--space-md` | `16px` / `1rem` | Standard padding |
| `--space-lg` | `24px` / `1.5rem` | Section padding |
| `--space-xl` | `32px` / `2rem` | Large gaps |
| `--space-2xl` | `48px` / `3rem` | Section margins |
| `--space-3xl` | `64px` / `4rem` | Hero padding |

### Shadow Depths

Runtime values live in the kit `tokens.css`. Depth comes from surface steps and hairlines first.

| Level | Light | Usage |
|-------|-------|-------|
| `--shadow-xs` / `--shadow-sm` / `--shadow-card` | `0 1px 2px rgb(15 23 42 / 0.04–0.05)` | Controls, cards (dark mode: none) |
| `--shadow-overlay` | `0 8px 24px -4px rgb(15 23 42 / 0.10)` + hairline | Menus, dialogs, sheets |

---

## Component Specs

### Buttons

Runtime kit mapping (`@dhawalhost/wardseal-ui-kit` `Button`):

| Spec name | Kit `variant` | Fill | Use for |
|-----------|---------------|------|---------|
| Primary (ink) | `primary` | `#0F172A` navy | Strong emphasis, dark chrome |
| CTA / Accent | `secondary` (**default**) | `#0369A1` blue | Product actions, landing CTAs |
| Outline | `outline` | transparent + border | Secondary actions |

Shared button rules (kit `Button`): weight 500, radius 8px on every size, heights 32 / 36 / 44, `transition-[color,background-color,border-color,transform]` 150ms, `active:scale-[0.98]`, no hover lift. Filled variants carry an inset top highlight (`inset 0 1px 0 rgb(255 255 255 / 0.12)`) instead of a drop shadow. One primary action per view.

### Cards

Kit `Card` / `GlassCard`: `bg-card`, 1px `border-border`, radius 12–16px, padding 20–24px, no hover lift. A clickable card changes border or surface on hover, never position or shadow size. Stat cards are label + number + one line of context — no icon tiles, sparklines or badges.

### Inputs

```css
.input {
  padding: 12px 16px;
  border: 1px solid #E2E8F0;
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 200ms ease;
}

.input:focus {
  border-color: #0F172A;
  outline: none;
  box-shadow: 0 0 0 3px #0F172A20;
}
```

### Modals

```css
.modal-overlay {
  background: rgba(2, 6, 23, 0.5); /* kit .overlay-scrim — no blur */
}

.modal {
  background: white;
  border-radius: 16px;
  padding: 32px;
  box-shadow: var(--shadow-overlay);
  max-width: 500px;
  width: 90%;
}
```

---

## Style Guidelines

**Style:** Accessible & Ethical

**Keywords:** Accessible, inclusive interface, high contrast, large text (16px+), keyboard navigation, screen reader friendly, accessibility standards aware, focus state, semantic

**Best For:** Government, healthcare, education, inclusive products, large audience, legal compliance, public

**Key Effects:** Clear focus rings (3-4px), ARIA labels, skip links, responsive design, reduced motion, 44x44px touch targets

### Page Pattern

**Pattern Name:** Trust & Authority + Conversion

- **Conversion Strategy:** Security badges. Case studies. Transparent pricing. Low-friction form. Provide pause/stop and stop the logo carousel on focus, hover, and reduced motion. Previous/next controls provide the keyboard equivalent; pause offscreen/hidden and render a static logo set under reduced motion.
- **CTA Placement:** Contact Sales / Get Quote (primary) + Nav
- **Section Order:** Hero (mission/credibility) > Proof (logos, certs, stats) > Solution overview > Clear CTA path

---

## Anti-Patterns (Do NOT Use)

- ❌ Playful design
- ❌ Hidden credentials
- ❌ AI purple/pink gradients, and hue gradients of any kind on surfaces, buttons or text
- ❌ Coloured glows, glass blur, pulsing or pinging status dots on things that are not live
- ❌ Uppercase tracked labels, 700+ weight headings, exclamation marks, greeting headlines
- ❌ Unverified trust claims (certifications, uptime, customer counts) — state them only when real and sourced
- ❌ `transition: all`, hover lifts and hover scale

### Additional Forbidden Patterns

- ❌ **Emojis as icons** — Use SVG icons (Heroicons, Lucide, Simple Icons)
- ❌ **Missing cursor:pointer** — All clickable elements must have cursor:pointer
- ❌ **Layout-shifting hovers** — Avoid scale transforms that shift layout
- ❌ **Low contrast text** — Maintain 4.5:1 minimum contrast ratio
- ❌ **Instant state changes** — Always use transitions (150-300ms)
- ❌ **Invisible focus states** — Focus states must be visible for a11y

---

## Pre-Delivery Checklist

Before delivering any UI code, verify:

- [ ] `npm run check:craft` passes in `web/` (kit craft rules — see kit `THEMES.md`)
- [ ] No emojis used as icons (use SVG instead)
- [ ] All icons from consistent icon set (Heroicons/Lucide)
- [ ] `cursor-pointer` on all clickable elements
- [ ] Hover states are colour or surface steps, 120–180ms, named properties only
- [ ] Light mode: text contrast 4.5:1 minimum
- [ ] Focus states visible for keyboard navigation
- [ ] `prefers-reduced-motion` respected
- [ ] Responsive: 375px, 768px, 1024px, 1440px
- [ ] No content hidden behind fixed navbars
- [ ] No horizontal scroll on mobile
