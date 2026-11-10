/**
 * Shared class recipes. Keep component files thin and these consistent:
 * every overlay, menu item and icon button in the kit composes from here.
 */

/** Keyboard focus indicator — 2px --ring with offset (≥3:1 in both themes). */
export const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/** Floating surface for popovers, menus, dialogs. Solid fill, token elevation — no glass blur. */
export const overlaySurface =
  "border border-border bg-popover text-popover-foreground shadow-overlay";

/** Square icon-only button (32px target). Always pair with an accessible name. */
export const iconButton =
  "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-on-surface-subtle " +
  "transition-colors duration-fast hover:bg-muted hover:text-on-surface " +
  "disabled:pointer-events-none disabled:opacity-50 " +
  focusRing;

/**
 * Menu / listbox row. Radix moves focus onto the highlighted item, so
 * data-[highlighted] covers keyboard and pointer.
 */
export const menuItem =
  "relative flex h-8 w-full cursor-pointer select-none items-center gap-2 rounded-[6px] px-2 text-sm text-on-surface outline-none " +
  "transition-colors duration-fast " +
  "data-[highlighted]:bg-surface-container-high " +
  "data-[disabled]:pointer-events-none data-[disabled]:opacity-50 " +
  "[&_svg]:h-4 [&_svg]:w-4 [&_svg]:shrink-0 [&_svg]:text-on-surface-subtle";

/** Section label inside menus and lists. */
export const menuLabel = "px-2 pb-1 pt-2 text-label text-on-surface-subtle";

/** Soft focus halo for text controls: accent border + 3px translucent ring, no offset. */
export const controlFocus =
  "focus-visible:outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/20";
