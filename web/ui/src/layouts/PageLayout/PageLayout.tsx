import * as React from "react";
import { cn } from "../../lib/utils";

export interface PageLayoutProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Max content width. Defaults to 1280px. */
  maxWidthClassName?: string;
}

/**
 * Padded, scrollable page wrapper for AdminShell (and similar) content.
 * Responsive gutters keep content clear of shell edges at every breakpoint.
 * Nest PageHeader + sections as children — they stack with gap-8 / lg:gap-10.
 */
const PageLayout = React.forwardRef<HTMLDivElement, PageLayoutProps>(
  (
    {
      className,
      children,
      maxWidthClassName = "max-w-[1280px]",
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex-1 overflow-y-auto w-full custom-scrollbar",
          "px-4 sm:px-6 md:px-8 lg:px-12",
          "py-6 sm:py-8 lg:py-10"
        )}
        {...props}
      >
        <div
          className={cn(
            "mx-auto w-full flex flex-col gap-8 lg:gap-10",
            maxWidthClassName,
            className
          )}
        >
          {children}
        </div>
      </div>
    );
  }
);
PageLayout.displayName = "PageLayout";

export { PageLayout };
