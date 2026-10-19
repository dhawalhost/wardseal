/**
 * App Avatar — prefers @dhawalhost/wardseal-ui-kit@0.2.0 when `name` is set.
 * Legacy compound (AvatarImage / AvatarFallback) kept as thin shells for gradual migration.
 */
import * as React from "react";
import { Avatar as KitAvatar, type AvatarProps as KitAvatarProps } from "@dhawalhost/wardseal-ui-kit";
import { cn } from "@/lib/utils";

export type AvatarProps = Partial<KitAvatarProps> &
  React.HTMLAttributes<HTMLDivElement> & {
    name?: string;
  };

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ name, size, variant, className, children, ...props }, ref) => {
    if (name) {
      return (
        <KitAvatar
          ref={ref}
          name={name}
          size={size}
          variant={variant}
          className={className}
          {...props}
        />
      );
    }
    return (
      <div
        ref={ref}
        className={cn(
          "relative flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface-container border border-border shadow-sm",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Avatar.displayName = "Avatar";

/** @deprecated Prefer kit Avatar with `name`. */
const AvatarImage = ({ className, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) => (
  <img className={cn("aspect-square h-full w-full object-cover", className)} alt="" {...props} />
);
AvatarImage.displayName = "AvatarImage";

/** @deprecated Prefer kit Avatar with `name`. */
const AvatarFallback = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex h-full w-full items-center justify-center rounded-[inherit] bg-muted text-muted-foreground",
      className
    )}
    {...props}
  />
);
AvatarFallback.displayName = "AvatarFallback";

export { Avatar, AvatarImage, AvatarFallback };
