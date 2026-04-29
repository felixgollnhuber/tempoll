"use client";

import { CheckIcon, ChevronsUpDownIcon } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useI18n } from "@/lib/i18n/context";
import { formatGmtOffset } from "@/lib/timezone-options";
import type { TimezoneOption } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AUTOMATIC_TIMEZONE_VALUE } from "@/lib/viewer-timezone";

type TimezoneComboboxProps = {
  id: string;
  label: string;
  value: string;
  options: TimezoneOption[];
  onValueChange: (timezone: string) => void;
  placeholder: string;
  invalid?: boolean;
  describedBy?: string;
  size?: "sm" | "default";
  includeAutomatic?: boolean;
};

type TimezoneComboboxItem = {
  value: string;
  label: string;
  keywords: string[];
};

function timezoneFilter(value: string, search: string, keywords?: string[]) {
  const normalizedSearch = search.trim().toLowerCase();

  if (!normalizedSearch) {
    return 1;
  }

  const haystack = [value, ...(keywords ?? [])].join(" ").toLowerCase();
  return haystack.includes(normalizedSearch) ? 1 : 0;
}

export function TimezoneCombobox({
  id,
  label,
  value,
  options,
  onValueChange,
  placeholder,
  invalid,
  describedBy,
  size = "default",
  includeAutomatic = false,
}: TimezoneComboboxProps) {
  const { messages } = useI18n();
  const [open, setOpen] = useState(false);

  const items = useMemo<TimezoneComboboxItem[]>(() => {
    const timezoneItems = options.map((option) => ({
      value: option.value,
      label: option.label,
      keywords: [option.value, option.label, formatGmtOffset(option.offsetMinutes)],
    }));

    if (!includeAutomatic) {
      return timezoneItems;
    }

    return [
      {
        value: AUTOMATIC_TIMEZONE_VALUE,
        label: messages.publicEvent.viewerTimezoneAutomatic,
        keywords: [messages.publicEvent.viewerTimezoneAutomatic],
      },
      ...timezoneItems,
    ];
  }, [includeAutomatic, messages.publicEvent.viewerTimezoneAutomatic, options]);

  const selectedItem = items.find((item) => item.value === value) ?? null;
  const selectedLabel = selectedItem?.label ?? value;

  function selectValue(nextValue: string) {
    onValueChange(nextValue);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-label={label}
          aria-expanded={open}
          aria-invalid={invalid ? true : undefined}
          aria-describedby={describedBy}
          size={size}
          className={cn(
            "w-full justify-between bg-background font-normal",
            size === "sm" && "min-w-[11.5rem] text-xs",
            invalid && "border-destructive focus:ring-destructive/20",
          )}
        >
          <span className={cn("truncate", !value && "text-muted-foreground")}>
            {selectedLabel || placeholder}
          </span>
          <ChevronsUpDownIcon className="size-4 opacity-50" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(32rem,calc(100vw-2rem))] p-0">
        <Command filter={timezoneFilter} label={messages.common.timezoneSearchPlaceholder} loop>
          <CommandInput placeholder={messages.common.timezoneSearchPlaceholder} />
          <CommandList>
            <CommandEmpty>{messages.common.timezoneSearchEmpty}</CommandEmpty>
            <CommandGroup>
              {items.map((item) => (
                <CommandItem
                  key={item.value}
                  value={item.value}
                  keywords={item.keywords}
                  onSelect={selectValue}
                >
                  <CheckIcon
                    className={cn(
                      "size-4",
                      item.value === value ? "opacity-100" : "opacity-0",
                    )}
                    aria-hidden="true"
                  />
                  <span className="truncate">{item.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
