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
import { useI18n } from "@/lib/i18n/context";

type SetupWizardProps = {
  initialValues: SetupWizardValues;
};

export function SetupWizard({ initialValues }: SetupWizardProps) {
  const { messages, format } = useI18n();
  const stepLabels = messages.setupWizard.steps;
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
    const nextErrors = validateSetupValues(values, fields, messages.validation.setup);
    setErrors((current) => ({
      ...current,
      ...nextErrors,
    }));

    return Object.keys(nextErrors).length === 0;
  }

  async function copyEnv() {
    await navigator.clipboard.writeText(envPreview);
    toast.success(messages.setupWizard.copiedAppConfig);
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
          {options?.optional ? (
            <span className="ml-2 text-xs text-muted-foreground">{messages.common.optional}</span>
          ) : null}
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
          {renderInput("appName", messages.setupWizard.appName, {
            placeholder: "tempoll",
          })}
          {renderInput("appUrl", messages.setupWizard.publicAppUrl, {
            placeholder: messages.setupWizard.placeholders.appUrl,
          })}
          <div className="space-y-2">
            <Label htmlFor="appDefaultLocale">{messages.setupWizard.defaultLanguage}</Label>
            <Select
              value={values.appDefaultLocale}
              onValueChange={(value) =>
                updateValue("appDefaultLocale", value as SetupWizardValues["appDefaultLocale"])
              }
            >
              <SelectTrigger id="appDefaultLocale">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="de">{messages.languageSwitcher.de}</SelectItem>
                <SelectItem value="en">{messages.languageSwitcher.en}</SelectItem>
              </SelectContent>
            </Select>
            {errors.appDefaultLocale ? (
              <p className="text-sm text-destructive">{errors.appDefaultLocale}</p>
            ) : null}
          </div>
        </div>
      );
    }

    if (step === 1) {
      return (
        <div className="grid gap-4">
          <div className="rounded-lg border bg-muted/20 p-4">
            <h3 className="text-sm font-medium text-foreground">
              {messages.setupWizard.infrastructure.title}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {messages.setupWizard.infrastructure.description}
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border bg-muted/15 px-4 py-3 text-sm text-muted-foreground">
              <div className="font-medium text-foreground">
                {messages.setupWizard.infrastructure.databaseName}
              </div>
              <div className="mt-1 font-mono text-xs">TEMPOLL_DB_NAME</div>
            </div>
            <div className="rounded-lg border bg-muted/15 px-4 py-3 text-sm text-muted-foreground">
              <div className="font-medium text-foreground">
                {messages.setupWizard.infrastructure.databaseUser}
              </div>
              <div className="mt-1 font-mono text-xs">TEMPOLL_DB_USER</div>
            </div>
            <div className="rounded-lg border bg-muted/15 px-4 py-3 text-sm text-muted-foreground">
              <div className="font-medium text-foreground">
                {messages.setupWizard.infrastructure.generatedPassword}
              </div>
              <div className="mt-1 font-mono text-xs">SERVICE_PASSWORD_TEMPOLL_DB</div>
            </div>
          </div>

          <div className="rounded-lg border border-dashed bg-muted/15 px-4 py-3 text-sm text-muted-foreground">
            {messages.setupWizard.infrastructure.keepInCoolifyPrefix}{" "}
            <code className="mx-1 rounded bg-muted px-1 py-0.5 text-xs">DATABASE_URL</code>
            {messages.setupWizard.infrastructure.keepInCoolifySuffix}
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-100">
            {messages.setupWizard.infrastructure.volumeWarningPrefix}{" "}
            <code className="mx-1 rounded bg-amber-100 px-1 py-0.5 text-xs dark:bg-amber-950/40">
              SERVICE_PASSWORD_TEMPOLL_DB
            </code>
            {messages.setupWizard.infrastructure.volumeWarningSuffix}
          </div>
        </div>
      );
    }

    if (step === 2) {
      return (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2 space-y-3 rounded-lg border bg-muted/20 p-4">
            <div className="space-y-1">
              <Label htmlFor="legalPagesEnabled">{messages.setupWizard.operator.legalPages}</Label>
              <p className="text-sm text-muted-foreground">
                {messages.setupWizard.operator.legalPagesDescription}
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
                <SelectItem value="false">{messages.setupWizard.operator.disabled}</SelectItem>
                <SelectItem value="true">{messages.setupWizard.operator.enabled}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {renderInput("operatorLegalName", messages.setupWizard.operator.legalName, { optional: true })}
          {renderInput("operatorDisplayName", messages.setupWizard.operator.displayName, { optional: true })}
          <div className="md:col-span-2">
            {renderInput("operatorStreetAddress", messages.setupWizard.operator.streetAddress, {
              optional: true,
            })}
          </div>
          {renderInput("operatorPostalCode", messages.setupWizard.operator.postalCode, { optional: true })}
          {renderInput("operatorCity", messages.setupWizard.operator.city, { optional: true })}
          {renderInput("operatorCountry", messages.setupWizard.operator.country, { optional: true })}
          {renderInput("operatorEmail", messages.setupWizard.operator.contactEmail, { optional: true })}
          {renderInput("operatorPhone", messages.setupWizard.operator.phone, { optional: true })}
          {renderInput("operatorWebsite", messages.setupWizard.operator.website, {
            placeholder: messages.setupWizard.placeholders.website,
            optional: true,
          })}
          {!legalPagesEnabled ? (
            <div className="md:col-span-2 rounded-lg border border-dashed bg-muted/15 px-4 py-3 text-sm text-muted-foreground">
              {messages.setupWizard.operator.detailsOptional}
            </div>
          ) : null}
        </div>
      );
    }

    if (step === 3) {
      return (
        <div className="grid gap-4">
          <div className="rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground">
            {messages.setupWizard.privacy.optionalDescription}
          </div>
          {renderInput("operatorBusinessPurpose", messages.setupWizard.privacy.businessPurpose, {
            placeholder: messages.setupWizard.placeholders.businessPurpose,
            optional: true,
          })}
          {renderInput("mediaOwner", messages.setupWizard.privacy.mediaOwner, { optional: true })}
          {renderInput("editorialLine", messages.setupWizard.privacy.editorialLine, {
            placeholder: messages.setupWizard.placeholders.editorialLine,
            optional: true,
          })}
          {renderInput("privacyContactEmail", messages.setupWizard.privacy.privacyContactEmail, {
            optional: true,
            placeholder: messages.setupWizard.privacy.leaveEmptyToReuse,
          })}
          {renderInput("hostingDescription", messages.setupWizard.privacy.hostingDescription, {
            multiline: true,
            placeholder: messages.setupWizard.placeholders.hostingDescription,
            optional: true,
          })}
          {renderInput("privacyProcessors", messages.setupWizard.privacy.processors, {
            multiline: true,
            optional: true,
            placeholder: messages.setupWizard.placeholders.processors,
          })}
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
          {messages.setupWizard.review.descriptionPrefix}
          {values.legalPagesEnabled === "true"
            ? messages.setupWizard.review.descriptionEnabled
            : messages.setupWizard.review.descriptionDisabled}
        </div>
        <div className="rounded-lg border border-dashed bg-muted/15 p-4 text-sm text-muted-foreground">
          {messages.setupWizard.review.exportWarningPrefix}{" "}
          <code className="mx-1 rounded bg-muted px-1 py-0.5 text-xs">DATABASE_URL</code>
          {messages.setupWizard.review.exportWarningMiddle}{" "}
          <code className="mx-1 rounded bg-muted px-1 py-0.5 text-xs">TEMPOLL_DB_NAME</code>,
          <code className="mx-1 rounded bg-muted px-1 py-0.5 text-xs">TEMPOLL_DB_USER</code>,
          {" "}
          {messages.common.and ?? "and"}{" "}
          <code className="mx-1 rounded bg-muted px-1 py-0.5 text-xs">SERVICE_PASSWORD_TEMPOLL_DB</code>
          {" "}
          {messages.setupWizard.review.exportWarningSuffix}
        </div>
        <div className="space-y-2">
          <Label htmlFor="envPreview">{messages.setupWizard.review.generatedAppConfig}</Label>
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
          <CardTitle>{messages.setupWizard.setupStepsTitle}</CardTitle>
          <CardDescription>
            {messages.setupWizard.setupStepsDescription}
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
            {messages.setupWizard.fillFieldsDescription}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {renderStep()}

          <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-muted-foreground">
              {format(messages.setupWizard.stepProgress, {
                current: step + 1,
                total: stepLabels.length,
              })}
            </div>
            <div className="flex items-center gap-2">
              {step > 0 ? (
                <Button variant="outline" onClick={() => setStep((current) => current - 1)}>
                  <ArrowLeftIcon className="size-4" />
                  {messages.common.back}
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
                  {messages.common.next}
                  <ArrowRightIcon className="size-4" />
                </Button>
              ) : (
                <Button onClick={() => void copyEnv()}>
                  <CopyIcon className="size-4" />
                  {messages.setupWizard.review.copyEnv}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
