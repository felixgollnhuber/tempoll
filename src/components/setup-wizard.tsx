"use client";

import { ArrowLeftIcon, ArrowRightIcon, CheckIcon, CopyIcon, FileTextIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

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
import { Textarea } from "@/components/ui/textarea";
import {
  buildEnvFileContent,
  getStepFieldNames,
  type SetupWizardErrors,
  type SetupWizardValues,
  validateSetupValues,
} from "@/lib/setup";

type SetupWizardProps = {
  initialValues: SetupWizardValues;
};

const stepLabels = [
  "App basics",
  "Database",
  "Operator details",
  "Legal and privacy",
  "Review and export",
];

export function SetupWizard({ initialValues }: SetupWizardProps) {
  const [step, setStep] = useState(0);
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<SetupWizardErrors>({});
  const envPreview = useMemo(() => buildEnvFileContent(values), [values]);

  function updateValue<Key extends keyof SetupWizardValues>(key: Key, value: SetupWizardValues[Key]) {
    setValues((current) => ({
      ...current,
      [key]: value,
    }));
    setErrors((current) => ({
      ...current,
      [key]: undefined,
    }));
  }

  function validateCurrentStep() {
    const fields = getStepFieldNames(step);
    const nextErrors = validateSetupValues(values, fields);
    setErrors((current) => ({
      ...current,
      ...nextErrors,
    }));

    return Object.keys(nextErrors).length === 0;
  }

  async function copyEnv() {
    await navigator.clipboard.writeText(envPreview);
    toast.success("Copied .env content");
  }

  function renderInput(
    name: keyof SetupWizardValues,
    label: string,
    options?: { placeholder?: string; multiline?: boolean; optional?: boolean; disabled?: boolean },
  ) {
    const sharedProps = {
      id: name,
      value: values[name],
      onChange: (
        event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
      ) => updateValue(name, event.target.value),
      placeholder: options?.placeholder,
      disabled: options?.disabled,
    };

    return (
      <div className="space-y-2">
        <Label htmlFor={name}>
          {label}
          {options?.optional ? <span className="ml-2 text-xs text-muted-foreground">Optional</span> : null}
        </Label>
        {options?.multiline ? (
          <Textarea {...sharedProps} className="min-h-28" />
        ) : (
          <Input {...sharedProps} />
        )}
        {errors[name] ? <p className="text-sm text-destructive">{errors[name]}</p> : null}
      </div>
    );
  }

  function renderStep() {
    const legalPagesEnabled = values.legalPagesEnabled === "true";

    if (step === 0) {
      return (
        <div className="grid gap-4">
          {renderInput("appName", "App name", {
            placeholder: "tempoll",
          })}
          {renderInput("appUrl", "Public app URL", {
            placeholder: "https://meet.example.com",
          })}
        </div>
      );
    }

    if (step === 1) {
      return (
        <div className="grid gap-4">
          {renderInput("databaseUrl", "PostgreSQL connection string", {
            placeholder: "postgresql://user:password@host:port/database?schema=public",
          })}
        </div>
      );
    }

    if (step === 2) {
      return (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2 space-y-3 rounded-lg border bg-muted/20 p-4">
            <div className="space-y-1">
              <Label htmlFor="legalPagesEnabled">Legal pages</Label>
              <p className="text-sm text-muted-foreground">
                Keep imprint and privacy pages disabled if you do not want to publish legal details
                directly on the site. You can still share sensitive details on request.
              </p>
            </div>
            <Select
              value={values.legalPagesEnabled}
              onValueChange={(value) => updateValue("legalPagesEnabled", value)}
            >
              <SelectTrigger id="legalPagesEnabled" className="max-w-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="false">Disabled</SelectItem>
                <SelectItem value="true">Enabled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {renderInput("operatorLegalName", "Legal name", { optional: true })}
          {renderInput("operatorDisplayName", "Display name", { optional: true })}
          <div className="md:col-span-2">
            {renderInput("operatorStreetAddress", "Street address", { optional: true })}
          </div>
          {renderInput("operatorPostalCode", "Postal code", { optional: true })}
          {renderInput("operatorCity", "City", { optional: true })}
          {renderInput("operatorCountry", "Country", { optional: true })}
          {renderInput("operatorEmail", "Contact email", { optional: true })}
          {renderInput("operatorPhone", "Phone", { optional: true })}
          {renderInput("operatorWebsite", "Website", {
            placeholder: "https://example.com",
            optional: true,
          })}
          {!legalPagesEnabled ? (
            <div className="md:col-span-2 rounded-lg border border-dashed bg-muted/15 px-4 py-3 text-sm text-muted-foreground">
              Legal pages are currently disabled. All details on this step are optional and can be
              left blank.
            </div>
          ) : null}
        </div>
      );
    }

    if (step === 3) {
      return (
        <div className="grid gap-4">
          <div className="rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground">
            Everything on this step is optional. If you leave fields empty, the public legal pages
            will either omit them or use a generic “available on request” note.
          </div>
          {renderInput("operatorBusinessPurpose", "Business purpose", {
            placeholder: "Operation of a self-hosted scheduling web application.",
            optional: true,
          })}
          {renderInput("mediaOwner", "Media owner", { optional: true })}
          {renderInput("editorialLine", "Editorial line", {
            placeholder: "Information about the software project and scheduling boards operated via this service.",
            optional: true,
          })}
          {renderInput("privacyContactEmail", "Privacy contact email", {
            optional: true,
            placeholder: "Leave empty to reuse the main contact email",
          })}
          {renderInput("hostingDescription", "Hosting description", {
            multiline: true,
            placeholder:
              "Self-hosted via Coolify on infrastructure operated by the controller and selected hosting providers.",
            optional: true,
          })}
          {renderInput("privacyProcessors", "Processors / infrastructure partners", {
            multiline: true,
            optional: true,
            placeholder: "One entry per line, e.g.\nCoolify\nHetzner\nCloudflare",
          })}
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
          Copy this `.env` content into your server environment, redeploy the app, and the setup wizard will disappear automatically.
          {values.legalPagesEnabled === "true"
            ? " Imprint and privacy pages are enabled."
            : " Imprint and privacy pages will stay disabled until you opt in."}
        </div>
        <div className="space-y-2">
          <Label htmlFor="envPreview">Generated .env</Label>
          <Textarea
            id="envPreview"
            readOnly
            value={envPreview}
            className="min-h-[22rem] font-mono text-xs"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
      <Card>
        <CardHeader>
          <CardTitle>Setup steps</CardTitle>
          <CardDescription>
            This wizard generates the environment file for your self-hosted deployment.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {stepLabels.map((label, index) => (
            <div
              key={label}
              className={`flex items-center gap-3 rounded-md border px-3 py-2 text-sm ${
                index === step ? "border-primary bg-primary/5 text-foreground" : "text-muted-foreground"
              }`}
            >
              <span
                className={`flex size-6 items-center justify-center rounded-full text-xs font-semibold ${
                  index < step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                {index < step ? <CheckIcon className="size-3.5" /> : index + 1}
              </span>
              <span>{label}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileTextIcon className="size-4" />
            {stepLabels[step]}
          </CardTitle>
          <CardDescription>
            Fill in the fields below. All values stay in your browser until you copy the generated `.env`.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {renderStep()}

          <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-muted-foreground">Step {step + 1} of {stepLabels.length}</div>
            <div className="flex items-center gap-2">
              {step > 0 ? (
                <Button variant="outline" onClick={() => setStep((current) => current - 1)}>
                  <ArrowLeftIcon className="size-4" />
                  Back
                </Button>
              ) : null}

              {step < stepLabels.length - 1 ? (
                <Button
                  onClick={() => {
                    if (validateCurrentStep()) {
                      setStep((current) => current + 1);
                    }
                  }}
                >
                  Next
                  <ArrowRightIcon className="size-4" />
                </Button>
              ) : (
                <Button onClick={() => void copyEnv()}>
                  <CopyIcon className="size-4" />
                  Copy .env
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
