import * as React from "react";

import { cn } from "@/lib/utils";

export function SegmentedControl({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="segmented-control"
      className={cn(
        "inline-flex h-8 shrink-0 items-center gap-0.5 rounded-md border bg-background p-0.5 shadow-sm",
        className,
      )}
      {...props}
    />
  );
}

export function SegmentedControlItem({
  active,
  className,
  ...props
}: Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "aria-pressed" | "type"> & {
  active?: boolean;
}) {
  return (
    <button
      {...props}
      type="button"
      data-slot="segmented-control-item"
      data-active={active ? "true" : undefined}
      className={cn(
        "inline-flex h-full items-center justify-center whitespace-nowrap rounded-[calc(var(--radius-md)-2px)] px-3 text-xs font-medium transition-colors",
        "hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50",
        "data-[active=true]:bg-secondary data-[active=true]:text-secondary-foreground data-[active=true]:shadow-sm",
        className,
      )}
      aria-pressed={active}
    />
  );
}
