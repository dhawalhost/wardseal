import * as React from "react";
import { Search, CornerDownLeft } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "../Dialog/Dialog";
import { cn } from "../../lib/utils";

export interface CommandItem {
  id: string;
  label: string;
  category: string;
  icon?: React.ReactNode;
  shortcut?: string;
  onClick?: () => void;
}

export interface CommandMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: CommandItem[];
  placeholder?: string;
  /** Accessible name of the dialog and its search box. */
  label?: string;
  /** Shown when nothing matches. Receives the current query. */
  emptyMessage?: (query: string) => React.ReactNode;
  /** Register the ⌘K / Ctrl+K toggle on window. Disable if the app owns the shortcut. */
  enableShortcut?: boolean;
}

/**
 * Command palette — WAI-ARIA combobox with a grouped listbox.
 * Focus stays in the search box; arrow keys move `aria-activedescendant`,
 * so screen readers announce the highlighted command without moving focus.
 */
export function CommandMenu({
  open,
  onOpenChange,
  items,
  placeholder = "Search commands…",
  label = "Command menu",
  emptyMessage = (q) => (q ? <>No commands match “{q}”</> : "No commands available"),
  enableShortcut = true,
}: CommandMenuProps) {
  const [query, setQuery] = React.useState("");
  const [activeIndex, setActiveIndex] = React.useState(0);
  const baseId = React.useId().replace(/:/g, "");
  const listId = `cmd-${baseId}-list`;
  const optionId = (i: number) => `cmd-${baseId}-opt-${i}`;
  const listRef = React.useRef<HTMLDivElement>(null);

  const filteredItems = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) => item.label.toLowerCase().includes(q) || item.category.toLowerCase().includes(q)
    );
  }, [items, query]);

  // Group while preserving order; flat index drives keyboard + aria.
  const groups = React.useMemo(() => {
    const map = new Map<string, { item: CommandItem; index: number }[]>();
    filteredItems.forEach((item, index) => {
      const g = map.get(item.category) ?? [];
      g.push({ item, index });
      map.set(item.category, g);
    });
    return [...map.entries()];
  }, [filteredItems]);

  React.useEffect(() => setActiveIndex(0), [query]);

  // Fresh state each time the palette opens.
  React.useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  // Keep the highlighted option in view.
  React.useEffect(() => {
    if (!open) return;
    listRef.current
      ?.querySelector<HTMLElement>(`#${CSS.escape(optionId(activeIndex))}`)
      ?.scrollIntoView({ block: "nearest" });
    // optionId is stable for a given baseId
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, open]);

  React.useEffect(() => {
    if (!enableShortcut) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange, enableShortcut]);

  const run = React.useCallback(
    (item: CommandItem | undefined) => {
      if (!item?.onClick) return;
      item.onClick();
      onOpenChange(false);
    },
    [onOpenChange]
  );

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const n = filteredItems.length;
    if (!n) return;
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % n);
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((i) => (i - 1 + n) % n);
        break;
      case "Home":
        e.preventDefault();
        setActiveIndex(0);
        break;
      case "End":
        e.preventDefault();
        setActiveIndex(n - 1);
        break;
      case "Enter":
        e.preventDefault();
        run(filteredItems[activeIndex]);
        break;
    }
  };

  const hasResults = filteredItems.length > 0;
  const safeIndex = Math.min(activeIndex, Math.max(filteredItems.length - 1, 0));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showClose={false}
        className="top-[15%] max-w-lg translate-y-0 gap-0 overflow-hidden p-0"
      >
        <DialogTitle className="sr-only">{label}</DialogTitle>
        <DialogDescription className="sr-only">
          Type to filter. Use the up and down arrow keys to move, Enter to run, Escape to close.
        </DialogDescription>

        <div className="flex h-12 shrink-0 items-center gap-3 border-b border-border px-4">
          <Search className="h-4 w-4 shrink-0 text-on-surface-subtle" aria-hidden />
          <input
            role="combobox"
            aria-label={label}
            aria-expanded={hasResults}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={hasResults ? optionId(safeIndex) : undefined}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            autoComplete="off"
            spellCheck={false}
            className="h-full w-full flex-1 border-0 bg-transparent text-sm text-on-surface outline-none placeholder:text-on-surface-subtle"
          />
        </div>

        <div
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label={label}
          className="custom-scrollbar max-h-80 space-y-2 overflow-y-auto p-2"
        >
          {!hasResults ? (
            <p className="px-3 py-8 text-center text-sm text-on-surface-subtle">
              {emptyMessage(query.trim())}
            </p>
          ) : (
            groups.map(([category, entries]) => {
              const headingId = `cmd-${baseId}-group-${category.replace(/\W+/g, "-")}`;
              return (
                <div key={category} role="group" aria-labelledby={headingId}>
                  <div id={headingId} aria-hidden className="px-2 py-1.5 text-label text-on-surface-subtle">
                    {category}
                  </div>
                  {entries.map(({ item, index }) => {
                    const active = index === safeIndex;
                    return (
                      <div
                        key={item.id}
                        id={optionId(index)}
                        role="option"
                        aria-selected={active}
                        aria-disabled={!item.onClick || undefined}
                        onMouseMove={() => !active && setActiveIndex(index)}
                        // keep focus in the input
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => run(item)}
                        className={cn(
                          "flex cursor-pointer select-none items-center justify-between gap-4 rounded-md px-2 py-2 text-sm transition-colors duration-fast",
                          active ? "bg-accent text-accent-foreground" : "text-on-surface",
                          !item.onClick && "cursor-default opacity-50"
                        )}
                      >
                        <span className="flex min-w-0 items-center gap-2.5">
                          {item.icon && (
                            <span
                              className={cn(
                                "flex h-4 w-4 shrink-0 items-center justify-center [&_svg]:h-4 [&_svg]:w-4",
                                active ? "text-accent-foreground" : "text-on-surface-subtle"
                              )}
                              aria-hidden
                            >
                              {item.icon}
                            </span>
                          )}
                          <span className="truncate">{item.label}</span>
                        </span>
                        <span className="flex shrink-0 items-center gap-2" aria-hidden>
                          {item.shortcut && (
                            <kbd className="rounded border border-border bg-surface-container px-1.5 font-mono text-xs text-on-surface-subtle">
                              {item.shortcut}
                            </kbd>
                          )}
                          {active && <CornerDownLeft className="h-3.5 w-3.5" />}
                        </span>
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>

        {/* Result count for screen readers as the user types */}
        <div className="sr-only" aria-live="polite" aria-atomic="true">
          {query ? `${filteredItems.length} result${filteredItems.length === 1 ? "" : "s"}` : ""}
        </div>

        <div
          className="flex h-10 shrink-0 items-center gap-4 border-t border-border bg-surface-container-low px-4 text-xs text-on-surface-subtle"
          aria-hidden
        >
          <span className="flex items-center gap-1.5">
            <kbd className="rounded border border-border bg-card px-1 font-mono">↑↓</kbd>
            Navigate
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="rounded border border-border bg-card px-1 font-mono">Enter</kbd>
            Run
          </span>
          <span className="ml-auto flex items-center gap-1.5">
            <kbd className="rounded border border-border bg-card px-1 font-mono">Esc</kbd>
            Close
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
