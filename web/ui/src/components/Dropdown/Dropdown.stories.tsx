import type { Meta, StoryObj } from "@storybook/react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
} from "./Dropdown";
import { Button } from "../Button/Button";
import { User, Settings2, Key, Mail, ShieldAlert, ChevronDown } from "lucide-react";
import React from "react";

const meta: Meta<typeof DropdownMenu> = {
  title: "Components/DropdownMenu",
  component: DropdownMenu,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof DropdownMenu>;

export const ProfileMenu: Story = {
  render: () => (
    <div className="h-64 flex justify-center items-start pt-4">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="flex items-center gap-2">
            <span>Admin Actions</span>
            <ChevronDown className="w-4 h-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
          <DropdownMenuLabel>Authenticated Account</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem>
              <User className="text-on-surface-subtle" aria-hidden />
              <span>Profile Settings</span>
              <DropdownMenuShortcut>⌘P</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings2 className="text-on-surface-subtle" aria-hidden />
              <span>Manage Groups</span>
              <DropdownMenuShortcut>⌘G</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Key className="text-on-surface-subtle" aria-hidden />
              <span>Set Password</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Mail className="text-on-surface-subtle" aria-hidden />
              <span>Send Reset Link</span>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive">
            <ShieldAlert aria-hidden />
            <span>Suspend user</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  ),
};
