import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getServerI18n } from "@/lib/i18n/server";
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

export async function generateMetadata(): Promise<Metadata> {
  const { messages } = await getServerI18n();

  return {
    title: messages.metadata.imprintTitle,
  };
}

export default async function ImprintPage() {
  const { messages, format } = await getServerI18n();
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
  const operatorName =
    siteConfig.operator.legalName ??
    siteConfig.operator.displayName ??
    messages.imprint.availableOnRequest;

  return (
    <main className="app-shell flex-1 py-10 sm:py-14">
      <div className="mx-auto max-w-4xl space-y-8">
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">{messages.imprint.eyebrow}</p>
          <h1 className="text-4xl font-semibold tracking-tight">{messages.imprint.title}</h1>
          <p className="max-w-3xl text-sm leading-7 text-muted-foreground">
            {format(messages.imprint.description, { appName: siteConfig.appName })}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{messages.imprint.providerInformation}</CardTitle>
            <CardDescription>
              {messages.imprint.providerInformationDescription}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="space-y-4">
              <DetailRow label={messages.imprint.labels.legalName} value={operatorName} />
              {siteConfig.operator.displayName ? (
                <DetailRow
                  label={messages.imprint.labels.displayName}
                  value={siteConfig.operator.displayName}
                />
              ) : null}
              <DetailRow
                label={messages.imprint.labels.address}
                value={
                  addressParts.length > 0
                    ? addressParts.join(", ")
                    : messages.imprint.addressOnRequest
                }
              />
              <DetailRow
                label={messages.imprint.labels.email}
                value={siteConfig.operator.email ?? messages.imprint.contactOnRequest}
              />
              {siteConfig.operator.phone ? (
                <DetailRow label={messages.imprint.labels.phone} value={siteConfig.operator.phone} />
              ) : null}
              <DetailRow label={messages.imprint.labels.website} value={websiteLabel} />
              <DetailRow
                label={messages.imprint.labels.businessPurpose}
                value={
                  siteConfig.operator.businessPurpose ??
                  messages.imprint.defaultBusinessPurpose
                }
              />
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{messages.imprint.mediaOwnerAndEditorialLine}</CardTitle>
            <CardDescription>
              {messages.imprint.mediaOwnerAndEditorialLineDescription}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="space-y-4">
              <DetailRow
                label={messages.imprint.labels.mediaOwner}
                value={siteConfig.media.owner ?? messages.imprint.mediaOwnerOnRequest}
              />
              <DetailRow
                label={messages.imprint.labels.editorialLine}
                value={
                  siteConfig.media.editorialLine ??
                  messages.imprint.editorialLineDefault
                }
              />
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{messages.imprint.hostingNotice}</CardTitle>
            <CardDescription>
              {messages.imprint.hostingNoticeDescription}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm leading-7 text-muted-foreground">
            <p>
              {siteConfig.privacy.hostingDescription ??
                messages.imprint.hostingOnRequest}
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
