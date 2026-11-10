import * as React from "react";
import { cn } from "../lib/utils";
import { Logo } from "../components/Logo/Logo";

/** Shell brand lockup — mono shield follows --primary so it holds in both themes. */
export function BrandMark({
  name,
  subtitle,
  className,
}: {
  name: string;
  subtitle?: string;
  className?: string;
}) {
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
      <span className="flex flex-col">
        <span className="text-[15px] font-semibold leading-tight text-on-surface">{name}</span>
        {subtitle && (
          <span className="text-xs leading-tight text-on-surface-subtle">{subtitle}</span>
        )}
      </span>
    </span>
  );
}

/** Link contract every shell uses, so apps can plug in their router's <Link>. */
export interface ShellLinkProps {
  href: string;
  className?: string;
  children: React.ReactNode;
  "aria-current"?: "page";
  "aria-label"?: string;
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
}

export type RenderShellLink = (props: ShellLinkProps) => React.ReactElement;

export const defaultRenderLink: RenderShellLink = ({ href, children, ...rest }) => (
  <a href={href} {...rest}>
    {children}
  </a>
);
