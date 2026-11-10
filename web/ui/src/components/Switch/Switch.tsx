import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cn } from "../../lib/utils";
import { focusRing } from "../../lib/styles";
import { useFormControlProps } from "../Form/Form";

/**
 * 44×24 track (meets the 24px target minimum). Off state keeps a --input
 * border so the control is identifiable at ≥3:1; on state fills with --primary.
 * Needs an accessible name: a linked <Label> or `aria-label`.
 */
const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(({ className, ...props }, ref) => {
  const aria = useFormControlProps(props);

  return (
    <SwitchPrimitive.Root
      ref={ref}
      className={cn(
        "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-input bg-surface-container-high p-0.5 transition-colors duration-fast",
        "data-[state=checked]:border-primary data-[state=checked]:bg-primary",
        "disabled:cursor-not-allowed disabled:opacity-50",
        focusRing,
        className
      )}
      {...props}
      {...aria}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          "pointer-events-none block h-[18px] w-[18px] rounded-full bg-card shadow-sm ring-1 ring-border transition-transform duration-fast",
          "data-[state=unchecked]:translate-x-0 data-[state=checked]:translate-x-5 data-[state=checked]:ring-0"
        )}
      />
    </SwitchPrimitive.Root>
  );
});
Switch.displayName = SwitchPrimitive.Root.displayName;

export { Switch };
