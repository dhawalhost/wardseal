import * as React from "react";
import { cn } from "../../lib/utils";

const gapMap = {
  none: "gap-0",
  xs: "gap-1",
  sm: "gap-2",
  md: "gap-4",
  lg: "gap-6",
  xl: "gap-8",
  "2xl": "gap-10",
  page: "gap-page",
  section: "gap-section",
  card: "gap-card",
} as const;

export type StackGap = keyof typeof gapMap;

export interface StackProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Flex direction. Default `vertical`. */
  direction?: "vertical" | "horizontal";
  gap?: StackGap;
  align?: "start" | "center" | "end" | "stretch" | "baseline";
  justify?: "start" | "center" | "end" | "between" | "around" | "evenly";
  wrap?: boolean;
  as?: React.ElementType;
}

const alignMap = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
  stretch: "items-stretch",
  baseline: "items-baseline",
} as const;

const justifyMap = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
  between: "justify-between",
  around: "justify-around",
  evenly: "justify-evenly",
} as const;

/**
 * Flex stack for consistent vertical/horizontal rhythm.
 * Prefer `gap="section"` between page blocks and `gap="card"` inside cards.
 */
const Stack = React.forwardRef<HTMLDivElement, StackProps>(
  (
    {
      className,
      direction = "vertical",
      gap = "md",
      align,
      justify,
      wrap = false,
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
          "flex",
          direction === "vertical" ? "flex-col" : "flex-row",
          gapMap[gap],
          align && alignMap[align],
          justify && justifyMap[justify],
          wrap && "flex-wrap",
          className
        )}
        {...props}
      >
        {children}
      </Component>
    );
  }
);
Stack.displayName = "Stack";

export { Stack };
