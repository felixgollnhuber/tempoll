import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getServerI18n } from "@/lib/i18n/server";
import { getSiteConfig } from "@/lib/site-config";

export const dynamic = "force-dynamic";

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="space-y-4 text-sm leading-7 text-muted-foreground">
        {children}
      </CardContent>
    </Card>
  );
}

export async function generateMetadata(): Promise<Metadata> {
  const { messages } = await getServerI18n();

  return {
    title: messages.metadata.privacyTitle,
  };
}

export default async function PrivacyPage() {
  const { messages, format } = await getServerI18n();
  const siteConfig = getSiteConfig();
  if (!siteConfig.legalPagesEnabled) {
    notFound();
  }

  const processors =
    siteConfig.privacy.processors.length > 0
      ? siteConfig.privacy.processors
      : [messages.privacy.defaults.processors];
  const controllerName =
    siteConfig.operator.legalName ??
    siteConfig.operator.displayName ??
    messages.privacy.defaults.controllerName;
  const controllerAddress = [
    siteConfig.operator.streetAddress,
    [siteConfig.operator.postalCode, siteConfig.operator.city].filter(Boolean).join(" "),
    siteConfig.operator.country,
  ]
    .filter(Boolean)
    .join(", ");
  const generalContact =
    siteConfig.operator.email ?? messages.privacy.defaults.generalContact;
  const privacyContact =
    siteConfig.privacy.contactEmail ??
    siteConfig.operator.email ??
    messages.privacy.defaults.privacyContact;

  return (
    <main className="app-shell flex-1 py-10 sm:py-14">
      <div className="mx-auto max-w-4xl space-y-8">
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">{messages.privacy.eyebrow}</p>
          <h1 className="text-4xl font-semibold tracking-tight">{messages.privacy.title}</h1>
          <p className="max-w-3xl text-sm leading-7 text-muted-foreground">
            {format(messages.privacy.description, { appName: siteConfig.appName })}
          </p>
        </div>

        <Section title={messages.privacy.controller}>
          <p>
            {controllerAddress
              ? format(messages.privacy.controllerParagraphWithAddress, {
                  name: controllerName,
                  address: controllerAddress,
                })
              : format(messages.privacy.controllerParagraphWithoutAddress, {
                  name: controllerName,
                })}
          </p>
          <p>
            {format(messages.privacy.contactParagraph, {
              generalContact,
              privacyContact,
            })}
          </p>
        </Section>

        <Section
          title={messages.privacy.whatDataIsProcessed}
          description={messages.privacy.whatDataIsProcessedDescription}
        >
          <ul className="list-disc space-y-2 pl-5">
            <li>{messages.privacy.processedDataItems.displayNames}</li>
            <li>{messages.privacy.processedDataItems.selections}</li>
            <li>{messages.privacy.processedDataItems.sessions}</li>
            <li>{messages.privacy.processedDataItems.recentEvents}</li>
            <li>{messages.privacy.processedDataItems.requestMetadata}</li>
            <li>{messages.privacy.processedDataItems.databaseRecords}</li>
          </ul>
        </Section>

        <Section title={messages.privacy.purposesAndLegalBases}>
          <p>{messages.privacy.purposesParagraph1}</p>
          <p>{messages.privacy.purposesParagraph2}</p>
        </Section>

        <Section title={messages.privacy.cookiesAndLocalStorage}>
          <p>{messages.privacy.cookiesParagraph1}</p>
          <p>{messages.privacy.cookiesParagraph2}</p>
        </Section>

        <Section title={messages.privacy.recipientsAndHosting}>
          <p>
            {siteConfig.privacy.hostingDescription ??
              messages.privacy.defaults.hostingOnRequest}
          </p>
          <ul className="list-disc space-y-2 pl-5">
            {processors.map((processor) => (
              <li key={processor}>{processor}</li>
            ))}
          </ul>
        </Section>

        <Section title={messages.privacy.retentionPeriods}>
          <p>{messages.privacy.retentionParagraph1}</p>
          <p>{messages.privacy.retentionParagraph2}</p>
        </Section>

        <Section title={messages.privacy.yourRights}>
          <p>{messages.privacy.rightsParagraph1}</p>
          <p>{messages.privacy.rightsParagraph2}</p>
        </Section>
      </div>
    </main>
  );
}
