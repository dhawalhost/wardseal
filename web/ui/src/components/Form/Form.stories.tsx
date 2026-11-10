import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import { FormField, FormDescription, FormMessage, FormGroup, FormSection } from "./Form";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "../Card/Card";
import { Label } from "../Label/Label";
import { Input } from "../Input/Input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../Select/Select";
import { Switch } from "../Switch/Switch";
import { Button } from "../Button/Button";

const meta: Meta = {
  title: "Components/Form",
  component: FormGroup,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Wrap each control in `FormField`. It generates ids and wires `Label` → `htmlFor`, " +
          "`FormDescription` / `FormMessage` → `aria-describedby`, and `error` → `aria-invalid` " +
          "on `Input` and `SelectTrigger`. Custom controls can use `useFormControlProps()`.",
      },
    },
  },
};

export default meta;
type Story = StoryObj;

export const EnrollmentForm: Story = {
  render: () => (
    <div className="max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>Enroll secure hardware</CardTitle>
          <CardDescription>Configure external credential parameters</CardDescription>
        </CardHeader>
        <CardContent>
          <FormGroup>
            <FormSection title="Core attributes" description="Hardware identifiers">
              <div className="grid gap-4">
                <FormField required>
                  <Label>Credential name</Label>
                  <Input placeholder="e.g. YubiKey 5C NFC primary" />
                  <FormDescription>Shown to the user when they choose a factor.</FormDescription>
                </FormField>
                <FormField>
                  <Label>Vendor serial</Label>
                  <Input placeholder="ws_vendor_sn_…" />
                </FormField>
                <FormField>
                  <Label>Authenticator type</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fido2">FIDO2 security key</SelectItem>
                      <SelectItem value="tpm">Platform TPM</SelectItem>
                      <SelectItem value="smartcard">Smart card (PIV)</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
              </div>
            </FormSection>

            <FormSection title="Access constraints" description="Gateway authentication controls">
              <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-surface-container p-3">
                <FormField className="gap-0.5">
                  <Label className="text-sm text-on-surface">Strict posture check</Label>
                  <FormDescription>Verify TPM signature challenges</FormDescription>
                </FormField>
                <Switch aria-label="Strict posture check" defaultChecked />
              </div>
            </FormSection>
          </FormGroup>
        </CardContent>
        <CardFooter className="justify-end gap-2">
          <Button variant="outline" size="sm">Cancel</Button>
          <Button variant="primary" size="sm">Save credential</Button>
        </CardFooter>
      </Card>
    </div>
  ),
};

export const States: Story = {
  render: () => (
    <div className="grid max-w-md gap-6">
      <FormField>
        <Label>Default</Label>
        <Input placeholder="Placeholder text" />
      </FormField>
      <FormField>
        <Label>With description</Label>
        <Input defaultValue="acme-corp" />
        <FormDescription>Lowercase letters, numbers and hyphens.</FormDescription>
      </FormField>
      <FormField required error="Enter a workspace slug.">
        <Label>Invalid</Label>
        <Input placeholder="workspace-slug" />
        <FormMessage />
      </FormField>
      <FormField error="Choose a region before continuing.">
        <Label>Invalid select</Label>
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Select a region" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="us">United States</SelectItem>
            <SelectItem value="eu">European Union</SelectItem>
          </SelectContent>
        </Select>
        <FormMessage />
      </FormField>
      <FormField disabled>
        <Label>Disabled</Label>
        <Input defaultValue="Managed by SCIM" />
      </FormField>
      <FormField>
        <Label>Read-only</Label>
        <Input readOnly defaultValue="ws_tenant_8f2c" />
      </FormField>
    </div>
  ),
};
