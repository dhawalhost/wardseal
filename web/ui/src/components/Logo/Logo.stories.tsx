import type { Meta, StoryObj } from "@storybook/react";
import * as React from "react";
import { Logo } from "./Logo";

const meta: Meta<typeof Logo> = {
  title: "Brand/Logo",
  component: Logo,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Logo>;

export const DefaultFull: Story = {
  args: {
    variant: "full",
    logoColor: "brand",
    textColor: "mono",
    className: "h-12 w-auto text-on-surface",
  },
};

export const ShieldIcon: Story = {
  args: {
    variant: "icon",
    logoColor: "brand",
    className: "h-16 w-auto",
  },
};

export const MonochromaticLogo: Story = {
  render: () => (
    <div className="flex flex-col gap-6 p-6 bg-surface-container rounded-xl border border-border">
      <div>
        <p className="mb-2 text-label text-on-surface-variant">
          Brand ink (text-primary)
        </p>
        <Logo
          variant="full"
          logoColor="mono"
          textColor="mono"
          className="h-10 w-auto text-primary"
        />
      </div>
      <div>
        <p className="mb-2 text-label text-on-surface-variant">
          CTA blue (text-secondary)
        </p>
        <Logo
          variant="full"
          logoColor="mono"
          textColor="mono"
          className="h-10 w-auto text-secondary"
        />
      </div>
      <div>
        <p className="mb-2 text-label text-on-surface-variant">
          Subtle (text-on-surface-subtle)
        </p>
        <Logo
          variant="full"
          logoColor="mono"
          textColor="mono"
          className="h-10 w-auto text-on-surface-subtle"
        />
      </div>
    </div>
  ),
};

export const ResponsiveScales: Story = {
  render: () => (
    <div className="flex flex-col gap-8 p-4">
      <div className="space-y-2">
        <span className="text-xs font-medium text-muted-foreground ">
          Micro (Navbar header / sidebar collapsed)
        </span>
        <div className="flex gap-4 items-center">
          <Logo variant="icon" className="h-6 w-auto" />
          <Logo variant="full" className="h-6 w-auto" />
        </div>
      </div>

      <div className="space-y-2">
        <span className="text-xs font-medium text-muted-foreground ">
          Standard (Sidebar Header / Dashboard Panel)
        </span>
        <div className="flex gap-6 items-center">
          <Logo variant="icon" className="h-10 w-auto" />
          <Logo variant="full" className="h-10 w-auto" />
        </div>
      </div>

      <div className="space-y-2">
        <span className="text-xs font-medium text-muted-foreground ">
          Large (Sign-in / Console Splash Page)
        </span>
        <div className="flex flex-col gap-4">
          <Logo variant="icon" className="h-24 w-auto self-start" />
          <Logo variant="full" className="h-20 w-auto self-start" />
        </div>
      </div>
    </div>
  ),
};
