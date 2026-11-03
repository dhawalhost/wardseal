import * as React from "react";
import { cn } from "../../lib/utils";
import { focusRing } from "../../lib/styles";

export interface SkipLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  /** id of the main content element (must be focusable, e.g. tabIndex={-1}). */
  targetId?: string;
}

/**
 * First focusable element on the page; visible only on keyboard focus.
 * Lets keyboard and switch users bypass repeated navigation (WCAG 2.4.1).
 */
const SkipLink = React.forwardRef<HTMLAnchorElement, SkipLinkProps>(
  ({ className, targetId = "main-content", children = "Skip to main content", ...props }, ref) => (
    <a
      ref={ref}
      href={`#${targetId}`}
      className={cn(
        "sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-md focus:bg-card focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-on-surface focus:shadow-overlay",
        focusRing,
        className
      )}
      {...props}
    >
      {children}
    </a>
  )
);
SkipLink.displayName = "SkipLink";

export { SkipLink };
