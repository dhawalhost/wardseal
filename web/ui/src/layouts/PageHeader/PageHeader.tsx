import * as React from "react";
import { cn } from "../../lib/utils";
import { focusRing } from "../../lib/styles";
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
            <nav aria-label="Breadcrumb">
              <ol className="flex flex-wrap items-center gap-1.5 text-xs font-medium text-on-surface-variant">
                {breadcrumbs.map((crumb, idx) => {
                  const isLast = idx === breadcrumbs.length - 1;
                  return (
                    <li key={crumb.label + idx} className="flex items-center gap-1.5">
                      {idx > 0 && (
                        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-on-surface-subtle" aria-hidden />
                      )}
                      {crumb.href && !isLast ? (
                        <a
                          href={crumb.href}
                          onClick={crumb.onClick}
                          className={cn("rounded-sm transition-colors duration-fast hover:text-on-surface hover:underline", focusRing)}
                        >
                          {crumb.label}
                        </a>
                      ) : (
                        <span
                          className={isLast ? "text-on-surface" : undefined}
                          aria-current={isLast ? "page" : undefined}
                        >
                          {crumb.label}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ol>
            </nav>
          )}

          {/* `icon` is accepted for compatibility but not drawn: titles carry the page, not icon tiles. */}
          <div className="min-w-0 space-y-1">
            <h1 className="text-title-lg text-on-surface [overflow-wrap:anywhere]">{title}</h1>
            {meta}
          </div>

          {description && (
            <p className="max-w-2xl text-body text-on-surface-subtle">
              {description}
            </p>
          )}
        </div>

        {(search || actions) && (
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {search && <div className="w-full sm:w-64">{search}</div>}
            {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
          </div>
        )}
      </header>
    );
  }
);
PageHeader.displayName = "PageHeader";

export { PageHeader };
