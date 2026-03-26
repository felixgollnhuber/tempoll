"use client";

import { Loader2Icon, Trash2Icon } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { CopyButton } from "@/components/copy-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ManageEventView, PublicEventSnapshot } from "@/lib/types";

type ManageEventClientProps = {
  initialView: ManageEventView;
};

export function ManageEventClient({ initialView }: ManageEventClientProps) {
  const [snapshot, setSnapshot] = useState<PublicEventSnapshot>(initialView.snapshot);
  const [title, setTitle] = useState(initialView.snapshot.title);
  const [status, setStatus] = useState(initialView.snapshot.status);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const eventSource = new EventSource(`/api/events/${initialView.snapshot.slug}/stream`);
    eventSource.addEventListener("event-update", async () => {
      const response = await fetch(`/api/events/${initialView.snapshot.slug}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as { snapshot: PublicEventSnapshot };
      setSnapshot(payload.snapshot);
      setTitle(payload.snapshot.title);
      setStatus(payload.snapshot.status);
    });

    return () => eventSource.close();
  }, [initialView.snapshot.slug]);

  function updateEvent() {
    startTransition(async () => {
      const response = await fetch(`/api/manage/${initialView.manageKey}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "updateEvent",
          title,
          status,
        }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        toast.error(payload.error ?? "Unable to update event.");
        return;
      }

      toast.success("Event updated");
      setSnapshot((current) => ({
        ...current,
        title,
        status,
      }));
    });
  }

  function renameParticipant(participantId: string, displayName: string) {
    startTransition(async () => {
      const response = await fetch(`/api/manage/${initialView.manageKey}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "renameParticipant",
          participantId,
          displayName,
        }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        toast.error(payload.error ?? "Unable to rename participant.");
        return;
      }

      toast.success("Participant renamed");
      setSnapshot((current) => ({
        ...current,
        participants: current.participants.map((participant) =>
          participant.id === participantId ? { ...participant, displayName } : participant,
        ),
      }));
    });
  }

  function removeParticipant(participantId: string) {
    startTransition(async () => {
      const response = await fetch(
        `/api/manage/${initialView.manageKey}/participants/${participantId}`,
        {
          method: "DELETE",
        },
      );

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        toast.error(payload.error ?? "Unable to remove participant.");
        return;
      }

      toast.success("Participant removed");
      setSnapshot((current) => ({
        ...current,
        participants: current.participants.filter((participant) => participant.id !== participantId),
      }));
    });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">Manage event</CardTitle>
            <CardDescription>
              Share the public board, keep the private organizer URL safe and
              control whether new changes are still allowed.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(value) => setStatus(value as "OPEN" | "CLOSED")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OPEN">Open for edits</SelectItem>
                  <SelectItem value="CLOSED">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Button onClick={updateEvent} disabled={isPending} className="h-10">
                {isPending ? <Loader2Icon className="size-4 animate-spin" /> : null}
                Save changes
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Participants</CardTitle>
            <CardDescription>
              Rename participants for clarity or remove accidental entries.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {snapshot.participants.map((participant) => (
              <div
                key={participant.id}
                className="rounded-lg border bg-muted/20 p-4"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="size-3 rounded-full shadow-sm"
                    style={{ background: participant.color }}
                  />
                  <Input
                    defaultValue={participant.displayName}
                    onBlur={(event) => {
                      const nextValue = event.target.value.trim();
                      if (nextValue && nextValue !== participant.displayName) {
                        renameParticipant(participant.id, nextValue);
                      }
                    }}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    onClick={() => removeParticipant(participant.id)}
                  >
                    <Trash2Icon className="size-4" />
                  </Button>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {participant.selectedSlotCount} selected slots
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <aside className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Share links</CardTitle>
            <CardDescription>
              Keep the organizer link private. The public link is safe to share.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Public event URL</Label>
              <div className="rounded-md border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                {initialView.shareUrl}
              </div>
              <CopyButton value={initialView.shareUrl} label="Copy public URL" />
            </div>
            <div className="space-y-2">
              <Label>Private organizer URL</Label>
              <div className="rounded-md border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                {initialView.manageUrl}
              </div>
              <CopyButton value={initialView.manageUrl} label="Copy organizer URL" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Best windows right now</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {snapshot.suggestions.map((suggestion, index) => (
              <div
                key={suggestion.slotStart}
                className="rounded-lg border bg-muted/20 px-4 py-3"
              >
                <p className="text-xs font-medium text-muted-foreground">
                  Option {index + 1}
                </p>
                <p className="mt-2 text-sm font-semibold">{suggestion.label}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {suggestion.availableCount} people available
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
