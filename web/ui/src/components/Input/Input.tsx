import * as React from "react";
import { AlertCircle } from "lucide-react";
import { cn } from "../../lib/utils";
import { useFormControlProps } from "../Form/Form";

/**
 * Shared control surface for Input, SelectTrigger and app-level Textarea.
 * Border uses --input (≥3:1), focus uses --ring with ring-2 + offset,
 * invalid state keys off aria-invalid so it can't drift from semantics.
 */
export const controlBaseClass =
  "w-full rounded-lg border border-input bg-card text-sm text-on-surface shadow-xs " +
  "transition-colors duration-fast " +
  "placeholder:text-on-surface-subtle " +
  "hover:border-on-surface-subtle " +
  "focus-visible:outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background " +
  "aria-[invalid=true]:border-error aria-[invalid=true]:focus-visible:ring-error " +
  "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-input";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /**
   * Standalone error text rendered below the input and linked via aria-describedby.
   * Inside a FormField, pass `error` to FormField and use <FormMessage /> instead.
   */
  error?: string;
  /** Decorative leading icon (hidden from assistive tech). */
  icon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, icon, ...props }, ref) => {
    const ownMessageId = React.useId().replace(/:/g, "");
    const messageId = error ? `input-${ownMessageId}-error` : undefined;
    const aria = useFormControlProps(props, messageId);

    return (
      <div className="group/input relative w-full">
        {icon && (
          <div
            className="pointer-events-none absolute left-3 top-1/2 flex -translate-y-1/2 items-center text-on-surface-subtle transition-colors duration-fast group-focus-within/input:text-secondary [&_svg]:h-4 [&_svg]:w-4"
            aria-hidden
          >
            {icon}
          </div>
        )}
        <input
          type={type}
          className={cn(
            controlBaseClass,
            "flex h-10 px-3 py-2 read-only:bg-muted file:border-0 file:bg-transparent file:text-sm file:font-medium",
            icon && "pl-10",
            className
          )}
          ref={ref}
          {...props}
          {...aria}
        />
        {error && (
          <p
            id={messageId}
            className="mt-1.5 flex items-start gap-1.5 text-xs font-medium text-error-subtle-foreground"
          >
            <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>{error}</span>
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };
