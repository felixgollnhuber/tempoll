import { notFound } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSiteConfig } from "@/lib/site-config";

export const dynamic = "force-dynamic";

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-4">
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm leading-6">{value}</dd>
    </div>
  );
}

export default function ImprintPage() {
  const siteConfig = getSiteConfig();
  if (!siteConfig.legalPagesEnabled) {
    notFound();
  }

  const addressParts = [
    siteConfig.operator.streetAddress,
    [siteConfig.operator.postalCode, siteConfig.operator.city].filter(Boolean).join(" "),
    siteConfig.operator.country,
  ].filter(Boolean);
  const websiteLabel = siteConfig.operator.website ?? siteConfig.appUrl;
  const operatorName = siteConfig.operator.legalName ?? siteConfig.operator.displayName ?? "Available on request";

  return (
    <main className="app-shell flex-1 py-10 sm:py-14">
      <div className="mx-auto max-w-4xl space-y-8">
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">Legal</p>
          <h1 className="text-4xl font-semibold tracking-tight">Imprint</h1>
          <p className="max-w-3xl text-sm leading-7 text-muted-foreground">
            This page contains the operator disclosure for {siteConfig.appName}. The structure is
            prepared for Austrian self-hosted deployments and should be reviewed before production
            use.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Provider information</CardTitle>
            <CardDescription>
              Information pursuant to the Austrian disclosure rules for websites.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="space-y-4">
              <DetailRow label="Legal name" value={operatorName} />
              {siteConfig.operator.displayName ? (
                <DetailRow label="Display name" value={siteConfig.operator.displayName} />
              ) : null}
              <DetailRow
                label="Address"
                value={
                  addressParts.length > 0
                    ? addressParts.join(", ")
                    : "Not published here. Address details can be provided on request."
                }
              />
              <DetailRow
                label="Email"
                value={siteConfig.operator.email ?? "Not published here. Contact details can be provided on request."}
              />
              {siteConfig.operator.phone ? (
                <DetailRow label="Phone" value={siteConfig.operator.phone} />
              ) : null}
              <DetailRow label="Website" value={websiteLabel} />
              <DetailRow
                label="Business purpose"
                value={
                  siteConfig.operator.businessPurpose ??
                  "Operation of a self-hosted scheduling service."
                }
              />
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Media owner and editorial line</CardTitle>
            <CardDescription>
              Disclosure for informational content provided via this website.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="space-y-4">
              <DetailRow
                label="Media owner"
                value={siteConfig.media.owner ?? "Available on request."}
              />
              <DetailRow
                label="Editorial line"
                value={
                  siteConfig.media.editorialLine ??
                  "Project information and operational details about this scheduling service."
                }
              />
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Hosting notice</CardTitle>
            <CardDescription>
              Operational note about how this service is provided.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm leading-7 text-muted-foreground">
            <p>
              {siteConfig.privacy.hostingDescription ??
                "Hosting details are not published here and can be provided on request."}
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
