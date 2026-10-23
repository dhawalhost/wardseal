# Dashboard Page Overrides

> **PROJECT:** WardSeal
> **Page Type:** Dashboard / Operations overview

> Rules here **override** `design-system/wardseal/MASTER.md`.

---

## Layout

- **Max width:** 1280px centered inside `PageLayout`
- **Page gutters:** `px-4 sm:px-6 md:px-8 lg:px-12` · `py-6 sm:py-8 lg:py-10`
- **Section stack:** `gap-8 lg:gap-10` between header, KPIs, actions, charts, table
- **Grid:** KPI 4-col · charts 7/5 · quick actions 3-col

## Spacing

- **Card padding:** `p-6` (24px) — never token-var-only utilities without fallbacks
- **KPI min height:** ~112px content area for visual alignment
- **Chart plot height:** 280px activity · 160px risk donut

## Typography

- Page title: 24–28px bold Plus Jakarta Sans
- Section titles: 16px bold
- KPI labels: 12px uppercase semibold muted
- KPI values: 30px bold tabular-nums
- Meta / timestamps: 12px medium muted

## Color / components

- Prefer soft `StatCard` variants (primary/warning/success) over solid filled hero cards
- Security score: progress bar + numeric label (not color alone)
- Risk: donut **plus** labeled High/Medium/Low list with counts and %
- Empty users: icon + copy + primary CTA

## UX

- Show last-updated time; Refresh + Add user in header
- Pending / IP KPI cards navigate to `/requests` and `/policies/ip`
- Quick actions for access, policies, directory
- Recent users: View all + empty-state Add user
- Focus rings and `cursor-pointer` on all clickable surfaces
