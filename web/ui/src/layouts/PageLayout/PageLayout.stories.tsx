import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import { PageLayout } from "./PageLayout";
import { PageHeader } from "../PageHeader/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/Card/Card";
import { StatCard } from "../../components/StatCard/StatCard";
import { Button } from "../../components/Button/Button";
import { Users, ShieldCheck, Clock, Globe } from "lucide-react";

const meta: Meta<typeof PageLayout> = {
  title: "Layouts/PageLayout",
  component: PageLayout,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
  },
};

export default meta;
type Story = StoryObj<typeof PageLayout>;

export const DashboardSkeleton: Story = {
  render: () => (
    <div className="min-h-screen bg-background">
      <PageLayout>
        <PageHeader
          title="Dashboard"
          description="Monitor identities, pending access, policies, and overall security posture."
          actions={<Button variant="primary">Add user</Button>}
        />
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total users" value={128} subtext="Active accounts" icon={<Users className="h-5 w-5" />} />
          <StatCard label="Pending" value={3} subtext="Needs attention" variant="warning" icon={<Clock className="h-5 w-5" />} />
          <StatCard label="IP policies" value={12} subtext="Security rules" icon={<Globe className="h-5 w-5" />} />
          <StatCard label="Security score" value="94%" subtext="Overall health" variant="success" icon={<ShieldCheck className="h-5 w-5" />} />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              PageLayout provides responsive gutters (16→48px) and a 1280px content column so
              sections never stick to the shell edges.
            </p>
          </CardContent>
        </Card>
      </PageLayout>
    </div>
  ),
};
