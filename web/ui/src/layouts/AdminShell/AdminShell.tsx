import * as React from "react";
import { Bell, LogOut, Menu, Search } from "lucide-react";
import { cn } from "../../lib/utils";
import { focusRing, iconButton } from "../../lib/styles";
import { Avatar } from "../../components/Avatar/Avatar";
import { Sheet, SheetContent, SheetTitle } from "../../components/Sheet/Sheet";
import { SkipLink } from "../../components/SkipLink/SkipLink";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../components/Tooltip/Tooltip";
import { BrandMark } from "../BrandMark";

export interface NavigationItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
  /** Current page. Rendered with aria-current="page" and an indicator bar, not colour alone. */
  isActive?: boolean;
  badge?: string | number;
  /** Screen-reader text for the badge, e.g. "3 pending". Defaults to the badge value. */
  badgeLabel?: string;
  onClick?: () => void;
}

export interface NavigationGroup {
  title: string;
  items: NavigationItem[];
}

export interface AdminShellProps extends React.HTMLAttributes<HTMLDivElement> {
  navigation: NavigationGroup[];
  user: {
    name: string;
    email: string;
    avatarUrl?: string;
  };
  onLogout?: () => void;
  onSearchClick?: () => void;
  /** Placeholder-style label inside the search trigger. */
  searchLabel?: string;
  onNotificationClick?: () => void;
  /** Unread count. Shows the dot and is announced in the button name. */
  unreadNotifications?: number;
  brandName?: string;
  topHeaderActions?: React.ReactNode;
  /** id of <main>; target of the skip link. */
  mainId?: string;
}

/* ── Sidebar content (shared by desktop rail and mobile sheet) ─────────── */

function NavItem({ item, onNavigate }: { item: NavigationItem; onNavigate?: () => void }) {
  const content = (
    <>
      <span className="flex min-w-0 items-center gap-2.5">
        {item.icon && (
          <span
            className={cn(
              "flex h-4 w-4 shrink-0 items-center justify-center [&_svg]:h-4 [&_svg]:w-4",
              item.isActive ? "text-accent-foreground" : "text-on-surface-subtle group-hover/nav:text-on-surface"
            )}
            aria-hidden
          >
            {item.icon}
          </span>
        )}
        <span className="truncate">{item.label}</span>
      </span>
      {item.badge !== undefined && (
        <>
          <span
            className={cn(
              "rounded px-1.5 py-0.5 text-xs font-semibold tabular-nums",
              item.isActive ? "bg-card text-accent-foreground" : "bg-surface-container-high text-on-surface-variant"
            )}
            aria-hidden
          >
            {item.badge}
          </span>
          <span className="sr-only">, {item.badgeLabel ?? String(item.badge)}</span>
        </>
      )}
    </>
  );

  const className = cn(
    "group/nav relative flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors duration-fast",
    focusRing,
    item.isActive
      ? "bg-accent font-semibold text-accent-foreground before:absolute before:inset-y-1.5 before:left-0 before:w-[3px] before:rounded-full before:bg-secondary"
      : "font-medium text-on-surface-variant hover:bg-muted hover:text-on-surface"
  );

  const handleClick = () => {
    item.onClick?.();
    onNavigate?.();
  };

  return item.href ? (
    <a
      href={item.href}
      onClick={handleClick}
      aria-current={item.isActive ? "page" : undefined}
      className={className}
    >
      {content}
    </a>
  ) : (
    <button
      type="button"
      onClick={handleClick}
      aria-current={item.isActive ? "page" : undefined}
      className={className}
    >
      {content}
    </button>
  );
}

