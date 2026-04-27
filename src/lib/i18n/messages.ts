import type { AppLocale } from "@/lib/i18n/locale";

export const en = {
  metadata: {
    description:
      "Free scheduling with live availability heatmaps. Create an event, share a link, and let people join with just a name.",
    homeTitle: "Free scheduling",
    newEventTitle: "New event",
    setupTitle: "Setup",
    devDatabaseTitle: "Database status",
    imprintTitle: "Imprint",
    privacyTitle: "Privacy",
    notFoundTitle: "Not found",
    manageTitle: "Manage event",
    shareTitle: "tempoll | Free scheduling without accounts",
    shareImageAlt:
      "tempoll share card highlighting free scheduling, no accounts, and live availability heatmaps.",
    eventShareDescription: "Join {title} on tempoll. Free to use, no account needed.",
    managePrivateTitle: "Private organizer page",
    managePrivateDescription:
      "This is a private tempoll organizer link. Keep it safe and do not share it publicly.",
  },
  languageSwitcher: {
    label: "Language",
    de: "Deutsch",
    en: "English",
  },
  common: {
    optional: "Optional",
    copy: "Copy",
    copied: "Copied",
    copiedToClipboard: "Copied to clipboard",
    cancel: "Cancel",
    apply: "Apply",
    back: "Back",
    next: "Next",
    saveChanges: "Save changes",
    remove: "Remove",
    participants: "Participants",
    open: "Open",
    closed: "Closed",
    fixedDate: "Fixed date",
    fixedDay: "Fixed day",
    addToCalendar: "Add to calendar (.ics)",
    setFixedDate: "Set fixed date",
    clearFixedDate: "Clear fixed date",
    fixedDateSelected: "Fixed date selected",
    fixedDaySelected: "Fixed day selected",
    option: "Option {count}",
    and: "and",
    yes: "Yes",
    no: "No",
  },
  appChrome: {
    newEvent: "New event",
    recentEvents: "Recent events",
    openSource: "Open source on GitHub",
    featureRequest: "Open an issue on GitHub",
    databaseStatus: "Database status",
    imprint: "Imprint",
    privacy: "Privacy",
  },
  home: {
    badge: "Free to use, no account required",
    title: "The free, no-account alternative to When2Meet.",
    description:
      "Create an event, share the link, and let everyone paint availability on a live heatmap. Organizers get a private manage page, participants join with just a name, and tempoll stays free to use.",
    primaryCta: "Create an event",
    secondaryCta: "Recent events",
    features: {
      liveHeatmap: {
        title: "Live heatmap",
        copy: "Availability updates in real time while participants fill in the grid.",
      },
      rankedWindows: {
        title: "Ranked windows",
        copy: "The best meeting slots are suggested automatically for the full duration.",
      },
      simpleSharing: {
        title: "Simple sharing",
        copy: "Participants join with a name only while organizers keep a private manage link.",
      },
    },
    preview: {
      title: "Thursday design review",
      description: "Preview of the shared availability board",
      participants: "{count} participants",
      topOptionsAttendees: "{count}+ attendees available",
      dayLabels: ["Tue", "Wed", "Thu", "Fri"],
      topOptionLabels: ["Thu · 13:00-14:00", "Wed · 11:00-12:00", "Fri · 15:00-16:00"],
    },
    highlights: {
      asyncCollaboration: {
        title: "Free to use",
        description:
          "Create boards, share links, and coordinate without paywalls, seats, or setup friction.",
      },
      selfHosting: {
        title: "Join with just a name",
        description:
          "Participants can jump straight into the heatmap while organizers keep a separate private manage link.",
      },
      modernTeams: {
        title: "Live heatmap, clearer picks",
        description:
          "Watch overlap build in real time and let the strongest meeting windows rise to the top automatically.",
      },
    },
  },
  newEventPage: {
    eyebrow: "New event",
    title: "Create a scheduling board",
    description:
      "Pick one date range, choose the daily window, and generate a shareable event link.",
  },
  createEvent: {
    eventDetailsTitle: "Event details",
    eventDetailsDescription:
      "Set one date range, choose available weekdays and the daily window, then share a single link.",
    titleLabel: "Event title",
    titlePlaceholder: "Design review, sprint planning, dinner with friends...",
    eventTypeLabel: "Event type",
    eventTypeTimeGrid: "Time slots",
    eventTypeTimeGridDescription: "Participants pick times inside each day.",
    eventTypeFullDay: "Full days",
    eventTypeFullDayDescription: "Participants pick whole days only.",
    timezoneLabel: "Timezone",
    timezonePlaceholder: "Pick a timezone",
    dateRangeLabel: "Date range",
    dateRangePlaceholder: "Choose a start and end date",
    dateRangeOpenTitle: "Choose event range",
    dateRangeOpenDescription: "Weeks start on Monday. Selected weekdays will appear on the grid.",
    weekdays: {
      label: "Available weekdays",
      description:
        "Choose which weekdays inside the selected date range should appear on the availability grid.",
      options: {
        monday: { shortLabel: "Mon", label: "Monday" },
        tuesday: { shortLabel: "Tue", label: "Tuesday" },
        wednesday: { shortLabel: "Wed", label: "Wednesday" },
        thursday: { shortLabel: "Thu", label: "Thursday" },
        friday: { shortLabel: "Fri", label: "Friday" },
        saturday: { shortLabel: "Sat", label: "Saturday" },
        sunday: { shortLabel: "Sun", label: "Sunday" },
      },
    },
    dailyStartLabel: "Daily start",
    dailyStartPlaceholder: "Pick a start time",
    dailyEndLabel: "Daily end",
    dailyEndPlaceholder: "Pick an end time",
    slotSizeLabel: "Slot size",
    slotSizePlaceholder: "Choose slot size",
    meetingDurationLabel: "Meeting duration",
    meetingDurationPlaceholder: "Choose duration",
    notificationEmailLabel: "Organizer email alerts",
    notificationEmailPlaceholder: "owner@company.com",
    notificationEmailDescription:
      "Optional. Get one email after 5 quiet minutes when participants finish updating availability.",
    notificationEmailUnavailable:
      "Email alerts are not available on this host yet.",
    createButton: "Create event",
    genericSettingsError: "Please check your event settings.",
    createFailed: "Unable to create the event.",
    created: "Event created",
    previewTitle: "Preview",
    previewDescription: "This is the shape your event will have before anyone joins.",
    untitledEvent: "Untitled event",
    previewFields: {
      dateRange: "Date range",
      eventType: "Event type",
      daysShown: "Days shown",
      dailyWindow: "Daily window",
      granularity: "Granularity",
      rankedWindow: "Ranked window",
    },
    whatGetsCreatedTitle: "What gets created",
    whatGetsCreatedItems: {
      publicPage: "A public event page people can join without creating an account.",
      privatePage: "A private organizer page for renaming participants and closing the poll.",
      liveGrid:
        "A live availability grid for the selected weekdays between the chosen start and end date.",
    },
    range: {
      selected: "{count} selected",
      selectFullRange: "Select a full range",
      noEndDate: "{from} - pick an end date",
      full: "{from} - {to}",
      days: {
        one: "{count} day",
        other: "{count} days",
      },
    },
    minutesShort: "{count} min",
  },
  publicEvent: {
    daysSummary: {
      one: "{count} day",
      other: "{count} days",
    },
    gridSummary: "{count}-minute grid",
    fullDaySummary: "Full-day poll",
    participantsSummary: {
      one: "{count} participant",
      other: "{count} participants",
    },
    viewerTimezoneLabel: "Display timezone",
    viewerTimezoneAutomatic: "Automatic",
    timesShownIn: "Times shown in {timezone}",
    timesShownInDualTimezone:
      "Host: {hostTimezone} ({hostLabel}) · You: {viewerTimezone} ({viewerLabel})",
    legend: "Legend",
    legendEmpty: "empty",
    legendSomeOverlap: "some overlap",
    legendHighOverlap: "high overlap",
    legendYourAvailability: "your availability",
    legendFixedDate: "fixed date",
    legendHighlighted: "{name} highlighted",
    participantYou: "{name} (you)",
    participantSelectedSlots: {
      one: "{count} selected slot",
      other: "{count} selected slots",
    },
    participantSelectedDays: {
      one: "{count} selected day",
      other: "{count} selected days",
    },
    participantHighlighting: "Highlighting",
    joinTitle: "Join this board",
    joinDescription: "Enter your name to start selecting the times that work for you.",
    joinDescriptionFullDay: "Enter your name to start selecting the days that work for you.",
    joinStepNameTitle: "Enter your name",
    joinStepAvailabilityTitle: "Select availability",
    joinStepAvailabilityDescription:
      "The availability grid appears after you join, so your choices are saved to your name.",
    joinStepAvailabilityDescriptionFullDay:
      "The calendar appears after you join, so your choices are saved to your name.",
    joinGateDescription:
      "First enter your name. Then you can mark the times that work for you.",
    joinGateDescriptionFullDay:
      "First enter your name. Then you can mark the days that work for you.",
    yourNameLabel: "Your name",
    yourNamePlaceholder: "Alex, Nora, Product team...",
    joinButton: "Join event",
    joined: "You joined the event",
    shareTitle: "Share this board",
    shareDescription: "Copy the public event URL and send it to participants.",
    shareUrlLabel: "Public event URL",
    copyShareUrl: "Copy public URL",
    availabilityTitle: "Availability",
    availabilityDescriptionEditWindowed:
      "Tap or drag to paint your availability. Use the arrows to move day by day.",
    availabilityDescriptionEdit:
      "Click or drag across the grid to paint your availability while keeping the team heatmap in view.",
    availabilityDescriptionViewWindowed:
      "Select a slot to inspect availability. Use the arrows to move through the date range.",
    availabilityDescriptionView:
      "Click any slot to see who is available and who is not.",
    fullDayAvailabilityDescriptionEdit:
      "Tap days to mark your availability while keeping the group overview in view.",
    fullDayAvailabilityDescriptionView:
      "Select a day to see who is available and who is not.",
    editMode: "Edit",
    viewMode: "View",
    showPreviousDays: "Show previous days",
    showNextDays: "Show next days",
    dayWindowSummary: "Days {start} - {end} of {total}",
    moreDaysAvailable: "More days available",
    moreDaysAhead: "More days ahead",
    earlierDaysAvailable: "Earlier days available",
    availableCountTitle:
      "{date} {time} · {available}/{total} available · {names}",
    nobodyAvailableTitle: "{date} {time} · nobody available",
    availableOnDayTitle: "{date} · {available}/{total} available · {names}",
    nobodyAvailableOnDayTitle: "{date} · nobody available",
    slotDetailsTitle: "Slot details",
    slotDetailsSummary: "{date} · {time} · {available}/{total} available",
    slotDetailsPrompt: "Select a slot in the heatmap to inspect availability for that time.",
    dayDetailsTitle: "Day details",
    dayDetailsSummary: "{date} · {available}/{total} available",
    dayDetailsPrompt: "Select a day to inspect availability.",
    available: "Available",
    unavailable: "Not available",
    nobodyAvailableInSlot: "Nobody is available in this slot.",
    nobodyAvailableOnDay: "Nobody is available on this day.",
    everyoneAvailableHere: "Everyone with at least one selection is available here.",
    everyoneAvailableOnDay: "Everyone with at least one selected day is available here.",
    bestWindowsTitle: "Best matching windows",
    bestWindowsDescription:
      "Ranked by overlap across the full {duration}-minute meeting.",
    bestDaysTitle: "Best matching days",
    bestDaysDescription: "Ranked by the number of available participants.",
    yourTimezone: "Your timezone: {label}",
    fixedDateDescription:
      "This event is closed and the organizer picked the final meeting slot.",
    fixedDayDescription:
      "This event is closed and the organizer picked the final day.",
    participantsSidebarDescription:
      "Click a participant to highlight their availability on the grid.",
    finalSlotFits: "This slot fits the full {duration}-minute meeting.",
    finalDayFits: "This day can be published as the fixed day.",
    finalSlotFitsDescription: "Pick it as the fixed date for the closed event.",
    finalSlotOutOfRange:
      "This start time does not fit the full {duration}-minute meeting inside the selected day window.",
    fullWindowFree: {
      one: "{count} participant free for the full window",
      other: "{count} participants free for the full window",
    },
    fullDayFree: {
      one: "{count} participant available on this day",
      other: "{count} participants available on this day",
    },
  },
  manageEvent: {
    title: "Manage event",
    description:
      "Share the public board, keep the private organizer URL safe and control whether new changes are still allowed.",
    eventUpdated: "Event updated",
    titleSaved: "Title saved",
    eventClosed: "Event closed",
    fixedDateUpdated: "Fixed date updated",
    eventReopened: "Event reopened",
    participantRenamed: "Participant renamed",
    participantRemoved: "Participant removed",
    notificationEmailSaved: "Email alerts updated",
    notificationEmailCleared: "Email alerts turned off",
    titleLabel: "Title",
    saveTitle: "Save title",
    eventStatusTitle: "Event status",
    statusLabel: "Status",
    statusOpen: "Open for edits",
    statusClosed: "Closed",
    statusOpenDescription: "Pick a slot in the heatmap to publish the fixed date and close the event.",
    statusOpenFullDayDescription:
      "Pick a day to publish the fixed day and close the event.",
    statusClosedDescription:
      "This event is closed. Reopen it if participants should be able to edit availability again.",
    participantsTitle: "Participants",
    participantsDescription:
      "Click a row to highlight availability. Rename participants or remove accidental entries.",
    shareLinksTitle: "Share links",
    shareLinksDescription:
      "Keep the organizer link private. The public link is safe to share.",
    publicEventUrl: "Public event URL",
    privateOrganizerUrl: "Private organizer URL",
    openPublicEvent: "Open public event",
    copyPublicUrl: "Copy public URL",
    copyOrganizerUrl: "Copy organizer URL",
    emailAlertsTitle: "Email alerts",
    emailAlertsDescription:
      "Get one digest after 5 quiet minutes when participants finish updating availability.",
    emailAlertsUnavailable:
      "Email alerts are not available on this host right now.",
    emailAlertsRecipientLabel: "Send alerts to",
    emailAlertsSave: "Save email",
    emailAlertsClear: "Turn off alerts",
    emailAlertsPending: "A digest is queued for {timestamp}.",
    emailAlertsLastSent: "Last digest sent {timestamp}.",
    emailAlertsIdle: "No digest is queued right now.",
    emailAlertsPrivateLinkNote:
      "Each email includes a fresh private organizer link. Treat it as sensitive.",
    bestWindowsTitle: "Best windows right now",
    bestDaysTitle: "Best days right now",
    fixedDatePublishedDescription:
      "This is the published fixed date for the closed event.",
    fixedDateDraftDescription:
      "This fixed date is selected locally and will be published after saving.",
    setFixedDateAndCloseEvent: "Set fixed date and close event",
    setFixedDayAndCloseEvent: "Set fixed day and close event",
    updateFixedDate: "Update fixed date",
    updateFixedDay: "Update fixed day",
    fixedDateActionCloseDescription:
      "This will publish the fixed date immediately and stop further edits.",
    fixedDateActionUpdateDescription:
      "This will publish this slot as the new fixed date immediately.",
    fixedDateActionSelectedDescription:
      "This slot is already published as the fixed date.",
    fixedDayActionCloseDescription:
      "This will publish the fixed day immediately and stop further edits.",
    fixedDayActionUpdateDescription:
      "This will publish this day as the new fixed day immediately.",
    fixedDayActionSelectedDescription:
      "This day is already published as the fixed day.",
    reopenEvent: "Reopen event",
    reopenEventConfirmTitle: "Reopen this event?",
    reopenEventConfirmDescription:
      "Participants will be able to edit availability again and the published fixed date will be cleared.",
    reopenEventConfirmAction: "Reopen and clear fixed date",
    closeRequiresFixedDate: "Pick a fixed date before closing this event.",
    closeRequiresFixedDateInHeatmap:
      "Pick a fixed date in the heatmap before closing this event.",
    closedHeatmapDescription:
      "Click a slot to inspect availability and update the published fixed date.",
    closedFullDayDescription:
      "Select a day to inspect availability and update the published fixed day.",
    closedHeatmapDescriptionWindowed:
      "Select a slot to inspect overlap and update the fixed date below. Use the arrows to move through the date range.",
    openHeatmapDescription:
      "Click a slot to inspect availability and close the event from the slot action.",
    openFullDayDescription:
      "Select a day to inspect availability and close the event from the day action.",
    openHeatmapDescriptionWindowed:
      "Select a slot to inspect availability and close the event from the slot action. Use the arrows to move through the date range.",
    peopleAvailable: {
      one: "{count} person available",
      other: "{count} people available",
    },
  },
  recentEvents: {
    eyebrow: "Recent events",
    title: "Open boards you visited before",
    description: "Saved only in this browser. Organizer links are marked as private.",
    clearAll: "Clear all",
    emptyTitle: "No recent events yet",
    emptyDescription:
      "Open a public board or organizer page and it will appear here for quick access.",
    lastOpened: "Last opened {timestamp}",
    devSeed: "Dev seed",
    devSeedDescription:
      "Shown because dev mode is enabled. It is not stored in your browser history.",
    privateLinkSaved: "Private link saved",
    openPublic: "Open board",
    openOrganizer: "Manage event",
    remove: "Remove",
  },
  devDatabase: {
    eyebrow: "Development",
    title: "Database status",
    description:
      "Check whether this local dev instance can reach Postgres without exposing the database password.",
    connected: "Connected",
    failed: "Failed",
    connectionDetails: "Connection details",
    connectionHealthy: "The database answered a live query successfully.",
    connectionFailed: "The database connection check failed.",
    labels: {
      target: "Connection target",
      latency: "Latency",
      database: "Database",
      user: "User",
      schema: "Schema",
      postgresVersion: "Postgres version",
      error: "Error",
    },
  },
  notFound: {
    eyebrow: "Not found",
    title: "That scheduling board does not exist.",
    description:
      "The link may be incomplete, expired or already removed. You can always create a new board and start fresh.",
    action: "Create a new event",
  },
  setupPage: {
    badge: "First-run setup",
    title: "Configure {appName} before going live.",
    description:
      "This wizard keeps everything local in your browser and generates the non-secret app configuration you can paste into Coolify or your server environment.",
    overviewTitle: "What this setup covers",
    overviewDescription:
      "App identity, bundled infrastructure guidance, operator details, Austrian legal disclosure fields, and privacy-hosting information.",
    overviewItems: {
      appConfig: "Generate an app config snippet with `APP_SETUP_COMPLETE=true`.",
      secrets: "Keep database secrets in Coolify. The browser setup never shows them.",
      redeploy: "Restart or redeploy afterwards and the normal app becomes available.",
    },
  },
  setupWizard: {
    steps: [
      "App basics",
      "Infrastructure",
      "Operator details",
      "Legal and privacy",
      "Review and export",
    ],
    setupStepsTitle: "Setup steps",
    setupStepsDescription:
      "This wizard generates the non-secret app configuration for your self-hosted deployment.",
    fillFieldsDescription:
      "Fill in the fields below. All values stay in your browser until you copy the generated app config snippet.",
    stepProgress: "Step {current} of {total}",
    copiedAppConfig: "Copied app config",
    appName: "App name",
    publicAppUrl: "Public app URL",
    defaultLanguage: "Default language",
    infrastructure: {
      title: "Bundled Postgres infrastructure",
      description:
        "tempoll uses the bundled Postgres service from the Docker Compose stack. The database password is managed by Coolify and is never entered, shown, or exported by this browser wizard. On a fresh stack, Coolify generates the password before the first Postgres initialization.",
      databaseName: "Database name",
      databaseUser: "Database user",
      generatedPassword: "Generated password",
      keepInCoolifyPrefix: "Keep these infrastructure variables in Coolify. This setup wizard only exports non-secret app and legal configuration, and the Docker Compose stack derives",
      keepInCoolifySuffix: "internally.",
      volumeWarningPrefix:
        "If you already have a persistent Postgres volume, make sure",
      volumeWarningSuffix:
        "matches the current live database password before redeploying.",
    },
    operator: {
      legalPages: "Legal pages",
      legalPagesDescription:
        "Keep imprint and privacy pages disabled if you do not want to publish legal details directly on the site. You can still share sensitive details on request.",
      disabled: "Disabled",
      enabled: "Enabled",
      legalName: "Legal name",
      displayName: "Display name",
      streetAddress: "Street address",
      postalCode: "Postal code",
      city: "City",
      country: "Country",
      contactEmail: "Contact email",
      phone: "Phone",
      website: "Website",
      detailsOptional:
        "Legal pages are currently disabled. All details on this step are optional and can be left blank.",
    },
    privacy: {
      optionalDescription:
        "Everything on this step is optional. If you leave fields empty, the public legal pages will either omit them or use a generic “available on request” note.",
      businessPurpose: "Business purpose",
      mediaOwner: "Media owner",
      editorialLine: "Editorial line",
      privacyContactEmail: "Privacy contact email",
      hostingDescription: "Hosting description",
      processors: "Processors / infrastructure partners",
      leaveEmptyToReuse: "Leave empty to reuse the main contact email",
    },
    review: {
      descriptionPrefix:
        "Copy this app configuration into Coolify, keep the infrastructure database variables unchanged, and redeploy the app. The setup wizard will disappear automatically afterwards.",
      descriptionEnabled: " Imprint and privacy pages are enabled.",
      descriptionDisabled:
        " Imprint and privacy pages will stay disabled until you opt in.",
      exportWarningPrefix: "This export intentionally does not contain",
      exportWarningMiddle: "or any database password. Keep",
      exportWarningSuffix: "managed separately in Coolify.",
      generatedAppConfig: "Generated app config",
      copyEnv: "Copy .env",
    },
    placeholders: {
      appUrl: "https://meet.example.com",
      website: "https://example.com",
      businessPurpose: "Operation of a self-hosted scheduling web application.",
      editorialLine:
        "Information about the software project and scheduling boards operated via this service.",
      hostingDescription:
        "Self-hosted via Coolify on infrastructure operated by the controller and selected hosting providers.",
      processors: "One entry per line, e.g.\nCoolify\nHetzner\nCloudflare",
    },
  },
  imprint: {
    eyebrow: "Legal",
    title: "Imprint",
    description:
      "This page contains the operator disclosure for {appName}. The structure is prepared for Austrian self-hosted deployments and should be reviewed before production use.",
    providerInformation: "Provider information",
    providerInformationDescription:
      "Information pursuant to the Austrian disclosure rules for websites.",
    labels: {
      legalName: "Legal name",
      displayName: "Display name",
      address: "Address",
      email: "Email",
      phone: "Phone",
      website: "Website",
      businessPurpose: "Business purpose",
      mediaOwner: "Media owner",
      editorialLine: "Editorial line",
    },
    availableOnRequest: "Available on request",
    addressOnRequest: "Not published here. Address details can be provided on request.",
    contactOnRequest: "Not published here. Contact details can be provided on request.",
    defaultBusinessPurpose: "Operation of a self-hosted scheduling service.",
    mediaOwnerAndEditorialLine: "Media owner and editorial line",
    mediaOwnerAndEditorialLineDescription:
      "Disclosure for informational content provided via this website.",
    mediaOwnerOnRequest: "Available on request.",
    editorialLineDefault:
      "Project information and operational details about this scheduling service.",
    hostingNotice: "Hosting notice",
    hostingNoticeDescription: "Operational note about how this service is provided.",
    hostingOnRequest: "Hosting details are not published here and can be provided on request.",
  },
  privacy: {
    eyebrow: "Legal",
    title: "Privacy",
    description:
      "This privacy notice explains how personal data is processed when you use {appName}. It is written as an English baseline for an Austrian-operated, self-hosted service.",
    controller: "Controller",
    whatDataIsProcessed: "What data is processed",
    whatDataIsProcessedDescription:
      "The service is intentionally small, does not require user accounts, and avoids advertising technologies.",
    purposesAndLegalBases: "Purposes and legal bases",
    cookiesAndLocalStorage: "Cookies and local storage",
    recipientsAndHosting: "Recipients and hosting",
    retentionPeriods: "Retention periods",
    yourRights: "Your rights",
    defaults: {
      processors:
        "No separate processors are listed beyond the controller's direct infrastructure setup.",
      controllerName: "The controller named in the server configuration",
      generalContact:
        "No public email address is published here. Contact details can be provided on request.",
      privacyContact:
        "No separate public privacy contact email is published here.",
      hostingOnRequest:
        "Hosting details are not published here and can be provided on request.",
    },
    controllerParagraphWithAddress:
      "The controller for this website and service is {name}, {address}.",
    controllerParagraphWithoutAddress:
      "The controller for this website and service is {name}. Address details can be provided on request.",
    contactParagraph:
      "General contact: {generalContact}. Privacy-specific contact: {privacyContact}",
    processedDataItems: {
      displayNames: "Participant display names entered to join a scheduling board.",
      selections: "Availability selections for the date and time slots of a board.",
      sessions:
        "Technical session data required to keep a participant edit session active.",
      recentEvents:
        "Browser-local recent-event history stored on your own device via localStorage.",
      requestMetadata:
        "Request metadata, IP addresses, and server logs required for secure operation.",
      databaseRecords:
        "Database records required to operate events, organizer links, and live updates.",
    },
    purposesParagraph1:
      "Personal data is processed to provide the scheduling service, keep events available, protect the application against abuse, and operate the hosting environment.",
    purposesParagraph2:
      "Depending on the context, processing is based on Article 6(1)(b) GDPR where data is required to provide the requested service, and on Article 6(1)(f) GDPR where processing is necessary for secure technical operation, abuse prevention, and maintaining service integrity.",
    cookiesParagraph1:
      "The application uses technically necessary browser storage only. This includes a participant session cookie or equivalent token handling to allow availability editing, and local browser storage for the optional recent-events list on the home page.",
    cookiesParagraph2:
      "No advertising or third-party marketing trackers are used. If the operator enables optional privacy-friendly analytics, it is limited to product usage measurement.",
    retentionParagraph1:
      "Event data is stored for as long as the controller keeps the corresponding scheduling boards available. Request logs and operational logs are retained only for as long as needed for security, diagnostics, and infrastructure management.",
    retentionParagraph2:
      "Browser-local recent-event history remains on your own device until you remove it or clear your browser storage.",
    rightsParagraph1:
      "Subject to the applicable legal requirements, you have the right to access, rectification, erasure, restriction of processing, data portability, and objection.",
    rightsParagraph2:
      "You also have the right to lodge a complaint with the Austrian Data Protection Authority (Österreichische Datenschutzbehörde) if you believe that your data is being processed in violation of data protection law.",
  },
  errors: {
    appSetupIncomplete:
      "App setup is not complete yet. Open /setup to generate the environment configuration.",
    routeFallbacks: {
      createEvent: "Unable to create event.",
      joinEvent: "Unable to join event.",
      saveAvailability: "Unable to save availability.",
      updateEvent: "Unable to update event.",
      removeParticipant: "Unable to remove participant.",
      eventStream: "Unable to open the live event stream.",
      eventNotFound: "Event not found.",
      eventStreamNotFound: "Not found",
    },
    app: {
      eventNotFound: "Event not found.",
      eventClosed: "This event is closed.",
      participantNameTaken: "That name is already taken for this event.",
      participantSessionMissing:
        "Your editing session is no longer valid. Reopen your participant link or join the event again.",
      participantNotFound: "Participant not found.",
      invalidSlots: "One or more selected slots are outside the event window.",
      manageKeyInvalid: "Event not found.",
      finalSlotRequired: "Pick a fixed date before closing this event.",
      finalSlotInvalid: "Pick a valid fixed date that fits the full meeting duration.",
      notificationDeliveryUnavailable: "Email alerts are not available on this host.",
    },
    rateLimit: {
      eventCreate: "Too many event creation attempts. Please wait a few minutes and try again.",
      joinEvent: "Too many join attempts. Please wait a few minutes and try again.",
      availabilityIp:
        "Too many availability updates from this network. Please wait a moment and try again.",
      availabilitySession:
        "Too many availability updates in a short time. Please slow down for a moment.",
      organizerActions: "Too many organizer actions. Please wait a bit and try again.",
      eventStream:
        "Too many event stream connections. Please wait a moment and try again.",
      eventStreamConcurrency:
        "Too many live event streams from this network. Close another tab and try again.",
    },
  },
  validation: {
    eventCreate: {
      titleMin: "Event title must be at least 3 characters long.",
      titleMax: "Event title must be 80 characters or fewer.",
      timezoneRequired: "Choose a timezone.",
      validCalendarDates: "Choose valid calendar dates.",
      chooseStartAndEndDate: "Choose a start and end date.",
      dateRangeMax: "Time-slot events can include up to 31 days.",
      fullDayDateRangeMax: "Full-day events can include up to 366 days.",
      validDailyStart: "Choose a valid daily start time.",
      validDailyEnd: "Choose a valid daily end time.",
      supportedSlotSize: "Select a supported slot size.",
      supportedMeetingDuration: "Select a supported meeting duration.",
      endAfterStart: "End time must be later than start time.",
      durationMatchesSlot: "Meeting duration must align with slot size.",
      dateRangeRequired: "Choose a start and end date for the event.",
      weekdayRequired: "Select at least one available weekday inside the date range.",
    },
    participantCreate: {
      nameMin: "Enter a name with at least 2 characters.",
      nameMax: "Use 32 characters or fewer for the name.",
    },
    setup: {
      required: "This field is required.",
      fullUrl: "Use a full URL including http:// or https://.",
      validEmail: "Use a valid email address.",
      validLocale: "Choose a supported default language.",
    },
  },
} as const;

type WidenMessages<T> = T extends string
  ? string
  : T extends number
    ? number
    : T extends readonly (infer U)[]
      ? readonly WidenMessages<U>[]
      : T extends object
        ? { [K in keyof T]: WidenMessages<T[K]> }
        : T;

export type Messages = WidenMessages<typeof en>;

export const de: Messages = {
  metadata: {
    description:
      "Kostenlose Terminfindung mit Live-Heatmaps. Erstelle ein Event, teile einen Link und lass Menschen nur mit einem Namen beitreten.",
    homeTitle: "Kostenlose Terminfindung",
    newEventTitle: "Neues Event",
    setupTitle: "Setup",
    devDatabaseTitle: "Datenbankstatus",
    imprintTitle: "Impressum",
    privacyTitle: "Datenschutz",
    notFoundTitle: "Nicht gefunden",
    manageTitle: "Event verwalten",
    shareTitle: "tempoll | Kostenlose Terminfindung ohne Konto",
    shareImageAlt:
      "tempoll Share-Card mit Fokus auf kostenlose Terminfindung ohne Konto und Live-Heatmaps.",
    eventShareDescription: "Tritt {title} auf tempoll bei. Kostenlos nutzbar, ohne Konto.",
    managePrivateTitle: "Private Verwaltungsseite",
    managePrivateDescription:
      "Dies ist ein privater tempoll-Verwaltungslink. Bitte nicht öffentlich teilen.",
  },
  languageSwitcher: {
    label: "Sprache",
    de: "Deutsch",
    en: "English",
  },
  common: {
    optional: "Optional",
    copy: "Kopieren",
    copied: "Kopiert",
    copiedToClipboard: "In die Zwischenablage kopiert",
    cancel: "Abbrechen",
    apply: "Übernehmen",
    back: "Zurück",
    next: "Weiter",
    saveChanges: "Änderungen speichern",
    remove: "Entfernen",
    participants: "Teilnehmende",
    open: "Offen",
    closed: "Geschlossen",
    fixedDate: "Fixer Termin",
    fixedDay: "Fixer Tag",
    addToCalendar: "Zum Kalender hinzufügen (.ics)",
    setFixedDate: "Fixen Termin setzen",
    clearFixedDate: "Fixen Termin entfernen",
    fixedDateSelected: "Fixer Termin ausgewählt",
    fixedDaySelected: "Fixer Tag ausgewählt",
    option: "Option {count}",
    and: "und",
    yes: "Ja",
    no: "Nein",
  },
  appChrome: {
    newEvent: "Neues Event",
    recentEvents: "Letzte Events",
    openSource: "Open Source auf GitHub",
    featureRequest: "Issue auf GitHub eröffnen",
    databaseStatus: "Datenbankstatus",
    imprint: "Impressum",
    privacy: "Datenschutz",
  },
  home: {
    badge: "Kostenlos nutzbar, ohne Konto",
    title: "Die kostenlose Alternative zu When2Meet ohne Konto.",
    description:
      "Erstelle ein Event, teile den Link und lass alle ihre Verfügbarkeit direkt auf einer Live-Heatmap markieren. Die organisierende Person erhält eine private Verwaltungsseite, alle anderen steigen nur mit einem Namen ein, und tempoll bleibt kostenlos nutzbar.",
    primaryCta: "Event erstellen",
    secondaryCta: "Letzte Events",
    features: {
      liveHeatmap: {
        title: "Live-Heatmap",
        copy: "Verfügbarkeiten aktualisieren sich in Echtzeit, während Teilnehmende das Raster ausfüllen.",
      },
      rankedWindows: {
        title: "Gerankte Zeitfenster",
        copy: "Die besten Meeting-Slots werden automatisch für die gesamte Dauer vorgeschlagen.",
      },
      simpleSharing: {
        title: "Einfach teilen",
        copy: "Teilnehmende kommen nur mit einem Namen hinein, während die organisierende Person einen privaten Verwaltungslink behält.",
      },
    },
    preview: {
      title: "Design-Review am Donnerstag",
      description: "Vorschau auf das geteilte Verfügbarkeitsboard",
      participants: "{count} Teilnehmende",
      topOptionsAttendees: "{count}+ Teilnehmende verfügbar",
      dayLabels: ["Di", "Mi", "Do", "Fr"],
      topOptionLabels: ["Do · 13:00-14:00", "Mi · 11:00-12:00", "Fr · 15:00-16:00"],
    },
    highlights: {
      asyncCollaboration: {
        title: "Kostenlos nutzbar",
        description:
          "Erstelle Boards, teile Links und koordiniere ohne Paywall, Lizenzen oder Setup-Hürden.",
      },
      selfHosting: {
        title: "Beitritt nur mit Namen",
        description:
          "Teilnehmende springen direkt in die Heatmap, während die organisierende Person einen separaten privaten Verwaltungslink behält.",
      },
      modernTeams: {
        title: "Live-Heatmap, klarere Auswahl",
        description:
          "Sieh live, wo Überschneidungen entstehen, und lass die besten Meeting-Zeitfenster automatisch nach oben rutschen.",
      },
    },
  },
  newEventPage: {
    eyebrow: "Neues Event",
    title: "Ein Planungsboard erstellen",
    description:
      "Wähle einen Datumsbereich, lege das tägliche Zeitfenster fest und erzeuge einen teilbaren Event-Link.",
  },
  createEvent: {
    eventDetailsTitle: "Event-Details",
    eventDetailsDescription:
      "Lege einen Datumsbereich fest, wähle verfügbare Wochentage und das tägliche Zeitfenster und teile anschließend einen einzigen Link.",
    titleLabel: "Event-Titel",
    titlePlaceholder: "Design-Review, Sprint-Planung, Abendessen mit Freund:innen...",
    eventTypeLabel: "Event-Art",
    eventTypeTimeGrid: "Zeit-Slots",
    eventTypeTimeGridDescription: "Teilnehmende wählen Zeiten innerhalb jedes Tages.",
    eventTypeFullDay: "Ganze Tage",
    eventTypeFullDayDescription: "Teilnehmende wählen nur ganze Tage.",
    timezoneLabel: "Zeitzone",
    timezonePlaceholder: "Zeitzone wählen",
    dateRangeLabel: "Datumsbereich",
    dateRangePlaceholder: "Start- und Enddatum wählen",
    dateRangeOpenTitle: "Event-Bereich wählen",
    dateRangeOpenDescription:
      "Wochen beginnen am Montag. Ausgewählte Wochentage erscheinen im Raster.",
    weekdays: {
      label: "Verfügbare Wochentage",
      description:
        "Wähle, welche Wochentage im ausgewählten Datumsbereich im Verfügbarkeitsraster erscheinen sollen.",
      options: {
        monday: { shortLabel: "Mo", label: "Montag" },
        tuesday: { shortLabel: "Di", label: "Dienstag" },
        wednesday: { shortLabel: "Mi", label: "Mittwoch" },
        thursday: { shortLabel: "Do", label: "Donnerstag" },
        friday: { shortLabel: "Fr", label: "Freitag" },
        saturday: { shortLabel: "Sa", label: "Samstag" },
        sunday: { shortLabel: "So", label: "Sonntag" },
      },
    },
    dailyStartLabel: "Tagesbeginn",
    dailyStartPlaceholder: "Startzeit wählen",
    dailyEndLabel: "Tagesende",
    dailyEndPlaceholder: "Endzeit wählen",
    slotSizeLabel: "Slot-Größe",
    slotSizePlaceholder: "Slot-Größe wählen",
    meetingDurationLabel: "Meeting-Dauer",
    meetingDurationPlaceholder: "Dauer wählen",
    notificationEmailLabel: "Organizer-E-Mail-Benachrichtigungen",
    notificationEmailPlaceholder: "name@beispiel.de",
    notificationEmailDescription:
      "Optional. Erhalte eine E-Mail, nachdem Teilnehmende ihre Verfügbarkeit 5 ruhige Minuten lang nicht mehr geändert haben.",
    notificationEmailUnavailable:
      "E-Mail-Benachrichtigungen sind auf diesem Host noch nicht verfügbar.",
    createButton: "Event erstellen",
    genericSettingsError: "Bitte prüfe deine Event-Einstellungen.",
    createFailed: "Das Event konnte nicht erstellt werden.",
    created: "Event erstellt",
    previewTitle: "Vorschau",
    previewDescription:
      "So sieht dein Event aus, bevor jemand beitritt.",
    untitledEvent: "Unbenanntes Event",
    previewFields: {
      dateRange: "Datumsbereich",
      eventType: "Event-Art",
      daysShown: "Angezeigte Tage",
      dailyWindow: "Tägliches Zeitfenster",
      granularity: "Granularität",
      rankedWindow: "Geranktes Fenster",
    },
    whatGetsCreatedTitle: "Was erstellt wird",
    whatGetsCreatedItems: {
      publicPage:
        "Eine öffentliche Event-Seite, der man ohne Konto beitreten kann.",
      privatePage:
        "Eine private Verwaltungsseite zum Umbenennen von Teilnehmenden und Schließen der Umfrage.",
      liveGrid:
        "Ein Live-Verfügbarkeitsraster für die ausgewählten Wochentage zwischen Start- und Enddatum.",
    },
    range: {
      selected: "{count} ausgewählt",
      selectFullRange: "Vollständigen Bereich wählen",
      noEndDate: "{from} - Enddatum wählen",
      full: "{from} - {to}",
      days: {
        one: "{count} Tag",
        other: "{count} Tage",
      },
    },
    minutesShort: "{count} Min.",
  },
  publicEvent: {
    daysSummary: {
      one: "{count} Tag",
      other: "{count} Tage",
    },
    gridSummary: "{count}-Minuten-Raster",
    fullDaySummary: "Ganztägige Umfrage",
    participantsSummary: {
      one: "{count} teilnehmende Person",
      other: "{count} Teilnehmende",
    },
    viewerTimezoneLabel: "Anzeige-Zeitzone",
    viewerTimezoneAutomatic: "Automatisch",
    timesShownIn: "Zeiten angezeigt in {timezone}",
    timesShownInDualTimezone:
      "Host: {hostTimezone} ({hostLabel}) · Du: {viewerTimezone} ({viewerLabel})",
    legend: "Legende",
    legendEmpty: "leer",
    legendSomeOverlap: "einige Überschneidungen",
    legendHighOverlap: "hohe Überschneidung",
    legendYourAvailability: "deine Verfügbarkeit",
    legendFixedDate: "fixer Termin",
    legendHighlighted: "{name} hervorgehoben",
    participantYou: "{name} (du)",
    participantSelectedSlots: {
      one: "{count} ausgewählter Slot",
      other: "{count} ausgewählte Slots",
    },
    participantSelectedDays: {
      one: "{count} ausgewählter Tag",
      other: "{count} ausgewählte Tage",
    },
    participantHighlighting: "Hervorgehoben",
    joinTitle: "Diesem Board beitreten",
    joinDescription:
      "Gib deinen Namen ein, um die Zeiten zu markieren, die für dich passen.",
    joinDescriptionFullDay:
      "Gib deinen Namen ein, um die Tage zu markieren, die für dich passen.",
    joinStepNameTitle: "Namen eingeben",
    joinStepAvailabilityTitle: "Verfügbarkeit auswählen",
    joinStepAvailabilityDescription:
      "Das Verfügbarkeitsraster erscheint nach dem Beitritt, damit deine Auswahl mit deinem Namen gespeichert wird.",
    joinStepAvailabilityDescriptionFullDay:
      "Der Kalender erscheint nach dem Beitritt, damit deine Auswahl mit deinem Namen gespeichert wird.",
    joinGateDescription:
      "Gib zuerst deinen Namen ein. Danach kannst du die passenden Zeiten markieren.",
    joinGateDescriptionFullDay:
      "Gib zuerst deinen Namen ein. Danach kannst du die passenden Tage markieren.",
    yourNameLabel: "Dein Name",
    yourNamePlaceholder: "Alex, Nora, Produktteam...",
    joinButton: "Event beitreten",
    joined: "Du bist dem Event beigetreten",
    shareTitle: "Board teilen",
    shareDescription:
      "Kopiere die öffentliche Event-URL und teile sie mit den Teilnehmenden.",
    shareUrlLabel: "Öffentliche Event-URL",
    copyShareUrl: "Öffentliche URL kopieren",
    availabilityTitle: "Verfügbarkeit",
    availabilityDescriptionEditWindowed:
      "Tippe oder ziehe, um deine Verfügbarkeit zu markieren. Mit den Pfeilen bewegst du dich tageweise weiter.",
    availabilityDescriptionEdit:
      "Klicke oder ziehe über das Raster, um deine Verfügbarkeit zu markieren und gleichzeitig die Team-Heatmap im Blick zu behalten.",
    availabilityDescriptionViewWindowed:
      "Wähle einen Slot aus, um die Verfügbarkeit zu prüfen. Mit den Pfeilen bewegst du dich durch den Datumsbereich.",
    availabilityDescriptionView:
      "Klicke auf einen beliebigen Slot, um zu sehen, wer verfügbar ist und wer nicht.",
    fullDayAvailabilityDescriptionEdit:
      "Tippe auf Tage, um deine Verfügbarkeit zu markieren und die Gruppenübersicht im Blick zu behalten.",
    fullDayAvailabilityDescriptionView:
      "Wähle einen Tag aus, um zu sehen, wer verfügbar ist und wer nicht.",
    editMode: "Bearbeiten",
    viewMode: "Ansehen",
    showPreviousDays: "Vorherige Tage anzeigen",
    showNextDays: "Nächste Tage anzeigen",
    dayWindowSummary: "Tage {start} - {end} von {total}",
    moreDaysAvailable: "Weitere Tage verfügbar",
    moreDaysAhead: "Weitere Tage folgen",
    earlierDaysAvailable: "Frühere Tage verfügbar",
    availableCountTitle:
      "{date} {time} · {available}/{total} verfügbar · {names}",
    nobodyAvailableTitle: "{date} {time} · niemand verfügbar",
    availableOnDayTitle: "{date} · {available}/{total} verfügbar · {names}",
    nobodyAvailableOnDayTitle: "{date} · niemand verfügbar",
    slotDetailsTitle: "Slot-Details",
    slotDetailsSummary: "{date} · {time} · {available}/{total} verfügbar",
    slotDetailsPrompt:
      "Wähle einen Slot in der Heatmap aus, um die Verfügbarkeit für diese Zeit zu prüfen.",
    dayDetailsTitle: "Tagesdetails",
    dayDetailsSummary: "{date} · {available}/{total} verfügbar",
    dayDetailsPrompt: "Wähle einen Tag aus, um die Verfügbarkeit zu prüfen.",
    available: "Verfügbar",
    unavailable: "Nicht verfügbar",
    nobodyAvailableInSlot: "In diesem Slot ist niemand verfügbar.",
    nobodyAvailableOnDay: "An diesem Tag ist niemand verfügbar.",
    everyoneAvailableHere:
      "Hier sind alle verfügbar, die mindestens eine Auswahl getroffen haben.",
    everyoneAvailableOnDay:
      "Hier sind alle verfügbar, die mindestens einen Tag ausgewählt haben.",
    bestWindowsTitle: "Beste passende Zeitfenster",
    bestWindowsDescription:
      "Gerankt nach Überschneidung über das gesamte {duration}-minütige Meeting.",
    bestDaysTitle: "Beste passende Tage",
    bestDaysDescription: "Gerankt nach der Anzahl verfügbarer Teilnehmender.",
    yourTimezone: "Deine Zeitzone: {label}",
    fixedDateDescription:
      "Dieses Event ist geschlossen und die organisierende Person hat den finalen Meeting-Slot gewählt.",
    fixedDayDescription:
      "Dieses Event ist geschlossen und die organisierende Person hat den finalen Tag gewählt.",
    participantsSidebarDescription:
      "Klicke auf eine teilnehmende Person, um ihre Verfügbarkeit im Raster hervorzuheben.",
    finalSlotFits: "Dieser Slot passt zum gesamten {duration}-minütigen Meeting.",
    finalDayFits: "Dieser Tag kann als fixer Tag veröffentlicht werden.",
    finalSlotFitsDescription:
      "Wähle ihn als fixes Datum für das geschlossene Event.",
    finalSlotOutOfRange:
      "Diese Startzeit passt innerhalb des gewählten Tagesfensters nicht zum gesamten {duration}-minütigen Meeting.",
    fullWindowFree: {
      one: "{count} Person ist im gesamten Zeitfenster frei",
      other: "{count} Personen sind im gesamten Zeitfenster frei",
    },
    fullDayFree: {
      one: "{count} Person ist an diesem Tag verfügbar",
      other: "{count} Personen sind an diesem Tag verfügbar",
    },
  },
  manageEvent: {
    title: "Event verwalten",
    description:
      "Teile das öffentliche Board, bewahre die private Organizer-URL sicher auf und steuere, ob weitere Änderungen noch erlaubt sind.",
    eventUpdated: "Event aktualisiert",
    titleSaved: "Titel gespeichert",
    eventClosed: "Event geschlossen",
    fixedDateUpdated: "Fixer Termin aktualisiert",
    eventReopened: "Event wieder geöffnet",
    participantRenamed: "Teilnehmende Person umbenannt",
    participantRemoved: "Teilnehmende Person entfernt",
    notificationEmailSaved: "E-Mail-Benachrichtigungen aktualisiert",
    notificationEmailCleared: "E-Mail-Benachrichtigungen ausgeschaltet",
    titleLabel: "Titel",
    saveTitle: "Titel speichern",
    eventStatusTitle: "Eventstatus",
    statusLabel: "Status",
    statusOpen: "Für Änderungen geöffnet",
    statusClosed: "Geschlossen",
    statusOpenDescription:
      "Wähle in der Heatmap einen Slot aus, um den fixen Termin zu veröffentlichen und das Event zu schließen.",
    statusOpenFullDayDescription:
      "Wähle einen Tag aus, um den fixen Tag zu veröffentlichen und das Event zu schließen.",
    statusClosedDescription:
      "Dieses Event ist geschlossen. Öffne es wieder, wenn Teilnehmende ihre Verfügbarkeit erneut bearbeiten dürfen.",
    participantsTitle: "Teilnehmende",
    participantsDescription:
      "Klicke auf eine Zeile, um die Verfügbarkeit hervorzuheben. Benenne Teilnehmende zur besseren Übersicht um oder entferne versehentliche Einträge.",
    shareLinksTitle: "Links teilen",
    shareLinksDescription:
      "Halte den Organizer-Link privat. Der öffentliche Link kann sicher geteilt werden.",
    publicEventUrl: "Öffentliche Event-URL",
    privateOrganizerUrl: "Private Organizer-URL",
    openPublicEvent: "Öffentliches Event öffnen",
    copyPublicUrl: "Öffentliche URL kopieren",
    copyOrganizerUrl: "Organizer-URL kopieren",
    emailAlertsTitle: "E-Mail-Benachrichtigungen",
    emailAlertsDescription:
      "Erhalte eine Sammelmail, nachdem Teilnehmende ihre Verfügbarkeit 5 ruhige Minuten lang nicht mehr geändert haben.",
    emailAlertsUnavailable:
      "E-Mail-Benachrichtigungen sind auf diesem Host gerade nicht verfügbar.",
    emailAlertsRecipientLabel: "Benachrichtigungen senden an",
    emailAlertsSave: "E-Mail speichern",
    emailAlertsClear: "Benachrichtigungen ausschalten",
    emailAlertsPending: "Eine Sammelmail ist für {timestamp} eingeplant.",
    emailAlertsLastSent: "Letzte Sammelmail gesendet {timestamp}.",
    emailAlertsIdle: "Im Moment ist keine Sammelmail eingeplant.",
    emailAlertsPrivateLinkNote:
      "Jede E-Mail enthält einen frischen privaten Organizer-Link. Behandle ihn als sensibel.",
    bestWindowsTitle: "Beste Zeitfenster im Moment",
    bestDaysTitle: "Beste Tage im Moment",
    fixedDatePublishedDescription:
      "Das ist der veröffentlichte feste Termin für das geschlossene Event.",
    fixedDateDraftDescription:
      "Dieser feste Termin ist lokal ausgewählt und wird nach dem Speichern veröffentlicht.",
    setFixedDateAndCloseEvent: "Fixen Termin setzen und Event schließen",
    setFixedDayAndCloseEvent: "Fixen Tag setzen und Event schließen",
    updateFixedDate: "Fixen Termin aktualisieren",
    updateFixedDay: "Fixen Tag aktualisieren",
    fixedDateActionCloseDescription:
      "Dadurch wird der feste Termin sofort veröffentlicht und weitere Änderungen werden gestoppt.",
    fixedDateActionUpdateDescription:
      "Dadurch wird dieser Slot sofort als neuer fixer Termin veröffentlicht.",
    fixedDateActionSelectedDescription:
      "Dieser Slot ist bereits als fixer Termin veröffentlicht.",
    fixedDayActionCloseDescription:
      "Dadurch wird der fixe Tag sofort veröffentlicht und weitere Änderungen werden gestoppt.",
    fixedDayActionUpdateDescription:
      "Dadurch wird dieser Tag sofort als neuer fixer Tag veröffentlicht.",
    fixedDayActionSelectedDescription:
      "Dieser Tag ist bereits als fixer Tag veröffentlicht.",
    reopenEvent: "Event wieder öffnen",
    reopenEventConfirmTitle: "Dieses Event wieder öffnen?",
    reopenEventConfirmDescription:
      "Teilnehmende können ihre Verfügbarkeit danach wieder bearbeiten und der veröffentlichte feste Termin wird entfernt.",
    reopenEventConfirmAction: "Wieder öffnen und fixen Termin entfernen",
    closeRequiresFixedDate:
      "Wähle ein fixes Datum aus, bevor du dieses Event schließt.",
    closeRequiresFixedDateInHeatmap:
      "Wähle in der Heatmap ein fixes Datum aus, bevor du dieses Event schließt.",
    closedHeatmapDescription:
      "Klicke auf einen Slot, um die Verfügbarkeit zu prüfen und den veröffentlichten fixen Termin zu aktualisieren.",
    closedFullDayDescription:
      "Wähle einen Tag aus, um die Verfügbarkeit zu prüfen und den veröffentlichten fixen Tag zu aktualisieren.",
    closedHeatmapDescriptionWindowed:
      "Wähle einen Slot aus, um die Überschneidung zu prüfen, und aktualisiere den fixen Termin darunter. Mit den Pfeilen bewegst du dich durch den Datumsbereich.",
    openHeatmapDescription:
      "Klicke auf einen Slot, um die Verfügbarkeit zu prüfen und das Event über die Slot-Aktion zu schließen.",
    openFullDayDescription:
      "Wähle einen Tag aus, um die Verfügbarkeit zu prüfen und das Event über die Tagesaktion zu schließen.",
    openHeatmapDescriptionWindowed:
      "Wähle einen Slot aus, um die Verfügbarkeit zu prüfen und das Event über die Slot-Aktion zu schließen. Mit den Pfeilen bewegst du dich durch den Datumsbereich.",
    peopleAvailable: {
      one: "{count} Person verfügbar",
      other: "{count} Personen verfügbar",
    },
  },
  recentEvents: {
    eyebrow: "Letzte Events",
    title: "Boards öffnen, die du bereits besucht hast",
    description:
      "Nur in diesem Browser gespeichert. Organizer-Links sind als privat markiert.",
    clearAll: "Alle löschen",
    emptyTitle: "Noch keine letzten Events",
    emptyDescription:
      "Öffne ein öffentliches Board oder eine Organizer-Seite, dann erscheint es hier für den schnellen Zugriff.",
    lastOpened: "Zuletzt geöffnet {timestamp}",
    devSeed: "Dev-Seed",
    devSeedDescription:
      "Wird angezeigt, weil der Dev-Modus aktiv ist. Dieser Eintrag ist nicht in deinem Browser-Verlauf gespeichert.",
    privateLinkSaved: "Privater Link gespeichert",
    openPublic: "Board öffnen",
    openOrganizer: "Event verwalten",
    remove: "Entfernen",
  },
  devDatabase: {
    eyebrow: "Entwicklung",
    title: "Datenbankstatus",
    description:
      "Prüfe, ob diese lokale Dev-Instanz Postgres erreicht, ohne das Datenbankpasswort offenzulegen.",
    connected: "Verbunden",
    failed: "Fehlgeschlagen",
    connectionDetails: "Verbindungsdetails",
    connectionHealthy: "Die Datenbank hat eine Live-Abfrage erfolgreich beantwortet.",
    connectionFailed: "Die Prüfung der Datenbankverbindung ist fehlgeschlagen.",
    labels: {
      target: "Verbindungsziel",
      latency: "Latenz",
      database: "Datenbank",
      user: "Benutzer",
      schema: "Schema",
      postgresVersion: "Postgres-Version",
      error: "Fehler",
    },
  },
  notFound: {
    eyebrow: "Nicht gefunden",
    title: "Dieses Planungsboard existiert nicht.",
    description:
      "Der Link ist möglicherweise unvollständig, abgelaufen oder bereits entfernt. Du kannst jederzeit ein neues Board erstellen und von vorn starten.",
    action: "Neues Event erstellen",
  },
  setupPage: {
    badge: "Erstes Setup",
    title: "{appName} vor dem Go-live konfigurieren.",
    description:
      "Dieser Wizard hält alles lokal in deinem Browser und erzeugt die nicht geheimen App-Konfigurationen, die du in Coolify oder in deine Server-Umgebung übernehmen kannst.",
    overviewTitle: "Was dieses Setup abdeckt",
    overviewDescription:
      "App-Identität, Hinweise zur gebündelten Infrastruktur, Betreiberangaben, österreichische Pflichtangaben und Datenschutz-/Hosting-Informationen.",
    overviewItems: {
      appConfig: "Erzeuge einen App-Konfigurationsblock mit `APP_SETUP_COMPLETE=true`.",
      secrets:
        "Belasse Datenbank-Geheimnisse in Coolify. Der Browser-Wizard zeigt sie nie an.",
      redeploy:
        "Starte danach neu oder deploye erneut, damit die normale App verfügbar wird.",
    },
  },
  setupWizard: {
    steps: [
      "App-Grundlagen",
      "Infrastruktur",
      "Betreiberangaben",
      "Rechtliches und Datenschutz",
      "Prüfen und exportieren",
    ],
    setupStepsTitle: "Setup-Schritte",
    setupStepsDescription:
      "Dieser Wizard erzeugt die nicht geheimen App-Konfigurationen für dein Self-Hosting-Deployment.",
    fillFieldsDescription:
      "Fülle die Felder unten aus. Alle Werte bleiben in deinem Browser, bis du den erzeugten App-Konfigurationsblock kopierst.",
    stepProgress: "Schritt {current} von {total}",
    copiedAppConfig: "App-Konfiguration kopiert",
    appName: "App-Name",
    publicAppUrl: "Öffentliche App-URL",
    defaultLanguage: "Standardsprache",
    infrastructure: {
      title: "Gebündelte Postgres-Infrastruktur",
      description:
        "tempoll nutzt den gebündelten Postgres-Dienst aus dem Docker-Compose-Stack. Das Datenbankpasswort wird von Coolify verwaltet und in diesem Browser-Wizard weder eingegeben noch angezeigt oder exportiert. Bei einem frischen Stack erzeugt Coolify das Passwort vor der ersten Postgres-Initialisierung automatisch.",
      databaseName: "Datenbankname",
      databaseUser: "Datenbankbenutzer",
      generatedPassword: "Generiertes Passwort",
      keepInCoolifyPrefix:
        "Belasse diese Infrastruktur-Variablen in Coolify. Dieser Setup-Wizard exportiert nur nicht geheime App- und Rechtskonfigurationen, und der Docker-Compose-Stack leitet",
      keepInCoolifySuffix: "intern ab.",
      volumeWarningPrefix:
        "Wenn bereits ein persistentes Postgres-Volume existiert, stelle sicher, dass",
      volumeWarningSuffix:
        "vor dem erneuten Deployment zum aktuellen Live-Datenbankpasswort passt.",
    },
    operator: {
      legalPages: "Rechtliche Seiten",
      legalPagesDescription:
        "Lass Impressum und Datenschutz deaktiviert, wenn du rechtliche Details nicht direkt auf der Website veröffentlichen möchtest. Sensible Angaben kannst du weiterhin auf Anfrage teilen.",
      disabled: "Deaktiviert",
      enabled: "Aktiviert",
      legalName: "Rechtlicher Name",
      displayName: "Anzeigename",
      streetAddress: "Straße und Hausnummer",
      postalCode: "Postleitzahl",
      city: "Stadt",
      country: "Land",
      contactEmail: "Kontakt-E-Mail",
      phone: "Telefon",
      website: "Website",
      detailsOptional:
        "Rechtliche Seiten sind aktuell deaktiviert. Alle Angaben in diesem Schritt sind optional und können leer bleiben.",
    },
    privacy: {
      optionalDescription:
        "Alles in diesem Schritt ist optional. Wenn du Felder leer lässt, lassen die öffentlichen Rechtsseiten sie weg oder verwenden einen allgemeinen Hinweis wie „auf Anfrage erhältlich“.",
      businessPurpose: "Unternehmensgegenstand",
      mediaOwner: "Medieninhaber:in",
      editorialLine: "Blattlinie",
      privacyContactEmail: "Datenschutz-Kontakt-E-Mail",
      hostingDescription: "Hosting-Beschreibung",
      processors: "Auftragsverarbeiter / Infrastrukturpartner",
      leaveEmptyToReuse:
        "Leer lassen, um die allgemeine Kontakt-E-Mail wiederzuverwenden",
    },
    review: {
      descriptionPrefix:
        "Kopiere diese App-Konfiguration nach Coolify, lasse die Infrastruktur-Datenbankvariablen unverändert und deploye die App erneut. Danach verschwindet der Setup-Wizard automatisch.",
      descriptionEnabled: " Impressum und Datenschutzseiten sind aktiviert.",
      descriptionDisabled:
        " Impressum und Datenschutzseiten bleiben deaktiviert, bis du sie aktivierst.",
      exportWarningPrefix: "Dieser Export enthält bewusst weder",
      exportWarningMiddle: "noch irgendein Datenbankpasswort. Belasse",
      exportWarningSuffix: "weiterhin separat in Coolify.",
      generatedAppConfig: "Erzeugte App-Konfiguration",
      copyEnv: ".env kopieren",
    },
    placeholders: {
      appUrl: "https://meet.example.com",
      website: "https://example.com",
      businessPurpose: "Betrieb einer selbst gehosteten Scheduling-Webanwendung.",
      editorialLine:
        "Informationen zum Softwareprojekt und zu Planungsboards, die über diesen Dienst betrieben werden.",
      hostingDescription:
        "Self-hosted über Coolify auf Infrastruktur der verantwortlichen Stelle und ausgewählter Hosting-Provider.",
      processors: "Ein Eintrag pro Zeile, z. B.\nCoolify\nHetzner\nCloudflare",
    },
  },
  imprint: {
    eyebrow: "Rechtliches",
    title: "Impressum",
    description:
      "Diese Seite enthält die Betreiberangaben für {appName}. Die Struktur ist für österreichische Self-Hosting-Deployments vorbereitet und sollte vor dem Produktiveinsatz geprüft werden.",
    providerInformation: "Angaben zum Diensteanbieter",
    providerInformationDescription:
      "Informationen gemäß den österreichischen Offenlegungsvorschriften für Websites.",
    labels: {
      legalName: "Rechtlicher Name",
      displayName: "Anzeigename",
      address: "Adresse",
      email: "E-Mail",
      phone: "Telefon",
      website: "Website",
      businessPurpose: "Unternehmensgegenstand",
      mediaOwner: "Medieninhaber:in",
      editorialLine: "Blattlinie",
    },
    availableOnRequest: "Auf Anfrage erhältlich",
    addressOnRequest:
      "Hier nicht veröffentlicht. Adressdaten können auf Anfrage bereitgestellt werden.",
    contactOnRequest:
      "Hier nicht veröffentlicht. Kontaktdaten können auf Anfrage bereitgestellt werden.",
    defaultBusinessPurpose: "Betrieb eines selbst gehosteten Scheduling-Dienstes.",
    mediaOwnerAndEditorialLine: "Medieninhaber:in und Blattlinie",
    mediaOwnerAndEditorialLineDescription:
      "Offenlegung für Inhalte mit Informationscharakter auf dieser Website.",
    mediaOwnerOnRequest: "Auf Anfrage erhältlich.",
    editorialLineDefault:
      "Projektinformationen und betriebliche Details zu diesem Scheduling-Dienst.",
    hostingNotice: "Hosting-Hinweis",
    hostingNoticeDescription:
      "Hinweis dazu, wie dieser Dienst technisch bereitgestellt wird.",
    hostingOnRequest:
      "Hosting-Details werden hier nicht veröffentlicht und können auf Anfrage bereitgestellt werden.",
  },
  privacy: {
    eyebrow: "Rechtliches",
    title: "Datenschutz",
    description:
      "Diese Datenschutzerklärung erläutert, wie personenbezogene Daten verarbeitet werden, wenn du {appName} nutzt. Sie ist für einen österreichisch betriebenen, selbst gehosteten Dienst formuliert.",
    controller: "Verantwortliche Stelle",
    whatDataIsProcessed: "Welche Daten verarbeitet werden",
    whatDataIsProcessedDescription:
      "Der Dienst ist bewusst schlank gehalten, benötigt keine Benutzerkonten und verzichtet auf Werbetechnologien.",
    purposesAndLegalBases: "Zwecke und Rechtsgrundlagen",
    cookiesAndLocalStorage: "Cookies und lokaler Speicher",
    recipientsAndHosting: "Empfänger und Hosting",
    retentionPeriods: "Speicherdauer",
    yourRights: "Deine Rechte",
    defaults: {
      processors:
        "Es sind keine separaten Auftragsverarbeiter über die direkte Infrastruktur der verantwortlichen Stelle hinaus aufgeführt.",
      controllerName: "Die in der Serverkonfiguration benannte verantwortliche Stelle",
      generalContact:
        "Hier ist keine öffentliche E-Mail-Adresse veröffentlicht. Kontaktdaten können auf Anfrage bereitgestellt werden.",
      privacyContact:
        "Hier ist keine separate öffentliche Datenschutz-Kontaktadresse veröffentlicht.",
      hostingOnRequest:
        "Hosting-Details werden hier nicht veröffentlicht und können auf Anfrage bereitgestellt werden.",
    },
    controllerParagraphWithAddress:
      "Verantwortlich für diese Website und diesen Dienst ist {name}, {address}.",
    controllerParagraphWithoutAddress:
      "Verantwortlich für diese Website und diesen Dienst ist {name}. Adressdaten können auf Anfrage bereitgestellt werden.",
    contactParagraph:
      "Allgemeiner Kontakt: {generalContact}. Datenschutzspezifischer Kontakt: {privacyContact}",
    processedDataItems: {
      displayNames:
        "Angegebene Anzeigenamen von Teilnehmenden beim Beitritt zu einem Planungsboard.",
      selections:
        "Verfügbarkeitsauswahlen für die Datums- und Zeit-Slots eines Boards.",
      sessions:
        "Technische Sitzungsdaten, die nötig sind, um eine Bearbeitungssitzung für Teilnehmende aktiv zu halten.",
      recentEvents:
        "Browser-lokale Historie zuletzt besuchter Events, die per localStorage auf deinem eigenen Gerät gespeichert wird.",
      requestMetadata:
        "Request-Metadaten, IP-Adressen und Server-Logs, die für einen sicheren Betrieb erforderlich sind.",
      databaseRecords:
        "Datenbankeinträge, die für Events, Organizer-Links und Live-Updates benötigt werden.",
    },
    purposesParagraph1:
      "Personenbezogene Daten werden verarbeitet, um den Scheduling-Dienst bereitzustellen, Events verfügbar zu halten, die Anwendung vor Missbrauch zu schützen und die Hosting-Umgebung zu betreiben.",
    purposesParagraph2:
      "Je nach Kontext erfolgt die Verarbeitung auf Grundlage von Art. 6 Abs. 1 lit. b DSGVO, soweit Daten zur Bereitstellung des angeforderten Dienstes erforderlich sind, sowie auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO, soweit die Verarbeitung für den sicheren technischen Betrieb, die Missbrauchsprävention und die Wahrung der Dienstintegrität notwendig ist.",
    cookiesParagraph1:
      "Die Anwendung verwendet ausschließlich technisch notwendige Browser-Speichermechanismen. Dazu gehören ein Sitzungscookie oder eine vergleichbare Token-Verwaltung für die Bearbeitung von Verfügbarkeiten sowie lokaler Browser-Speicher für die optionale Liste zuletzt besuchter Events auf der Startseite.",
    cookiesParagraph2:
      "Es werden keine Werbe- oder sonstigen Drittanbieter-Marketing-Tracker eingesetzt. Falls optional datenschutzfreundliche Analytics vom Betreiber aktiviert werden, dienen sie ausschließlich der Nutzungsanalyse des Produkts.",
    retentionParagraph1:
      "Event-Daten werden so lange gespeichert, wie die verantwortliche Stelle die jeweiligen Planungsboards verfügbar hält. Request-Logs und betriebliche Protokolle werden nur so lange aufbewahrt, wie sie für Sicherheit, Diagnose und Infrastrukturverwaltung benötigt werden.",
    retentionParagraph2:
      "Die browser-lokale Historie zuletzt besuchter Events bleibt auf deinem eigenen Gerät gespeichert, bis du sie entfernst oder deinen Browser-Speicher löschst.",
    rightsParagraph1:
      "Vorbehaltlich der jeweils geltenden gesetzlichen Voraussetzungen hast du das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch.",
    rightsParagraph2:
      "Außerdem hast du das Recht, dich bei der österreichischen Datenschutzbehörde zu beschweren, wenn du der Ansicht bist, dass deine Daten entgegen dem Datenschutzrecht verarbeitet werden.",
  },
  errors: {
    appSetupIncomplete:
      "Das App-Setup ist noch nicht abgeschlossen. Öffne /setup, um die Umgebungskonfiguration zu erzeugen.",
    routeFallbacks: {
      createEvent: "Event konnte nicht erstellt werden.",
      joinEvent: "Beitritt zum Event nicht möglich.",
      saveAvailability: "Verfügbarkeit konnte nicht gespeichert werden.",
      updateEvent: "Event konnte nicht aktualisiert werden.",
      removeParticipant: "Teilnehmende Person konnte nicht entfernt werden.",
      eventStream: "Der Live-Event-Stream konnte nicht geöffnet werden.",
      eventNotFound: "Event nicht gefunden.",
      eventStreamNotFound: "Nicht gefunden",
    },
    app: {
      eventNotFound: "Event nicht gefunden.",
      eventClosed: "Dieses Event ist geschlossen.",
      participantNameTaken:
        "Dieser Name ist für dieses Event bereits vergeben.",
      participantSessionMissing:
        "Deine Bearbeitungssitzung ist nicht mehr gültig. Öffne deinen Teilnehmer-Link erneut oder tritt dem Event noch einmal bei.",
      participantNotFound: "Teilnehmende Person nicht gefunden.",
      invalidSlots:
        "Mindestens ein ausgewählter Slot liegt außerhalb des Event-Zeitfensters.",
      manageKeyInvalid: "Event nicht gefunden.",
      finalSlotRequired:
        "Wähle ein fixes Datum aus, bevor du dieses Event schließt.",
      finalSlotInvalid:
        "Wähle ein gültiges fixes Datum, das zur gesamten Meeting-Dauer passt.",
      notificationDeliveryUnavailable:
        "E-Mail-Benachrichtigungen sind auf diesem Host nicht verfügbar.",
    },
    rateLimit: {
      eventCreate:
        "Zu viele Versuche, ein Event zu erstellen. Bitte warte ein paar Minuten und versuche es erneut.",
      joinEvent:
        "Zu viele Beitrittsversuche. Bitte warte ein paar Minuten und versuche es erneut.",
      availabilityIp:
        "Zu viele Verfügbarkeits-Updates aus diesem Netzwerk. Bitte warte kurz und versuche es erneut.",
      availabilitySession:
        "Zu viele Verfügbarkeits-Updates in kurzer Zeit. Bitte gehe einen Moment langsamer vor.",
      organizerActions:
        "Zu viele Organizer-Aktionen. Bitte warte kurz und versuche es erneut.",
      eventStream:
        "Zu viele Event-Stream-Verbindungen. Bitte warte kurz und versuche es erneut.",
      eventStreamConcurrency:
        "Zu viele gleichzeitige Live-Streams aus diesem Netzwerk. Schließe einen anderen Tab und versuche es erneut.",
    },
  },
  validation: {
    eventCreate: {
      titleMin: "Der Event-Titel muss mindestens 3 Zeichen lang sein.",
      titleMax: "Der Event-Titel darf höchstens 80 Zeichen lang sein.",
      timezoneRequired: "Bitte wähle eine Zeitzone.",
      validCalendarDates: "Bitte wähle gültige Kalenderdaten.",
      chooseStartAndEndDate: "Bitte wähle ein Start- und Enddatum.",
      dateRangeMax: "Events mit Zeit-Slots können höchstens 31 Tage enthalten.",
      fullDayDateRangeMax: "Ganztägige Events können höchstens 366 Tage enthalten.",
      validDailyStart: "Bitte wähle eine gültige Startzeit.",
      validDailyEnd: "Bitte wähle eine gültige Endzeit.",
      supportedSlotSize: "Bitte wähle eine unterstützte Slot-Größe.",
      supportedMeetingDuration: "Bitte wähle eine unterstützte Meeting-Dauer.",
      endAfterStart: "Die Endzeit muss nach der Startzeit liegen.",
      durationMatchesSlot: "Die Meeting-Dauer muss zur Slot-Größe passen.",
      dateRangeRequired: "Bitte wähle Start- und Enddatum für das Event.",
      weekdayRequired:
        "Wähle mindestens einen verfügbaren Wochentag innerhalb des Datumsbereichs.",
    },
    participantCreate: {
      nameMin: "Bitte gib einen Namen mit mindestens 2 Zeichen ein.",
      nameMax: "Bitte verwende höchstens 32 Zeichen für den Namen.",
    },
    setup: {
      required: "Dieses Feld ist erforderlich.",
      fullUrl: "Bitte verwende eine vollständige URL inklusive http:// oder https://.",
      validEmail: "Bitte verwende eine gültige E-Mail-Adresse.",
      validLocale: "Bitte wähle eine unterstützte Standardsprache.",
    },
  },
};

export const messagesByLocale: Record<AppLocale, Messages> = {
  de,
  en,
};

export function getMessages(locale: AppLocale) {
  return messagesByLocale[locale];
}
