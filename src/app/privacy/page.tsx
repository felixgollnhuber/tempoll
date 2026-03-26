import { notFound } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

export default function PrivacyPage() {
  const siteConfig = getSiteConfig();
  if (!siteConfig.legalPagesEnabled) {
    notFound();
  }

  const processors =
    siteConfig.privacy.processors.length > 0
      ? siteConfig.privacy.processors
      : ["No separate processors are listed beyond the controller's direct infrastructure setup."];
  const controllerName =
    siteConfig.operator.legalName ??
    siteConfig.operator.displayName ??
    "The controller named in the server configuration";
  const controllerAddress = [
    siteConfig.operator.streetAddress,
    [siteConfig.operator.postalCode, siteConfig.operator.city].filter(Boolean).join(" "),
    siteConfig.operator.country,
  ]
    .filter(Boolean)
    .join(", ");
  const generalContact =
    siteConfig.operator.email ?? "No public email address is published here. Contact details can be provided on request.";
  const privacyContact =
    siteConfig.privacy.contactEmail ??
    siteConfig.operator.email ??
    "No separate public privacy contact email is published here.";

  return (
    <main className="app-shell flex-1 py-10 sm:py-14">
      <div className="mx-auto max-w-4xl space-y-8">
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">Legal</p>
          <h1 className="text-4xl font-semibold tracking-tight">Privacy</h1>
          <p className="max-w-3xl text-sm leading-7 text-muted-foreground">
            This privacy notice explains how personal data is processed when you use{" "}
            {siteConfig.appName}. It is written as an English baseline for an Austrian-operated,
            self-hosted service.
          </p>
        </div>

        <Section title="Controller">
          <p>
            The controller for this website and service is {controllerName}
            {controllerAddress ? `, ${controllerAddress}.` : ". Address details can be provided on request."}
          </p>
          <p>
            General contact: {generalContact}. Privacy-specific contact: {privacyContact}
          </p>
        </Section>

        <Section
          title="What data is processed"
          description="The service is intentionally small and avoids account creation or marketing tracking."
        >
          <ul className="list-disc space-y-2 pl-5">
            <li>Participant display names entered to join a scheduling board.</li>
            <li>Availability selections for the date and time slots of a board.</li>
            <li>Technical session data required to keep a participant edit session active.</li>
            <li>Browser-local recent-event history stored on your own device via localStorage.</li>
            <li>Request metadata, IP addresses, and server logs required for secure operation.</li>
            <li>Database records required to operate events, organizer links, and live updates.</li>
          </ul>
        </Section>

        <Section title="Purposes and legal bases">
          <p>
            Personal data is processed to provide the scheduling service, keep events available,
            protect the application against abuse, and operate the hosting environment.
          </p>
          <p>
            Depending on the context, processing is based on Article 6(1)(b) GDPR where data is
            required to provide the requested service, and on Article 6(1)(f) GDPR where processing
            is necessary for secure technical operation, abuse prevention, and maintaining service
            integrity.
          </p>
        </Section>

        <Section title="Cookies and local storage">
          <p>
            The application uses technically necessary browser storage only. This includes a
            participant session cookie or equivalent token handling to allow availability editing,
            and local browser storage for the optional recent-events list on the home page.
          </p>
          <p>
            No analytics, advertising, or other non-essential tracking technologies are included in
            the current version of the app.
          </p>
        </Section>

        <Section title="Recipients and hosting">
          <p>
            {siteConfig.privacy.hostingDescription ??
              "Hosting details are not published here and can be provided on request."}
          </p>
          <ul className="list-disc space-y-2 pl-5">
            {processors.map((processor) => (
              <li key={processor}>{processor}</li>
            ))}
          </ul>
        </Section>

        <Section title="Retention periods">
          <p>
            Event data is stored for as long as the controller keeps the corresponding scheduling
            boards available. Request logs and operational logs are retained only for as long as
            needed for security, diagnostics, and infrastructure management.
          </p>
          <p>
            Browser-local recent-event history remains on your own device until you remove it or
            clear your browser storage.
          </p>
        </Section>

        <Section title="Your rights">
          <p>
            Subject to the applicable legal requirements, you have the right to access, rectification,
            erasure, restriction of processing, data portability, and objection.
          </p>
          <p>
            You also have the right to lodge a complaint with the Austrian Data Protection Authority
            (Österreichische Datenschutzbehörde) if you believe that your data is being processed in
            violation of data protection law.
          </p>
        </Section>
      </div>
    </main>
  );
}
