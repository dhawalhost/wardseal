# `@dhawalhost/wardseal-ui-kit` (workspace mirror)

**Version: `0.2.0`** — keep this package identical to published / sibling [`wardseal-ui-kit@0.2.0`](https://github.com/dhawalhost/wardseal-ui-kit).

This folder is a **mirror** of the brand UI library for the WardSeal monorepo. Product apps may keep local layouts that **compose** kit components; they must not fork Button/Card/Input/etc.

| | |
|--|--|
| **Source of truth** | [`wardseal-ui-kit`](https://github.com/dhawalhost/wardseal-ui-kit) `@0.2.0` |
| **This folder** | `wardseal/web/ui` — sync from kit; do **not** invent tokens/components here |
| **Consumers** | `web/admin`, `web/app`, `web/id`, … depend on `@dhawalhost/wardseal-ui-kit@0.2.0` (workspace symlink) |

## How apps get the kit

```text
web/node_modules/@dhawalhost/wardseal-ui-kit  →  ../../ui  (this package)
```

Apps import:

```ts
import "@dhawalhost/wardseal-ui-kit/tokens.css";
import { PageLayout, Button } from "@dhawalhost/wardseal-ui-kit";
import { tailwindPreset } from "@dhawalhost/wardseal-ui-kit/tailwind-preset";
```

## What to update where

Full matrix: **[wardseal-ui-kit/MAINTENANCE.md](../../../wardseal-ui-kit/MAINTENANCE.md)**  
(If the kit lives as a sibling: `../../wardseal-ui-kit/MAINTENANCE.md` from repo root = `../wardseal-ui-kit/MAINTENANCE.md`.)

From WardSeal repo root, sibling path is typically:

```text
../wardseal-ui-kit/MAINTENANCE.md
```

### Short version

| Change | Edit |
|--------|------|
| Colors, spacing, themes | **ui-kit** `src/styles/tokens.css` → sync here |
| Components / layouts | **ui-kit** `src/…` → sync here |
| Admin dashboard page copy/data | `web/admin/src/pages/…` |
| Brand strategy (hex intent) | `design-system/wardseal/MASTER.md` then kit tokens |

## Sync from the kit

```bash
# from wardseal-ui-kit (sibling of wardseal)
rsync -a --delete --exclude '.DS_Store' src/ ../wardseal/web/ui/src/
```

Then set **the same version** in:

- `wardseal-ui-kit/package.json`
- `wardseal/web/ui/package.json`

**Do not** overwrite this package’s `package.json` exports with the kit’s publish config — keep workspace exports pointing at `./src/…`.

## Docs in the kit

- [MAINTENANCE.md](https://github.com/dhawalhost/wardseal-ui-kit/blob/main/MAINTENANCE.md) — what to update where  
- [THEMES.md](https://github.com/dhawalhost/wardseal-ui-kit/blob/main/THEMES.md) — tokens & themes  
- [LAYOUT.md](https://github.com/dhawalhost/wardseal-ui-kit/blob/main/LAYOUT.md) — page layout system  
