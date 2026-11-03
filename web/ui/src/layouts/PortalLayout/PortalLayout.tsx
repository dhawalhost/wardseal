import * as React from "react";
import { CheckCircle2, ChevronDown, LogOut, User } from "lucide-react";
import { cn } from "../../lib/utils";
import { focusRing } from "../../lib/styles";
import { Avatar } from "../../components/Avatar/Avatar";
import { SkipLink } from "../../components/SkipLink/SkipLink";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "../../components/Dropdown/Dropdown";
import { BrandMark } from "../BrandMark";

export interface PortalLink {
  label: string;
  href?: string;
  /** Current page. Rendered with aria-current="page" and an underline, not colour alone. */
  isActive?: boolean;
  onClick?: () => void;
}

export type NodeStatus = "healthy" | "degraded" | "disconnected";

export interface PortalLayoutProps extends React.HTMLAttributes<HTMLDivElement> {
  links: PortalLink[];
  user: {
    name: string;
    email: string;
    avatarUrl?: string;
  };
  onLogout?: () => void;
  onProfileSettings?: () => void;
  nodeStatus?: NodeStatus;
  /** Connected node shown in the header. The indicator is hidden when omitted. */
  nodeName?: string;
  brandName?: string;
  /**
   * Certifications shown in the footer. Empty by default — only list
   * attestations the deployment actually holds.
   */
  complianceBadges?: string[];
  /** id of <main>; target of the skip link. */
  mainId?: string;
}

const statusMeta: Record<NodeStatus, { label: string; dot: string }> = {
  healthy: { label: "Healthy", dot: "bg-success" },
  degraded: { label: "Degraded", dot: "bg-warning" },
  disconnected: { label: "Disconnected", dot: "bg-error" },
};

function PortalNavLink({ link, compact = false }: { link: PortalLink; compact?: boolean }) {
  const className = cn(
    "relative inline-flex shrink-0 items-center rounded-md text-sm transition-colors duration-fast",
    compact ? "h-10 px-3" : "h-9 px-3",
    focusRing,
    link.isActive
      ? "font-semibold text-on-surface after:absolute after:inset-x-3 after:-bottom-[13px] after:h-0.5 after:rounded-full after:bg-secondary"
      : "font-medium text-on-surface-variant hover:bg-muted hover:text-on-surface",
    compact && link.isActive && "after:-bottom-px"
  );
  const current = link.isActive ? ("page" as const) : undefined;

  return link.href ? (
    <a href={link.href} onClick={link.onClick} aria-current={current} className={className}>
      {link.label}
    </a>
  ) : (
    <button type="button" onClick={link.onClick} aria-current={current} className={className}>
      {link.label}
    </button>
  );
}

const PortalLayout = React.forwardRef<HTMLDivElement, PortalLayoutProps>(
  (
    {
      className,
      links,
      user,
      onLogout,
      onProfileSettings,
      nodeStatus = "healthy",
      nodeName,
      brandName = "WardSeal Portal",
      complianceBadges = [],
      mainId = "main-content",
      children,
      ...props
    },
    ref
  ) => {
    const status = statusMeta[nodeStatus];

    return (
      <div
        ref={ref}
        className={cn("flex min-h-dvh w-full flex-col bg-background font-sans text-on-surface", className)}
        {...props}
      >
        <SkipLink targetId={mainId} />

        <header className="sticky top-0 z-40 shrink-0 border-b border-border bg-card">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 md:px-8">
            <div className="flex min-w-0 items-center gap-6">
              <BrandMark name={brandName} />
              <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
                {links.map((link) => (
                  <PortalNavLink key={link.href ?? link.label} link={link} />
                ))}
              </nav>
            </div>

            <div className="flex items-center gap-3">
              {nodeName && (
                <div
                  className="hidden items-center gap-2 rounded-md border border-border bg-muted px-3 py-1.5 lg:flex"
                  title={`${nodeName} — ${status.label}`}
                >
                  <span className={cn("h-2 w-2 shrink-0 rounded-full", status.dot)} aria-hidden />
                  <span className="max-w-[180px] truncate font-mono text-xs text-on-surface-variant">
                    {nodeName}
                  </span>
                  {/* Status in text, so it is not conveyed by colour alone */}
                  <span className="sr-only">, status {status.label}</span>
                  {nodeStatus !== "healthy" && (
                    <span className="text-xs font-semibold text-on-surface" aria-hidden>
                      {status.label}
                    </span>
                  )}
                </div>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg p-1 transition-colors duration-fast hover:bg-muted data-[state=open]:bg-muted",
                    focusRing
                  )}
                  aria-label={`Account menu for ${user.name}`}
                >
                  <Avatar name={user.name} size={28} aria-hidden />
                  <ChevronDown className="h-4 w-4 text-on-surface-subtle" aria-hidden />
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-60" align="end">
                  <DropdownMenuLabel className="flex flex-col gap-0.5 py-2">
                    <span className="text-sm font-semibold text-on-surface">{user.name}</span>
                    <span className="truncate text-xs font-normal text-on-surface-subtle">{user.email}</span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {onProfileSettings && (
                    <DropdownMenuItem onSelect={onProfileSettings}>
                      <User className="text-on-surface-subtle" aria-hidden />
                      Profile
                    </DropdownMenuItem>
                  )}
                  {onLogout && (
                    <DropdownMenuItem onSelect={onLogout}>
                      <LogOut className="text-on-surface-subtle" aria-hidden />
                      Sign out
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Mobile: scrollable tab strip under the header, same links + same active cue */}
          {links.length > 0 && (
            <nav
              aria-label="Primary"
              className="custom-scrollbar flex gap-1 overflow-x-auto border-t border-border px-2 md:hidden"
            >
              {links.map((link) => (
                <PortalNavLink key={link.href ?? link.label} link={link} compact />
              ))}
            </nav>
          )}
        </header>

        <main
          id={mainId}
          tabIndex={-1}
          className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 focus:outline-none sm:px-6 sm:py-8 md:px-8 lg:px-12 lg:py-10"
        >
          <div className="flex flex-col gap-8 lg:gap-10">{children}</div>
        </main>

        <footer className="shrink-0 border-t border-border bg-card py-8">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-4 md:flex-row md:px-8">
            <div className="flex items-center gap-3 text-xs text-on-surface-variant">
              <BrandMark name="WardSeal" className="[&>span:last-child]:sr-only" />
              <span>© {new Date().getFullYear()} WardSeal. All rights reserved.</span>
            </div>

            {complianceBadges.length > 0 && (
              <ul aria-label="Compliance" className="flex flex-wrap items-center justify-center gap-2">
                {complianceBadges.map((label) => (
                  <li
                    key={label}
                    className="flex items-center gap-1.5 rounded-md border border-border bg-muted px-2.5 py-1 text-xs font-medium text-on-surface-variant"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-success" aria-hidden />
                    {label}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </footer>
      </div>
    );
  }
);
PortalLayout.displayName = "PortalLayout";

export { PortalLayout };
