import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LanguageSwitcher } from "@/components/language-switcher";
import { SetupWizard } from "@/components/setup-wizard";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { appConfig } from "@/lib/config";
import { getServerI18n } from "@/lib/i18n/server";
import { getSetupDraftValues } from "@/lib/site-config";
import { isAppSetupComplete } from "@/lib/setup-state";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { messages } = await getServerI18n();

  return {
    title: messages.metadata.setupTitle,
  };
}

export default async function SetupPage() {
  if (isAppSetupComplete()) {
    redirect("/");
  }

  const { messages, format } = await getServerI18n();
  const initialValues = getSetupDraftValues();

  return (
    <main className="flex-1 bg-[radial-gradient(circle_at_top_left,rgba(19,78,74,0.14),transparent_28%),radial-gradient(circle_at_top_right,rgba(245,158,11,0.12),transparent_28%)]">
      <section className="app-shell py-10 sm:py-14">
        <div className="mx-auto max-w-6xl space-y-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-4">
              <Badge variant="secondary" className="w-fit">
                {messages.setupPage.badge}
              </Badge>
              <div className="space-y-3">
                <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
                  {format(messages.setupPage.title, { appName: appConfig.appName })}
                </h1>
                <p className="max-w-2xl text-base text-muted-foreground">
                  {messages.setupPage.description}
                </p>
              </div>
            </div>
            <LanguageSwitcher className="h-10 min-w-32 bg-background/90" />
          </div>

          <Card className="border-primary/15 bg-card/95 shadow-sm">
            <CardHeader>
              <CardTitle>{messages.setupPage.overviewTitle}</CardTitle>
              <CardDescription>
                {messages.setupPage.overviewDescription}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
              <div className="rounded-lg border bg-muted/25 px-4 py-3">
                {messages.setupPage.overviewItems.appConfig}
              </div>
              <div className="rounded-lg border bg-muted/25 px-4 py-3">
                {messages.setupPage.overviewItems.secrets}
              </div>
              <div className="rounded-lg border bg-muted/25 px-4 py-3">
                {messages.setupPage.overviewItems.redeploy}
              </div>
            </CardContent>
          </Card>

          <SetupWizard initialValues={initialValues} />
        </div>
      </section>
    </main>
  );
}
