import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import {
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
} from "./Toast";
import { Button } from "../Button/Button";

const meta: Meta<typeof Toast> = {
  title: "Components/Toast",
  component: Toast,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Toast>;

export const Default: Story = {
  render: () => {
    const [open, setOpen] = React.useState(false);
    return (
      <ToastProvider>
        <Button variant="outline" onClick={() => setOpen(true)}>
          Show Default Notification
        </Button>
        <Toast open={open} onOpenChange={setOpen}>
          <div className="grid gap-1">
            <ToastTitle>System Update Complete</ToastTitle>
            <ToastDescription>All security posture checks have been completed.</ToastDescription>
          </div>
          <ToastClose />
        </Toast>
        <ToastViewport />
      </ToastProvider>
    );
  },
};

export const Success: Story = {
  render: () => {
    const [open, setOpen] = React.useState(false);
    return (
      <ToastProvider>
        <Button variant="primary" onClick={() => setOpen(true)}>
          Show Success Message
        </Button>
        <Toast open={open} onOpenChange={setOpen} variant="success">
          <div className="grid gap-1">
            <ToastTitle>Credential Sync Complete</ToastTitle>
            <ToastDescription>MFA tokens were successfully verified and loaded.</ToastDescription>
          </div>
          <ToastClose />
        </Toast>
        <ToastViewport />
      </ToastProvider>
    );
  },
};

export const Destructive: Story = {
  render: () => {
    const [open, setOpen] = React.useState(false);
    return (
      <ToastProvider>
        <Button variant="outline" onClick={() => setOpen(true)}>
          Show error
        </Button>
        <Toast open={open} onOpenChange={setOpen} variant="destructive">
          <div className="grid gap-1">
            <ToastTitle>Hardware Token Unlinked</ToastTitle>
            <ToastDescription>Verification challenge failed. Origin is untrusted.</ToastDescription>
          </div>
          <ToastAction altText="Retry sync">Retry</ToastAction>
          <ToastClose />
        </Toast>
        <ToastViewport />
      </ToastProvider>
    );
  },
};

/** Every variant open at once — for visual + contrast review. */
export const AllVariants: Story = {
  render: () => (
    <ToastProvider duration={Infinity}>
      {(["default", "success", "info", "warning", "destructive"] as const).map((variant) => (
        <Toast key={variant} variant={variant} open>
          <div className="grid gap-1">
            <ToastTitle>{variant[0].toUpperCase() + variant.slice(1)} notification</ToastTitle>
            <ToastDescription>Supporting detail explains what happened and what to do next.</ToastDescription>
          </div>
          {variant === "destructive" && <ToastAction altText="Retry">Retry</ToastAction>}
          <ToastClose />
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  ),
};
