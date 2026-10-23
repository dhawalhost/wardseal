/**
 * App Button — wraps @dhawalhost/wardseal-ui-kit@0.2.0.
 * Maps legacy shadcn `default` → kit `secondary` (CTA).
 */
import * as React from "react";
import {
  Button as KitButton,
  buttonVariants,
  type ButtonProps as KitButtonProps,
} from "@dhawalhost/wardseal-ui-kit";

export type ButtonProps = Omit<KitButtonProps, "variant" | "size"> & {
  variant?: KitButtonProps["variant"] | "default" | "link" | "premium";
  size?: KitButtonProps["size"] | "default";
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "secondary", size = "md", ...props }, ref) => {
    const mappedVariant =
      variant === "default" || variant === "link" || variant === "premium"
        ? "secondary"
        : variant;
    const mappedSize = size === "default" ? "md" : size;
    return (
      <KitButton ref={ref} variant={mappedVariant} size={mappedSize} {...props} />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
