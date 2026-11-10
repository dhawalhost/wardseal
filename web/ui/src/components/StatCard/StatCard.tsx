import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";
import { Card, CardContent } from "../Card/Card";

/** Tinted variants use *-subtle fills with *-subtle-foreground text (≥4.5:1). */
const statCardVariants = cva("overflow-hidden rounded-xl border shadow-none", {
  variants: {
    variant: {
      default: "border-border bg-card",
      muted: "border-border bg-muted",
      primary: "border-secondary/30 bg-secondary-container",
      success: "border-success/30 bg-success-subtle",
      warning: "border-warning/30 bg-warning-subtle",
      danger: "border-error/30 bg-error-subtle",
    },
  },
  defaultVariants: { variant: "default" },
});

const toneText = {
  default: "text-on-surface",
  muted: "text-on-surface",
  primary: "text-on-secondary-container",
  success: "text-success-subtle-foreground",
  warning: "text-warning-subtle-foreground",
  danger: "text-error-subtle-foreground",
} as const;

const labelText = {
  default: "text-on-surface-variant",
  muted: "text-on-surface-variant",
  primary: "text-on-secondary-container",
  success: "text-success-subtle-foreground",
  warning: "text-warning-subtle-foreground",
  danger: "text-error-subtle-foreground",
} as const;

export interface StatCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof statCardVariants> {
  label: React.ReactNode;
  value: React.ReactNode;
  /** Decorative icon (hidden from assistive tech). */
  icon?: React.ReactNode;
  subtext?: React.ReactNode;
  loading?: boolean;
}

const StatCard = React.forwardRef<HTMLDivElement, StatCardProps>(
  ({ className, variant, label, value, icon, subtext, loading = false, ...props }, ref) => {
    const tone = variant ?? "default";

    return (
      <Card
        ref={ref}
        className={cn(statCardVariants({ variant }), className)}
        aria-busy={loading || undefined}
        {...props}
      >
        <CardContent className="p-5">
          <div className="flex h-full min-h-[112px] flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
              <span className={cn("text-sm", labelText[tone])}>{label}</span>
              {icon && (
                <span
                  className="flex h-4 w-4 shrink-0 items-center justify-center text-on-surface-subtle [&_svg]:h-4 [&_svg]:w-4"
                  aria-hidden
                >
                  {icon}
                </span>
              )}
            </div>
            <div className="mt-auto space-y-2">
              <div className={cn("text-[1.75rem] font-medium leading-none tracking-[-0.01em] tabular-nums", toneText[tone])}>
                {loading ? (
                  <>
                    <span className="inline-block h-8 w-20 animate-pulse rounded-md bg-on-surface/10" aria-hidden />
                    <span className="sr-only">Loading</span>
                  </>
                ) : (
                  value
                )}
              </div>
              {subtext && <p className={cn("text-sm", labelText[tone])}>{subtext}</p>}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
);
StatCard.displayName = "StatCard";

export { StatCard, statCardVariants };
