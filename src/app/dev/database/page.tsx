import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { checkDatabaseStatus } from "@/lib/database-status";
import { isDevModeEnabled } from "@/lib/dev-mode";
import { getServerI18n } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 rounded-lg border bg-muted/25 px-4 py-3 sm:grid-cols-[11rem_1fr] sm:gap-4">
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className="break-words font-mono text-sm">{value}</dd>
    </div>
  );
}

export async function generateMetadata(): Promise<Metadata> {
  const { messages } = await getServerI18n();

  return {
    title: messages.metadata.devDatabaseTitle,
  };
}

export default async function DevDatabasePage() {
  if (!isDevModeEnabled()) {
    notFound();
  }

  const { messages } = await getServerI18n();
  const status = await checkDatabaseStatus();

  return (
    <main className="app-shell flex-1 py-10 sm:py-14">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">
            {messages.devDatabase.eyebrow}
          </p>
          <h1 className="text-4xl font-semibold tracking-tight">
            {messages.devDatabase.title}
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            {messages.devDatabase.description}
          </p>
        </div>
        <Badge variant={status.ok ? "secondary" : "destructive"}>
          {status.ok ? messages.devDatabase.connected : messages.devDatabase.failed}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{messages.devDatabase.connectionDetails}</CardTitle>
          <CardDescription>
            {status.ok
              ? messages.devDatabase.connectionHealthy
              : messages.devDatabase.connectionFailed}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3">
            <DetailRow label={messages.devDatabase.labels.target} value={status.target} />
            <DetailRow
              label={messages.devDatabase.labels.latency}
              value={`${status.latencyMs} ms`}
            />
            {status.ok ? (
              <>
                <DetailRow
                  label={messages.devDatabase.labels.database}
                  value={status.databaseName}
                />
                <DetailRow label={messages.devDatabase.labels.user} value={status.userName} />
                <DetailRow label={messages.devDatabase.labels.schema} value={status.schemaName} />
                <DetailRow
                  label={messages.devDatabase.labels.postgresVersion}
                  value={status.serverVersion}
                />
              </>
            ) : (
              <DetailRow
                label={messages.devDatabase.labels.error}
                value={status.error}
              />
            )}
          </dl>
        </CardContent>
      </Card>
    </main>
  );
}
