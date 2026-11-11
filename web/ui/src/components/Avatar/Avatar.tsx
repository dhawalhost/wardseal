import * as React from "react";
import BoringAvatar from "boring-avatars";
import { cn } from "../../lib/utils";

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  name: string;
  size?: number;
  /** `initials` (default) is a quiet monogram; the boring-avatars variants stay for opt-in use. */
  variant?: "initials" | "marble" | "beam" | "pixel" | "sunset" | "ring" | "bauhaus";
}

function initialsOf(name: string) {
  const parts = name
    .replace(/@.*$/, "")
    .split(/[\s._-]+/)
    .filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : (parts[0] ?? "?").slice(0, 2);
  return letters.toUpperCase();
}

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, name, size = 32, variant = "initials", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-container-high font-medium text-on-surface-variant",
          className
        )}
        style={{ width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.38)) }}
        {...props}
      >
        {variant === "initials" ? (
          <span aria-hidden>{initialsOf(name)}</span>
        ) : (
          <BoringAvatar
            size={size}
            name={name}
            variant={variant}
            colors={["#14161B", "#8A6B2E", "#4A4F57", "#E9E4D9", "#5E6B78"]}
          />
        )}
      </div>
    );
  }
);
Avatar.displayName = "Avatar";

export { Avatar };
