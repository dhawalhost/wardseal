import * as React from "react";
import { cn } from "../../lib/utils";

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, ...props }, ref) => {
    // Ensure value is within bounds
    const percentage = Math.min(100, Math.max(0, value));

    return (
      <div
        ref={ref}
        className={cn(
          "relative h-1.5 w-full overflow-hidden rounded-full bg-surface-container-high",
          className
        )}
        {...props}
      >
        <div
          className="h-full w-full flex-1 rounded-full bg-secondary transition-transform duration-base ease-standard"
          style={{ transform: `translateX(-${100 - percentage}%)` }}
        />
      </div>
    );
  }
);
Progress.displayName = "Progress";

export { Progress };
