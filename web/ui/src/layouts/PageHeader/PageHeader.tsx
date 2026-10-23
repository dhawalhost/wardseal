import * as React from "react";
import { cn } from "../../lib/utils";
import { ChevronRight } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}

export interface PageHeaderProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Optional leading icon in a bordered tile */
  icon?: React.ReactNode;
  /** Secondary line under the title (e.g. last updated) */
  meta?: React.ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  search?: React.ReactNode;
}

/**
 * In-page title block. Horizontal padding is owned by PageLayout —
 * this component only handles vertical rhythm and the bottom rule.
 */
const PageHeader = React.forwardRef<HTMLElement, PageHeaderProps>(
  (
    {
      className,
      title,
      description,
      icon,
      meta,
      breadcrumbs,
      actions,
      search,
      ...props
    },
    ref
  ) => {
    return (
      <header
        ref={ref}
        className={cn(
          "flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between",
          "pb-6 lg:pb-8 border-b border-border",
          className
        )}
        {...props}
      >
        <div className="min-w-0 flex-1 space-y-3">
          {breadcrumbs && breadcrumbs.length > 0 && (
            <nav
              className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold uppercase tracking-wide flex-wrap"
              aria-label="Breadcrumb"
            >
              {breadcrumbs.map((crumb, idx) => {
                const isLast = idx === breadcrumbs.length - 1;
                return (
                  <React.Fragment key={crumb.label + idx}>
                    {idx > 0 && (
                      <ChevronRight className="w-3.5 h-3.5 shrink-0 text-muted-foreground" aria-hidden />
                    )}
                    {crumb.href && !isLast ? (
                      <a
                        href={crumb.href}
                        onClick={crumb.onClick}
                        className="hover:text-on-surface transition-colors cursor-pointer"
                      >
                        {crumb.label}
                      </a>
                    ) : (
                      <span className={isLast ? "text-on-surface" : undefined}>{crumb.label}</span>
                    )}
                  </React.Fragment>
                );
              })}
            </nav>
          )}

          <div className="flex items-center gap-3">
            {icon && (
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-muted text-secondary"
                aria-hidden
              >
                {icon}
              </div>
            )}
            <div className="min-w-0 space-y-1">
              <h1 className="text-2xl lg:text-[28px] font-bold tracking-tight text-on-surface leading-tight truncate">
                {title}
              </h1>
              {meta}
            </div>
          </div>

          {description && (
            <p className="text-sm lg:text-[15px] text-muted-foreground font-medium leading-relaxed max-w-2xl">
              {description}
            </p>
          )}
        </div>

        {(search || actions) && (
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {search && <div className="w-full sm:w-64">{search}</div>}
            {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
          </div>
        )}
      </header>
    );
  }
);
PageHeader.displayName = "PageHeader";

export { PageHeader };
