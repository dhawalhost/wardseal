import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "../../lib/utils";
import { focusRing } from "../../lib/styles";

const Tabs = TabsPrimitive.Root;

type TabsVariant = "segmented" | "line";
const TabsVariantContext = React.createContext<TabsVariant>("segmented");

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> & {
    /** `segmented` (default) for in-card filters; `line` for page-level sections. */
    variant?: TabsVariant;
  }
>(({ className, variant = "segmented", ...props }, ref) => (
  <TabsVariantContext.Provider value={variant}>
    <TabsPrimitive.List
      ref={ref}
      className={cn(
        variant === "line"
          ? "flex h-10 items-end gap-6 border-b border-border text-on-surface-subtle"
          : "inline-flex h-9 items-center justify-center gap-0.5 rounded-lg bg-surface-container-high p-0.5 text-on-surface-subtle",
        className
      )}
      {...props}
    />
  </TabsVariantContext.Provider>
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => {
  const variant = React.useContext(TabsVariantContext);
  return (
    <TabsPrimitive.Trigger
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 whitespace-nowrap text-sm font-medium transition-colors duration-fast hover:text-on-surface disabled:pointer-events-none disabled:opacity-50 [&_svg]:h-4 [&_svg]:w-4",
        variant === "line"
          ? // Active = ink text + 2px rule, not colour alone.
            "relative h-10 px-0.5 data-[state=active]:text-on-surface after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:rounded-full after:bg-transparent data-[state=active]:after:bg-on-surface"
          : // Active = card fill + hairline + ink, not colour alone.
            "h-8 rounded-[6px] px-3 data-[state=active]:bg-card data-[state=active]:text-on-surface data-[state=active]:shadow-[0_1px_2px_rgb(0_0_0/0.06),0_0_0_1px_hsl(var(--on-surface)/0.06)]",
        focusRing,
        className
      )}
      {...props}
    />
  );
});
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-3 rounded-md", focusRing,
      className
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
