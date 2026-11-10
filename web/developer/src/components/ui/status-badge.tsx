import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Badge } from "./badge"

const statusBadgeVariants = cva(
  "font-medium text-xs tracking-tight px-3 py-1 shadow-none border-none rounded-xl",
  {
    variants: {
      status: {
        active: "bg-success-subtle text-success-subtle-foreground",
        suspended: "bg-destructive/10 text-error-subtle-foreground",
        pending: "bg-warning/10 text-warning-subtle-foreground",
        inactive: "bg-surface-container text-on-surface-variant",
        premium: "bg-primary/5 text-primary",
      },
    },
    defaultVariants: {
      status: "active",
    },
  }
)

export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof statusBadgeVariants> {
  children: React.ReactNode
}

function StatusBadge({ className, status, children, ...props }: StatusBadgeProps) {
  return (
    <Badge className={cn(statusBadgeVariants({ status, className }))} {...props}>
      {children}
    </Badge>
  )
}

export { StatusBadge, statusBadgeVariants }
