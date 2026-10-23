import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import { PageLayout } from "./PageLayout/PageLayout";
import { PageHeader } from "./PageHeader/PageHeader";
import { Section } from "./Section/Section";
import { Container } from "./Container/Container";
import { Stack } from "./Stack/Stack";
import { Grid, GridItem } from "../components/Grid/Grid";
import { StatCard } from "../components/StatCard/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "../components/Card/Card";
import { Button } from "../components/Button/Button";
import { Users, Clock, Globe, ShieldCheck } from "lucide-react";

const meta: Meta = {
  title: "Layouts/System",
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj;

export const DashboardComposition: Story = {
  name: "Dashboard composition",
  render: () => (
    <div className="min-h-screen bg-background">
      <PageLayout>
        <PageHeader
          title="Dashboard"
          description="Canonical layout: PageLayout → PageHeader → Section → Grid."
          actions={<Button variant="primary">Add user</Button>}
        />

        <Section aria-label="Key metrics">
          <Grid cols={{ base: 1, sm: 2, xl: 4 }} gap="section">
            <GridItem>
              <StatCard label="Total users" value={128} subtext="Active" icon={<Users className="h-5 w-5" />} />
            </GridItem>
            <GridItem>
              <StatCard label="Pending" value={3} variant="warning" subtext="Needs attention" icon={<Clock className="h-5 w-5" />} />
            </GridItem>
            <GridItem>
              <StatCard label="IP policies" value={12} subtext="Rules" icon={<Globe className="h-5 w-5" />} />
            </GridItem>
            <GridItem>
              <StatCard label="Score" value="94%" variant="success" subtext="Health" icon={<ShieldCheck className="h-5 w-5" />} />
            </GridItem>
          </Grid>
        </Section>

        <Section title="Overview" description="7/5 split on large screens.">
          <Grid cols={{ base: 1, lg: 12 }} gap="section">
            <GridItem span={{ base: 12, lg: 7 }}>
              <Card>
                <CardHeader>
                  <CardTitle>System activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-40 rounded-lg bg-muted flex items-center justify-center text-sm text-muted-foreground">
                    Chart region
                  </div>
                </CardContent>
              </Card>
            </GridItem>
            <GridItem span={{ base: 12, lg: 5 }}>
              <Card>
                <CardHeader>
                  <CardTitle>Security posture</CardTitle>
                </CardHeader>
                <CardContent>
                  <Stack gap="md">
                    <p className="text-3xl font-bold tabular-nums text-success">94%</p>
                    <p className="text-sm text-muted-foreground">Hygiene score</p>
                  </Stack>
                </CardContent>
              </Card>
            </GridItem>
          </Grid>
        </Section>
      </PageLayout>
    </div>
  ),
};

export const ContainerAndStack: Story = {
  render: () => (
    <div className="min-h-screen bg-background py-10">
      <Container size="md" padded>
        <Stack gap="section">
          <h1 className="text-2xl font-bold text-on-surface">Container + Stack</h1>
          <Stack direction="horizontal" gap="card" wrap>
            <Card className="flex-1 min-w-[200px]">
              <CardContent>Card A</CardContent>
            </Card>
            <Card className="flex-1 min-w-[200px]">
              <CardContent>Card B</CardContent>
            </Card>
          </Stack>
        </Stack>
      </Container>
    </div>
  ),
};
