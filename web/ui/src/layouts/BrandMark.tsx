import * as React from "react";
import { cn } from "../lib/utils";
import { Logo } from "../components/Logo/Logo";

/** Shell brand lockup — mono shield follows --primary so it holds in both themes. */
export function BrandMark({ name, className }: { name: string; className?: string }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <Logo
        variant="icon"
        logoColor="mono"
        width={22}
        height={26}
        className="text-primary"
        aria-hidden
        focusable="false"
      />
      <span className="text-sm font-bold tracking-tight text-on-surface">{name}</span>
    </span>
  );
}
