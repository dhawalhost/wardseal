import * as React from "react";
import { cn } from "../../lib/utils";
import { Seal } from "../../components/Seal/Seal";

export interface AuthFooterLink {
  label: string;
  href: string;
}

export interface AuthLayoutProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Replaces the brass seal, e.g. a tenant logo. Rendered inside the same medallion slot. */
  brand?: React.ReactNode;
  /** @deprecated The brand name now lives in the title. Kept for compatibility. */
  brandName?: string;
  /** @deprecated The centered layout has no side plate. Accepted and ignored. */
  aside?: React.ReactNode | null;
  /** Line under the card, e.g. "New to WardSeal? Create an organization". */
  footnote?: React.ReactNode;
  footerLinks?: AuthFooterLink[];
}

/**
 * Sign-in, sign-up, setup and recovery screens: one paper card centred on the page,
 * with the brass seal pressed onto its top edge, like a signed document.
 */
const AuthLayout = React.forwardRef<HTMLDivElement, AuthLayoutProps>(
  (
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    { className, title, description, brand, brandName, aside, footnote, footerLinks = [], children, ...props },
    ref
  ) => (
    <div
      ref={ref}
      className={cn("flex min-h-dvh w-full flex-col bg-background font-sans text-on-surface", className)}
      {...props}
    >
      <main className="flex flex-1 items-center justify-center px-4 py-16 sm:px-6">
        <div className="w-full max-w-[420px]">
          <div className="relative rounded-2xl border border-border bg-card px-6 pb-8 pt-16 shadow-[0_1px_2px_rgb(0_0_0/0.04),0_12px_32px_-12px_rgb(0_0_0/0.12)] sm:px-10">
            {/* The mark is pressed onto the card's top edge on a paper medallion, like a seal on a document. */}
            <div className="absolute left-1/2 top-0 flex h-[72px] w-[72px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card shadow-[0_6px_16px_-6px_rgb(0_0_0/0.18)]">
              {brand ?? <Seal className="h-9" />}
            </div>

            <div className="mb-8 text-center">
              <h1 className="text-title text-on-surface">{title}</h1>
              {description && <p className="mt-1.5 text-body text-on-surface-subtle">{description}</p>}
            </div>
            {children}
          </div>

          {footnote && <div className="mt-6 text-center text-sm text-on-surface-subtle">{footnote}</div>}
        </div>
      </main>

      {footerLinks.length > 0 && (
        <footer className="flex h-14 items-center justify-center gap-6 text-xs text-on-surface-subtle">
          {footerLinks.map((l) => (
            <a
              key={l.href}
              href={l.href}
              target="_blank"
              rel="noreferrer"
              className="rounded transition-colors duration-fast hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {l.label}
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          ))}
        </footer>
      )}
    </div>
  )
);
AuthLayout.displayName = "AuthLayout";

/** Divider with centred text, e.g. "or continue with". */
function AuthDivider({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-6 flex items-center gap-3 text-xs text-on-surface-subtle">
      <span className="h-px flex-1 bg-border" />
      {children}
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}

export { AuthLayout, AuthDivider };
