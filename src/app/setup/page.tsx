import { redirect } from "next/navigation";

import { SetupWizard } from "@/components/setup-wizard";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { appConfig } from "@/lib/config";
import { getSetupDraftValues } from "@/lib/site-config";
import { isAppSetupComplete } from "@/lib/setup-state";

export const dynamic = "force-dynamic";

export default function SetupPage() {
  if (isAppSetupComplete()) {
    redirect("/");
  }

  const initialValues = getSetupDraftValues();

  return (
    <main className="flex-1 bg-[radial-gradient(circle_at_top_left,rgba(19,78,74,0.14),transparent_28%),radial-gradient(circle_at_top_right,rgba(245,158,11,0.12),transparent_28%)]">
      <section className="app-shell py-10 sm:py-14">
        <div className="mx-auto max-w-6xl space-y-8">
          <div className="space-y-4">
            <Badge variant="secondary" className="w-fit">
              First-run setup
            </Badge>
            <div className="space-y-3">
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
                Configure {appConfig.appName} before going live.
              </h1>
              <p className="max-w-2xl text-base text-muted-foreground">
                This wizard keeps everything local in your browser and generates the non-secret app
                configuration you can paste into Coolify or your server environment.
              </p>
            </div>
          </div>

          <Card className="border-primary/15 bg-card/95 shadow-sm">
            <CardHeader>
              <CardTitle>What this setup covers</CardTitle>
              <CardDescription>
                App identity, bundled infrastructure guidance, operator details, Austrian legal
                disclosure fields, and privacy-hosting information.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
              <div className="rounded-lg border bg-muted/25 px-4 py-3">
                Generate an app config snippet with `APP_SETUP_COMPLETE=true`.
              </div>
              <div className="rounded-lg border bg-muted/25 px-4 py-3">
                Keep database secrets in Coolify. The browser setup never shows them.
              </div>
              <div className="rounded-lg border bg-muted/25 px-4 py-3">
                Restart or redeploy afterwards and the normal app becomes available.
              </div>
            </CardContent>
          </Card>

          <SetupWizard initialValues={initialValues} />
        </div>
      </section>
    </main>
  );
}
