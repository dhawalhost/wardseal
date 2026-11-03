import * as React from "react";
import * as ToastPrimitives from "@radix-ui/react-toast";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import { cn } from "../../lib/utils";
import { focusRing } from "../../lib/styles";

const ToastProvider = ToastPrimitives.Provider;

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      "fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse gap-2 p-4 outline-none sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[380px]",
      className
    )}
    {...props}
  />
));
ToastViewport.displayName = ToastPrimitives.Viewport.displayName;

/**
 * Status variants use the *-subtle / *-subtle-foreground pairs (≥4.5:1).
 * Title, description and close inherit the variant's text colour; only the
 * default variant steps the description down to the secondary text tier.
 */
const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-start justify-between gap-3 overflow-hidden rounded-lg border p-4 pr-11 shadow-overlay " +
    "transition-transform duration-base " +
    "data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none " +
    "data-[state=open]:animate-slide-up data-[state=closed]:animate-fade-out",
  {
    variants: {
      variant: {
        default: "border-border bg-card text-on-surface",
        success: "border-success/40 bg-success-subtle text-success-subtle-foreground",
        warning: "border-warning/40 bg-warning-subtle text-warning-subtle-foreground",
        info: "border-info/40 bg-info-subtle text-info-subtle-foreground",
        destructive: "border-error/40 bg-error-subtle text-error-subtle-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export type ToastProps = React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> &
  VariantProps<typeof toastVariants>;

const Toast = React.forwardRef<React.ElementRef<typeof ToastPrimitives.Root>, ToastProps>(
  ({ className, variant, type, ...props }, ref) => (
    <ToastPrimitives.Root
      ref={ref}
      // Failures interrupt (assertive); everything else is announced politely.
      type={type ?? (variant === "destructive" ? "foreground" : "background")}
      data-variant={variant ?? "default"}
      className={cn(toastVariants({ variant }), className)}
      {...props}
    />
  )
);
Toast.displayName = ToastPrimitives.Root.displayName;

const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(
      "inline-flex h-8 shrink-0 items-center justify-center rounded-md border border-input bg-card px-3 text-sm font-medium text-on-surface transition-colors duration-fast hover:bg-muted disabled:pointer-events-none disabled:opacity-50",
      focusRing,
      className
    )}
    {...props}
  />
));
ToastAction.displayName = ToastPrimitives.Action.displayName;

export interface ToastCloseProps
  extends React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close> {
  label?: string;
}

/** Always visible (touch has no hover) and named for screen readers. */
const ToastClose = React.forwardRef<React.ElementRef<typeof ToastPrimitives.Close>, ToastCloseProps>(
  ({ className, label = "Dismiss notification", ...props }, ref) => (
    <ToastPrimitives.Close
      ref={ref}
      className={cn(
        "absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-md text-current transition-colors duration-fast hover:bg-on-surface/5",
        "group-data-[variant=default]:text-on-surface-subtle group-data-[variant=default]:hover:text-on-surface",
        focusRing,
        className
      )}
      toast-close=""
      {...props}
    >
      <X className="h-4 w-4" aria-hidden />
      <span className="sr-only">{label}</span>
    </ToastPrimitives.Close>
  )
);
ToastClose.displayName = ToastPrimitives.Close.displayName;

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title
    ref={ref}
    className={cn("text-sm font-semibold leading-snug", className)}
    {...props}
  />
));
ToastTitle.displayName = ToastPrimitives.Title.displayName;

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description
    ref={ref}
    className={cn(
      "mt-1 text-sm leading-snug group-data-[variant=default]:text-on-surface-variant",
      className
    )}
    {...props}
  />
));
ToastDescription.displayName = ToastPrimitives.Description.displayName;

export {
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
};
