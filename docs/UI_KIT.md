# WardSeal UI kit — ecosystem docs

Brand UI for all WardSeal apps lives in **`@dhawalhost/wardseal-ui-kit`**.

| Resource | Location |
|----------|----------|
| **Source of truth** | Sibling repo `wardseal-ui-kit` |
| **Monorepo mirror** | [`web/ui`](../web/ui/README.md) |
| **What to update where** | [`wardseal-ui-kit/MAINTENANCE.md`](../../wardseal-ui-kit/MAINTENANCE.md) *(sibling path)* |
| **Themes & tokens** | `wardseal-ui-kit/THEMES.md` |
| **Layouts** | `wardseal-ui-kit/LAYOUT.md` |
| **Brand intent** | [`design-system/wardseal/MASTER.md`](../design-system/wardseal/MASTER.md) |

## Decision tree

```text
Need a new color / spacing / theme default?
  → Edit wardseal-ui-kit/src/styles/tokens.css (+ tokens.ts / THEMES.md)
  → Sync to web/ui
  → Refresh apps

Need a new shared component or layout?
  → Add under wardseal-ui-kit/src/components or src/layouts
  → Export from index.ts
  → Document in LAYOUT.md / Storybook
  → Sync to web/ui
  → Import in admin/app/id

Need a product-only screen (copy, API, routes)?
  → Edit web/admin (or app/id) pages only
  → Compose with kit PageLayout / PageHeader / Grid / StatCard / GlassCard aliases

Need to change marketing (landing) colors?
  → Edit kit tokens.css, sync → web/ui
  → Landing maps aliases in web/landing/src/css/base.css (CTA `--accent` → kit `--secondary`)

Need to change brand strategy (hex, voice)?
  → Update design-system/wardseal/MASTER.md
  → Align kit tokens.css to match
  → Sync
```

## Runtime color note

In the kit, MASTER **Accent/CTA** (`#0369A1`) is exposed as **`--secondary`** (`bg-secondary` / `Button variant="secondary"`). Soft fills use `--accent`. Kit `variant="primary"` is navy ink. See MASTER.md and `THEMES.md`.

## Sync command

```bash
cd /path/to/wardseal-ui-kit
rsync -a --delete --exclude '.DS_Store' src/ ../wardseal/web/ui/src/
# bump both package.json versions to the same value
```
