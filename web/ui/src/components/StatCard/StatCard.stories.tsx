import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import { StatCard } from "./StatCard";
import { Users, Clock, ShieldCheck, Globe } from "lucide-react";

const meta: Meta<typeof StatCard> = {
  title: "Components/StatCard",
  component: StatCard,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof StatCard>;

export const Default: Story = {
  args: {
    label: "Total users",
    value: 128,
    subtext: "Active accounts",
    icon: <Users className="h-5 w-5" />,
  },
};

export const Variants: Story = {
  render: () => (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4 p-8 bg-background">
      <StatCard label="Total users" value={128} subtext="Active accounts" icon={<Users className="h-5 w-5" />} />
      <StatCard label="Pending" value={3} subtext="Needs attention" variant="warning" icon={<Clock className="h-5 w-5" />} />
      <StatCard label="IP policies" value={12} subtext="Security rules" variant="primary" icon={<Globe className="h-5 w-5" />} />
      <StatCard label="Security score" value="94%" subtext="Overall health" variant="success" icon={<ShieldCheck className="h-5 w-5" />} />
    </div>
  ),
};

export const Loading: Story = {
  args: {
    label: "Total users",
    value: 0,
    subtext: "Active accounts",
    loading: true,
    icon: <Users className="h-5 w-5" />,
  },
};
