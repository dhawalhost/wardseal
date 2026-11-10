import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check, Minus } from "lucide-react";
import { cn } from "../../lib/utils";
import { focusRing } from "../../lib/styles";
import { useFormControlProps } from "../Form/Form";

/**
 * 16px box with a --input border (≥3:1). Pair with a <Label> — the label is
 * the click target that brings the hit area past 24px (WCAG 2.5.8).
 * Supports `checked="indeterminate"`.
 */
const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => {
  const aria = useFormControlProps(props);

  return (
    <CheckboxPrimitive.Root
      ref={ref}
      className={cn(
        "peer flex h-4 w-4 shrink-0 items-center justify-center rounded border border-input bg-card text-primary-foreground transition-colors duration-fast",
        "hover:border-on-surface-subtle",
        "data-[state=checked]:border-primary data-[state=checked]:bg-primary",
        "data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary",
        "aria-[invalid=true]:border-error",
        "disabled:cursor-not-allowed disabled:opacity-50",
        focusRing,
        className
      )}
      {...props}
      {...aria}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center">
        {props.checked === "indeterminate" ? (
          <Minus className="h-3 w-3 stroke-[3]" aria-hidden />
        ) : (
          <Check className="h-3 w-3 stroke-[3]" aria-hidden />
        )}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
});
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };
