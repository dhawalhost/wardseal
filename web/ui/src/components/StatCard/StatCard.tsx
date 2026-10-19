import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";
import { Card, CardContent } from "../Card/Card";

const statCardVariants = cva("overflow-hidden rounded-xl border border-border", {
  variants: {
    variant: {
      default: "shadow-sm bg-card",
      danger: "shadow-sm bg-destructive/5 border-destructive/20",
      primary: "shadow-sm bg-secondary/5 border-secondary/20",
      success: "shadow-sm bg-success-subtle border-success/20",
      warning: "shadow-sm bg-warning-subtle border-warning/20",
      muted: "shadow-sm bg-muted",
    },
  },
  defaultVariants: { variant: "default" },
});

const statValueVariants = cva("text-3xl font-bold tracking-tight leading-none tabular-nums", {
  variants: {
    variant: {
      default: "text-on-surface",
      danger: "text-destructive",
      primary: "text-secondary",
      success: "text-success",
      warning: "text-warning",
      muted: "text-on-surface",
    },
  },
  defaultVariants: { variant: "default" },
});

const statLabelVariants = cva(
  "text-xs font-semibold tracking-wide uppercase leading-none text-muted-foreground",
  {
    variants: {
      variant: {
        default: "",
        danger: "text-destructive/70",
        primary: "text-secondary/70",
        success: "text-success/70",
        warning: "text-warning/70",
        muted: "",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface StatCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof statCardVariants> {
  label: React.ReactNode;
  value: React.ReactNode;
  icon?: React.ReactNode;
  subtext?: React.ReactNode;
  loading?: boolean;
}

const StatCard = React.forwardRef<HTMLDivElement, StatCardProps>(
  ({ className, variant, label, value, icon, subtext, loading = false, ...props }, ref) => {
    return (
      <Card ref={ref} className={cn(statCardVariants({ variant }), className)} {...props}>
        <CardContent className="p-6">
          <div className="flex flex-col gap-5 h-full min-h-[112px]">
            <div className="flex items-start justify-between gap-3">
              <span className={statLabelVariants({ variant })}>{label}</span>
              {icon && (
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary/10 text-secondary">
                  {icon}
                </span>
              )}
            </div>
            <div className="space-y-2 mt-auto">
              <div className={statValueVariants({ variant })}>
                {loading ? <span className="opacity-20 animate-pulse">—</span> : value}
              </div>
              {subtext && (
                <p className="text-sm font-medium text-muted-foreground">{subtext}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
);
StatCard.displayName = "StatCard";

export { StatCard, statCardVariants };
