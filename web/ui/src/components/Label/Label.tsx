import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";
import { useFormField } from "../Form/Form";

/** 12px semibold, secondary-text tier (7:1). Sentence case — no forced uppercase. */
const labelVariants = cva(
  "text-label text-on-surface-variant select-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 group-data-[disabled]/field:opacity-70"
);

export interface LabelProps
  extends React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>,
    VariantProps<typeof labelVariants> {
  /** Show a required marker. Defaults to the enclosing FormField's `required`. */
  required?: boolean;
}

const Label = React.forwardRef<React.ElementRef<typeof LabelPrimitive.Root>, LabelProps>(
  ({ className, htmlFor, required, children, ...props }, ref) => {
    const field = useFormField();
    const showRequired = required ?? field?.required;

    return (
      <LabelPrimitive.Root
        ref={ref}
        htmlFor={htmlFor ?? field?.id}
        className={cn(labelVariants(), className)}
        {...props}
      >
        {children}
        {showRequired && (
          // Control carries `required`, so AT already announces it; marker is visual only.
          <span className="ml-0.5 text-error-subtle-foreground" aria-hidden>
            *
          </span>
        )}
      </LabelPrimitive.Root>
    );
  }
);
Label.displayName = LabelPrimitive.Root.displayName;

export { Label, labelVariants };
