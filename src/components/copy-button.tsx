"use client";

import { CheckIcon, CopyIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/context";

type CopyButtonProps = {
  value: string;
  label?: string;
  variant?: "default" | "outline" | "secondary" | "ghost";
};

export function CopyButton({
  value,
  label,
  variant = "outline",
}: CopyButtonProps) {
  const { messages } = useI18n();
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    toast.success(messages.common.copiedToClipboard);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Button type="button" variant={variant} onClick={handleCopy} className="gap-2">
      {copied ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}
      {copied ? messages.common.copied : label ?? messages.common.copy}
    </Button>
  );
}
