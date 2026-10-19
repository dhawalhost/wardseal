/**
 * WardSeal Brand UI Kit — source of truth for the WardSeal design system.
 *
 * Apps must import styles explicitly:
 *   import "@dhawalhost/wardseal-ui-kit/tokens.css";
 *   // or the full bundle: import "@dhawalhost/wardseal-ui-kit/styles.css";
 * And use the Tailwind preset:
 *   presets: [require("@dhawalhost/wardseal-ui-kit/tailwind-preset").tailwindPreset]
 */

// ── UTILITIES ──
export { cn } from "./lib/utils";

// ── CORE COMPONENTS ──

// Button
export { Button, buttonVariants } from "./components/Button/Button";
export type { ButtonProps } from "./components/Button/Button";

// Input
export { Input } from "./components/Input/Input";
export type { InputProps } from "./components/Input/Input";

// Avatar
export { Avatar } from "./components/Avatar/Avatar";
export type { AvatarProps } from "./components/Avatar/Avatar";

// Badge
export { Badge, badgeVariants } from "./components/Badge/Badge";
export type { BadgeProps } from "./components/Badge/Badge";

// Card
export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "./components/Card/Card";

/** App-facing aliases — same primitives as Card (product UIs used Glass* names). */
export {
  Card as GlassCard,
  CardHeader as GlassCardHeader,
  CardTitle as GlassCardTitle,
  CardDescription as GlassCardDescription,
  CardContent as GlassCardContent,
  CardFooter as GlassCardFooter,
} from "./components/Card/Card";

// Dropdown
export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
} from "./components/Dropdown/Dropdown";

// Table
export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
  GlassTable,
  GlassTableHeader,
  GlassTableRow,
  GlassTableHead,
} from "./components/Table/Table";

// Label
export { Label } from "./components/Label/Label";

// Checkbox
export { Checkbox } from "./components/Checkbox/Checkbox";

// Select
export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
} from "./components/Select/Select";

// Switch
export { Switch } from "./components/Switch/Switch";

// Dialog
export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "./components/Dialog/Dialog";

// Sheet
export {
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
} from "./components/Sheet/Sheet";

// Toast
export {
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
} from "./components/Toast/Toast";

// Tabs
export { Tabs, TabsList, TabsTrigger, TabsContent } from "./components/Tabs/Tabs";

// ScrollArea
export { ScrollArea, ScrollBar } from "./components/ScrollArea/ScrollArea";

// Separator
export { Separator } from "./components/Separator/Separator";

// Skeleton
export { Skeleton } from "./components/Skeleton/Skeleton";

// Progress
export { Progress } from "./components/Progress/Progress";
export type { ProgressProps } from "./components/Progress/Progress";

// Tooltip
export {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "./components/Tooltip/Tooltip";

// Popover
export { Popover, PopoverTrigger, PopoverContent } from "./components/Popover/Popover";

// Accordion
export {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "./components/Accordion/Accordion";

// CommandMenu
export { CommandMenu } from "./components/CommandMenu/CommandMenu";
export type { CommandItem, CommandMenuProps } from "./components/CommandMenu/CommandMenu";

// Form
export { FormField, FormGroup, FormSection } from "./components/Form/Form";
export type { FormFieldProps, FormSectionProps } from "./components/Form/Form";

// Logo
export { Logo } from "./components/Logo/Logo";
export type { LogoProps } from "./components/Logo/Logo";

// Tailwind Preset
export { tailwindPreset } from "./tailwind-preset";

// ── LAYOUT SHELLS ──

// Grid
export { Grid, GridItem } from "./components/Grid/Grid";
export type {
  GridProps,
  GridItemProps,
  ResponsiveValue,
  GridCols,
  GridSpans,
  GridOffsets,
  GridGaps,
} from "./components/Grid/Grid";

// PageHeader
export { PageHeader } from "./layouts/PageHeader/PageHeader";
export type { PageHeaderProps, BreadcrumbItem } from "./layouts/PageHeader/PageHeader";

// PageLayout
export { PageLayout } from "./layouts/PageLayout/PageLayout";
export type { PageLayoutProps } from "./layouts/PageLayout/PageLayout";

// Container / Stack / Section
export { Container } from "./layouts/Container/Container";
export type { ContainerProps, ContainerSize } from "./layouts/Container/Container";
export { Stack } from "./layouts/Stack/Stack";
export type { StackProps, StackGap } from "./layouts/Stack/Stack";
export { Section } from "./layouts/Section/Section";
export type { SectionProps } from "./layouts/Section/Section";

// AdminShell
export { AdminShell } from "./layouts/AdminShell/AdminShell";
export type {
  AdminShellProps,
  NavigationItem,
  NavigationGroup,
} from "./layouts/AdminShell/AdminShell";

// PortalLayout
export { PortalLayout } from "./layouts/PortalLayout/PortalLayout";
export type { PortalLayoutProps, PortalLink } from "./layouts/PortalLayout/PortalLayout";

// StatCard
export { StatCard, statCardVariants } from "./components/StatCard/StatCard";
export type { StatCardProps } from "./components/StatCard/StatCard";

// ── THEME SYSTEM ──
export { ThemeProvider, useTheme } from "./components/ThemeProvider/ThemeProvider";
export type { ThemeProviderProps, Theme } from "./components/ThemeProvider/ThemeProvider";

// ── TOKEN REFERENCE (JS) ──
export {
  brandHex,
  space,
  radius,
  fontFamily,
  cssVars,
  tokenMeta,
} from "./tokens";