function SidebarContent({
  navigation,
  user,
  onLogout,
  brandName,
  onNavigate,
  navId,
}: Pick<AdminShellProps, "navigation" | "user" | "onLogout"> & {
  brandName: string;
  onNavigate?: () => void;
  navId: string;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 shrink-0 items-center border-b border-border px-5">
        <BrandMark name={brandName} />
      </div>

      <nav aria-label="Primary" className="custom-scrollbar flex-1 space-y-6 overflow-y-auto px-3 py-5">
        {navigation.map((group, gi) => {
          const headingId = `${navId}-group-${gi}`;
          return (
            <div key={group.title} className="space-y-1">
              <h2 id={headingId} className="px-3 pb-1 text-label text-on-surface-subtle">
                {group.title}
              </h2>
              <ul aria-labelledby={headingId} className="space-y-0.5">
                {group.items.map((item) => (
                  <li key={item.href ?? item.label}>
                    <NavItem item={item} onNavigate={onNavigate} />
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className="shrink-0 border-t border-border p-3">
        <div className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <Avatar name={user.name} size={32} aria-hidden />
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-on-surface">{user.name}</div>
              <div className="truncate text-xs text-on-surface-subtle">{user.email}</div>
            </div>
          </div>
          {onLogout && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" onClick={onLogout} className={iconButton} aria-label="Sign out">
                  <LogOut className="h-4 w-4" aria-hidden />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">Sign out</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Shell ─────────────────────────────────────────────────────────────── */

const AdminShell = React.forwardRef<HTMLDivElement, AdminShellProps>(
  (
    {
      className,
      navigation,
      user,
      onLogout,
      onSearchClick,
      searchLabel = "Search…",
      onNotificationClick,
      unreadNotifications = 0,
      brandName = "WardSeal",
      topHeaderActions,
      mainId = "main-content",
      children,
      ...props
    },
    ref
  ) => {
    const [mobileOpen, setMobileOpen] = React.useState(false);
    const navId = React.useId().replace(/:/g, "");
    const drawerRef = React.useRef<HTMLDivElement>(null);
    const menuButtonRef = React.useRef<HTMLButtonElement>(null);

    // Land on the current page's link (else the first link) — not whatever
    // focusable happens to come first — so arrowing/tabbing starts in context.
    const focusCurrentLink = React.useCallback((event: Event) => {
      const root = drawerRef.current;
      const target =
        root?.querySelector<HTMLElement>('nav [aria-current="page"]') ??
        root?.querySelector<HTMLElement>("nav a, nav button");
      if (target) {
        event.preventDefault();
        target.focus();
      }
    }, []);

    // The drawer is mobile-only: close it if the viewport grows past md.
    React.useEffect(() => {
      const mq = window.matchMedia("(min-width: 768px)");
      const onChange = () => mq.matches && setMobileOpen(false);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    }, []);

    const notificationLabel =
      unreadNotifications > 0
        ? `Notifications, ${unreadNotifications} unread`
        : "Notifications";

    return (
      <TooltipProvider delayDuration={300}>
        <div
          ref={ref}
          className={cn("flex h-dvh w-full overflow-hidden bg-background font-sans text-on-surface", className)}
          {...props}
        >
          <SkipLink targetId={mainId} />

          {/* Desktop rail — hidden (and out of the tab order) below md */}
          <aside className="hidden w-64 shrink-0 border-r border-border bg-surface-container-low md:block">
            <SidebarContent
              navigation={navigation}
              user={user}
              onLogout={onLogout}
              brandName={brandName}
              navId={`${navId}-desktop`}
            />
          </aside>

          {/* Mobile drawer — modal: traps focus, Esc closes, focus returns to the trigger */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetContent
              ref={drawerRef}
              onOpenAutoFocus={focusCurrentLink}
              // Opened programmatically (not via SheetTrigger), so return focus ourselves.
              onCloseAutoFocus={(event) => {
                event.preventDefault();
                menuButtonRef.current?.focus();
              }}
              side="left"
              id={`${navId}-drawer`}
              className="w-72 gap-0 bg-surface-container-low p-0 sm:max-w-xs"
              closeLabel="Close navigation"
              aria-describedby={undefined}
            >
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <SidebarContent
                navigation={navigation}
                user={user}
                onLogout={onLogout}
                brandName={brandName}
                onNavigate={() => setMobileOpen(false)}
                navId={`${navId}-mobile`}
              />
            </SheetContent>
          </Sheet>

          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border bg-background px-4 md:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  ref={menuButtonRef}
                  type="button"
                  onClick={() => setMobileOpen(true)}
                  className={cn(iconButton, "md:hidden")}
                  aria-label="Open navigation"
                  aria-expanded={mobileOpen}
                  aria-controls={`${navId}-drawer`}
                >
                  <Menu className="h-5 w-5" aria-hidden />
                </button>

                {onSearchClick && (
                  <button
                    type="button"
                    onClick={onSearchClick}
                    aria-keyshortcuts="Meta+K Control+K"
                    className={cn(
                      "hidden h-9 w-64 items-center gap-2 rounded-lg border border-input bg-card px-3 text-left text-sm text-on-surface-subtle transition-colors duration-fast hover:border-on-surface-subtle hover:text-on-surface-variant md:flex",
                      focusRing
                    )}
                  >
                    <Search className="h-4 w-4 shrink-0" aria-hidden />
                    <span className="flex-1 truncate">{searchLabel}</span>
                    <kbd
                      className="rounded border border-border bg-surface-container px-1.5 font-mono text-xs text-on-surface-subtle"
                      aria-hidden
                    >
                      ⌘K
                    </kbd>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {topHeaderActions}

                {onSearchClick && (
                  <button
                    type="button"
                    onClick={onSearchClick}
                    className={cn(iconButton, "md:hidden")}
                    aria-label="Search"
                  >
                    <Search className="h-4 w-4" aria-hidden />
                  </button>
                )}

                {onNotificationClick && (
                  <button
                    type="button"
                    onClick={onNotificationClick}
                    className={cn(iconButton, "relative")}
                    aria-label={notificationLabel}
                  >
                    <Bell className="h-4 w-4" aria-hidden />
                    {unreadNotifications > 0 && (
                      <span
                        className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-secondary ring-2 ring-background"
                        aria-hidden
                      />
                    )}
                  </button>
                )}
              </div>
            </header>

            {/* Page body — wrap page content in <PageLayout> */}
            <main
              id={mainId}
              tabIndex={-1}
              className="flex min-h-0 flex-1 flex-col overflow-hidden focus:outline-none"
            >
              {children}
            </main>
          </div>
        </div>
      </TooltipProvider>
    );
  }
);
AdminShell.displayName = "AdminShell";

export { AdminShell };
