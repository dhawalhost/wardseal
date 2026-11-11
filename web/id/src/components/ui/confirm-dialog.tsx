import * as React from "react";
import { createRoot } from "react-dom/client";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ConfirmDialogProps {
    /** Whether the dialog is open */
    open: boolean;
    /** Called when the dialog closes, confirmed or not */
    onClose: () => void;
    /** Called when the user confirms */
    onConfirm: () => void | Promise<void>;
    /** Title, phrased as the action, e.g. "Delete this group?" */
    title?: string;
    /** What happens if they go ahead */
    description?: string;
    /** Confirm button label, the verb, e.g. "Delete group" */
    confirmLabel?: string;
    /** Cancel button label */
    cancelLabel?: string;
    /** Visual intent of the confirm button */
    variant?: "danger" | "warning" | "default";
    /** Disables the buttons while the action runs */
    loading?: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Accessible confirmation dialog — replaces `window.confirm()` throughout the app.
 * For one-off checks inside handlers, use `confirmAction()` below.
 */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
    open,
    onClose,
    onConfirm,
    title = "Are you sure?",
    description = "This cannot be undone.",
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    variant = "danger",
    loading = false,
}) => {
    const handleConfirm = async () => {
        await onConfirm();
        onClose();
    };

    return (
        <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
            <DialogContent className="sm:max-w-[440px]">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2 sm:gap-2">
                    <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                        {cancelLabel}
                    </Button>
                    <Button
                        type="button"
                        variant={variant === "danger" ? "destructive" : variant === "warning" ? "primary" : "secondary"}
                        onClick={handleConfirm}
                        isLoading={loading}
                        autoFocus={variant !== "danger"}
                    >
                        {confirmLabel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
ConfirmDialog.displayName = "ConfirmDialog";

// ── Imperative helper ─────────────────────────────────────────────────────────

export type ConfirmActionOptions = Omit<ConfirmDialogProps, "open" | "onClose" | "onConfirm" | "loading">;

/**
 * Promise-based drop-in for `window.confirm()`:
 *   if (!(await confirmAction({ title: "Delete this group?", confirmLabel: "Delete group" }))) return;
 * Resolves true on confirm, false on cancel, Esc or outside click.
 */
export function confirmAction(options: ConfirmActionOptions | string): Promise<boolean> {
    const opts: ConfirmActionOptions = typeof options === "string" ? { title: options } : options;
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);

    return new Promise<boolean>((resolve) => {
        let settled = false;
        const finish = (value: boolean) => {
            if (settled) return;
            settled = true;
            resolve(value);
            root.render(<ConfirmDialog {...opts} open={false} onClose={() => {}} onConfirm={() => {}} />);
            // Let the close animation finish before unmounting.
            setTimeout(() => {
                root.unmount();
                host.remove();
            }, 200);
        };
        root.render(<ConfirmDialog {...opts} open onClose={() => finish(false)} onConfirm={() => finish(true)} />);
    });
}
