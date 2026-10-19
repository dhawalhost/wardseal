/** SoT: @dhawalhost/wardseal-ui-kit@0.2.0 — plus types for the app toast hook. */
import type * as React from "react";

export {
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
} from "@dhawalhost/wardseal-ui-kit";

export type ToastProps = {
  id?: string;
  className?: string;
  variant?: "default" | "destructive" | "success";
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
};

export type ToastActionElement = React.ReactElement;
