import * as React from "react";
import { cn } from "../../lib/utils";

export interface SectionProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  title?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  /** Visually hide the header but keep it for screen readers when title is set. */
  srOnlyTitle?: boolean;
}

/**
 * Page section with optional title row. Use inside PageLayout for labeled blocks
 * (KPI strip, charts, tables).
 */
const Section = React.forwardRef<HTMLElement, SectionProps>(
  (
    { className, title, description, actions, srOnlyTitle, children, ...props },
    ref
  ) => {
    const hasHeader = Boolean(title || description || actions);

    return (
      <section ref={ref} className={cn("flex flex-col gap-5", className)} {...props}>
        {hasHeader && (
          <div
            className={cn(
              "flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between",
              srOnlyTitle && "sr-only"
            )}
          >
            <div className="min-w-0 space-y-1">
              {title && (
                <h2 className="text-base font-bold tracking-tight text-on-surface">{title}</h2>
              )}
              {description && (
                <p className="text-sm font-medium text-muted-foreground max-w-2xl">
                  {description}
                </p>
              )}
            </div>
            {actions && (
              <div className="flex flex-wrap items-center gap-3 shrink-0">{actions}</div>
            )}
          </div>
        )}
        {children}
      </section>
    );
  }
);
Section.displayName = "Section";

export { Section };
