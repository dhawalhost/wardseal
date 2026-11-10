import * as React from "react";
import { cn } from "../../lib/utils";
import { Seal } from "../../components/Seal/Seal";
import { BrandMark } from "../BrandMark";

export interface AuthFooterLink {
  label: string;
  href: string;
}

export interface AuthLayoutProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Replaces the default WardSeal lockup, e.g. a tenant logo. */
  brand?: React.ReactNode;
  brandName?: string;
  /** Right-hand plate. Defaults to the signed-decision seal; pass `null` for a single column. */
  aside?: React.ReactNode | null;
  /** Line under the form, e.g. "Don't have an account? Get started". */
  footnote?: React.ReactNode;
  footerLinks?: AuthFooterLink[];
}

/** Default plate: ink surface, ledger rules, the seal and one factual line. */
function SealAside() {
  return (
    <div className="relative flex h-full flex-col justify-between overflow-hidden rounded-2xl bg-[hsl(224_40%_8%)] p-10 text-white xl:p-14">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(to_bottom,transparent_0,transparent_31px,rgb(255_255_255/0.04)_31px,rgb(255_255_255/0.04)_32px)]"
      />
      <p className="relative font-mono text-xs text-white/55">wardseal · identity control plane</p>

      <div className="relative">
        <Seal className="mb-10 h-24 w-24 -rotate-12 drop-shadow-[0_8px_16px_rgb(0_0_0/0.35)]" />
        <p className="max-w-sm text-[28px] font-medium leading-[1.15] tracking-[-0.022em]">
          Every sign-in decided, signed and on the record
        </p>
        <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/60">
          Passkeys, policy and session issuance in one place, with each decision written to a signed audit log
        </p>
      </div>

      <div className="relative flex items-center gap-3 font-mono text-xs text-white/55">
        <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--success))]" aria-hidden />
        ed25519 · append-only audit
      </div>
    </div>
  );
}

/**
 * Sign-in, sign-up, setup and recovery screens. Form column on the left,
 * a brand plate on the right from `lg`. Keeps every auth step on one rhythm.
 */
const AuthLayout = React.forwardRef<HTMLDivElement, AuthLayoutProps>(
  (
    { className, title, description, brand, brandName = "WardSeal", aside, footnote, footerLinks = [], children, ...props },
    ref
  ) => {
    const plate = aside === undefined ? <SealAside /> : aside;
    return (
      <div
        ref={ref}
        className={cn(
          "grid min-h-dvh w-full bg-background font-sans text-on-surface",
          plate && "lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]",
          className
        )}
        {...props}
      >
        <div className="flex min-h-dvh flex-col px-6 sm:px-10">
          <div className="flex h-16 items-center">{brand ?? <BrandMark name={brandName} />}</div>

          <main className="flex flex-1 items-center justify-center py-10">
            <div className="w-full max-w-[380px]">
              <div className="mb-8">
                <h1 className="text-title-lg text-on-surface">{title}</h1>
                {description && <p className="mt-2 text-body text-on-surface-subtle">{description}</p>}
              </div>
              {children}
              {footnote && <div className="mt-8 text-sm text-on-surface-subtle">{footnote}</div>}
            </div>
          </main>

          {footerLinks.length > 0 && (
            <footer className="flex h-14 items-center gap-5 text-xs text-on-surface-subtle">
              {footerLinks.map((l) => (
                <a key={l.href} href={l.href} target="_blank" rel="noreferrer" className="transition-colors duration-fast hover:text-on-surface">
                  {l.label}
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              ))}
            </footer>
          )}
        </div>

        {plate && <aside className="hidden p-2 lg:block">{plate}</aside>}
      </div>
    );
  }
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
