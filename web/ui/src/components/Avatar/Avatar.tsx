import * as React from "react";
import BoringAvatar from "boring-avatars";
import { cn } from "../../lib/utils";

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  name: string;
  size?: number;
  variant?: "marble" | "beam" | "pixel" | "sunset" | "ring" | "bauhaus";
}

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, name, size = 32, variant = "marble", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "relative flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface-container border border-border shadow-sm",
          className
        )}
        style={{ width: size, height: size }}
        {...props}
      >
        <BoringAvatar
          size={size}
          name={name}
          variant={variant}
          colors={["#0F172A", "#0369A1", "#334155", "#E2E8F0", "#0284C7"]}
        />
      </div>
    );
  }
);
Avatar.displayName = "Avatar";

export { Avatar };
