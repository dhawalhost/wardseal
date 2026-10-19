import * as React from "react";
import { cn } from "../../lib/utils";

const sizeMap = {
  sm: "max-w-3xl",
  md: "max-w-5xl",
  lg: "max-w-[1280px]",
  xl: "max-w-7xl",
  full: "max-w-none",
} as const;

export type ContainerSize = keyof typeof sizeMap;

export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Content max width. Default `lg` (1280px) — standard admin page width. */
  size?: ContainerSize;
  /** When true, adds responsive page gutters (same as PageLayout). */
  padded?: boolean;
  as?: React.ElementType;
}

/**
 * Horizontal content bound. Use inside shells when you need a width constraint
 * without PageLayout's vertical stack.
 */
const Container = React.forwardRef<HTMLDivElement, ContainerProps>(
  (
    {
      className,
      size = "lg",
      padded = false,
      as: Component = "div",
      children,
      ...props
    },
    ref
  ) => {
    return (
      <Component
        ref={ref}
        className={cn(
          "mx-auto w-full",
          sizeMap[size],
          padded && "px-4 sm:px-6 md:px-8 lg:px-12",
          className
        )}
        {...props}
      >
        {children}
      </Component>
    );
  }
);
Container.displayName = "Container";

export { Container };
