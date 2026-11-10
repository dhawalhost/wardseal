import React from "react";
import { cn } from "@/lib/utils";
import { GlassCard, GlassCardHeader, GlassCardTitle, GlassCardContent } from "@dhawalhost/wardseal-ui-kit";

// ── Types ─────────────────────────────────────────────────────────────────────
export interface PageSectionProps {
    /** Section heading */
    title: string;
    /** Optional lucide icon beside the title */
    icon?: React.ReactNode;
    /** Subtitle / muted description */
    description?: string;
    /** Extra content to render in the header row (e.g. action buttons) */
    headerActions?: React.ReactNode;
    /** Main body content */
    children: React.ReactNode;
    /** No internal padding on the content area (useful for tables) */
    noPadding?: boolean;
    /** Additional classes on the outer GlassCard */
    className?: string;
    /** Additional classes on the content wrapper */
    contentClassName?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────
/**
 * Standard page section: card with header + content.
 * Drop-in for the GlassCard + GlassCardHeader + icon + title + GlassCardContent
 * pattern used in every list/table page.
 *
 * @example
 * <PageSection
 *   title="Request manifest"
 *   icon={<ClipboardList />}
 *   description="Pending access requests awaiting authorization."
 *   headerActions={<Button>Export</Button>}
 *   noPadding
 * >
 *   <GlassTable>...</GlassTable>
 * </PageSection>
 */
export const PageSection: React.FC<PageSectionProps> = ({
    title,
    icon,
    description,
    headerActions,
    children,
    noPadding = false,
    className,
    contentClassName,
}) => {
    return (
        <GlassCard
            className={cn(
                "border-none shadow-overlay shadow-on-surface/5 bg-card overflow-hidden rounded-xl",
                className
            )}
        >
            <GlassCardHeader className="py-4 px-6 border-b border-on-surface/5 bg-surface-container/5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        {icon && (
                            <div className="p-2 bg-surface-container-low rounded-lg text-primary">
                                {icon}
                            </div>
                        )}
                        <div>
                            <GlassCardTitle className="text-lg font-medium tracking-tight text-on-surface">
                                {title}
                            </GlassCardTitle>
                            {description && (
                                <p className="text-muted-foreground font-medium text-xs mt-0.5">
                                    {description}
                                </p>
                            )}
                        </div>
                    </div>
                    {headerActions && (
                        <div className="flex items-center gap-3">{headerActions}</div>
                    )}
                </div>
            </GlassCardHeader>

            <GlassCardContent className={cn(noPadding ? "p-0" : "p-6", contentClassName)}>
                {children}
            </GlassCardContent>
        </GlassCard>
    );
};
PageSection.displayName = "PageSection";
