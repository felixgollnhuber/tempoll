import type { AppLocale } from "@/lib/i18n/locale";

export const en = {
  metadata: {
    description: "A modern, self-hosted When2Meet alternative built with Next.js.",
    homeTitle: "Home",
    newEventTitle: "New event",
    setupTitle: "Setup",
    imprintTitle: "Imprint",
    privacyTitle: "Privacy",
    notFoundTitle: "Not found",
    manageTitle: "Manage event",
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
    addToCalendar: "Add to calendar (.ics)",
    setFixedDate: "Set fixed date",
    clearFixedDate: "Clear fixed date",
    fixedDateSelected: "Fixed date selected",
    option: "Option {count}",
    and: "and",
    yes: "Yes",
    no: "No",
  },
  appChrome: {
    newEvent: "New event",
    newEventCompact: "New",
    recentEvents: "Recent events",
    recentEventsCompact: "Recent",
    footerDescription:
      "{appName} is a self-hostable, realtime scheduling board for modern teams.",
    featureRequest: "Feature request or suggestion",
    imprint: "Imprint",
    privacy: "Privacy",
  },
  home: {
    badge: "Self-hosted, realtime, account-free",
    title: "The clearer alternative to When2Meet.",
    description:
      "Create an event, share the link, and let people paint their availability on a live heatmap. The organizer gets a private manage page and everyone else can join with just a name.",
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
        title: "Designed for async collaboration",
        description:
          "Participants can join in seconds, paint over their free time, and see the shared shape emerge in real time.",
      },
      selfHosting: {
        title: "Built for self-hosting",
        description:
          "Prisma, Postgres and a Docker or Coolify deployment path keep the stack operationally simple and fully yours.",
      },
      modernTeams: {
        title: "Made for modern teams",
        description:
          "Clear hierarchy, strong mobile behavior and ranked time windows keep the decision process compact.",
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
      "Set one date range, choose the daily window, and share a single link. Every day inside the selected range will appear on the availability grid.",
    titleLabel: "Event title",
    titlePlaceholder: "Design review, sprint planning, dinner with friends...",
    timezoneLabel: "Timezone",
    timezonePlaceholder: "Pick a timezone",
    dateRangeLabel: "Date range",
    dateRangePlaceholder: "Choose a start and end date",
    dateRangeOpenTitle: "Choose event range",
    dateRangeOpenDescription: "Weeks start on Monday. The whole interval will be shown.",
    dailyStartLabel: "Daily start",
    dailyStartPlaceholder: "Pick a start time",
    dailyEndLabel: "Daily end",
    dailyEndPlaceholder: "Pick an end time",
    slotSizeLabel: "Slot size",
    slotSizePlaceholder: "Choose slot size",
    meetingDurationLabel: "Meeting duration",
    meetingDurationPlaceholder: "Choose duration",
    createButton: "Create event",
    genericSettingsError: "Please check your event settings.",
    createFailed: "Unable to create the event.",
    created: "Event created",
    previewTitle: "Preview",
    previewDescription: "This is the shape your event will have before anyone joins.",
    untitledEvent: "Untitled event",
    previewFields: {
      dateRange: "Date range",
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
        "A live availability grid that fills every day between the chosen start and end date.",
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
    participantsSummary: {
      one: "{count} participant",
      other: "{count} participants",
    },
    timesShownIn: "Times shown in {timezone}",
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
    participantHighlighting: "Highlighting",
    joinTitle: "Join this board",
    joinDescription: "Enter your name to start selecting the times that work for you.",
    yourNameLabel: "Your name",
    yourNamePlaceholder: "Alex, Nora, Product team...",
    joinButton: "Join event",
    joined: "You joined the event",
    availabilityTitle: "Availability",
    availabilityDescriptionEditWindowed:
      "Tap or drag to paint your availability. Use the arrows to move day by day.",
    availabilityDescriptionEdit:
      "Click or drag across the grid to paint your availability while keeping the team heatmap in view.",
    availabilityDescriptionViewWindowed:
      "Select a slot to inspect availability. Use the arrows to move through the date range.",
    availabilityDescriptionView:
      "Click any slot to see who is available and who is not.",
    editMode: "Edit",
    viewMode: "View",
    showPreviousDays: "Show previous days",
    showNextDays: "Show next days",
    dayWindowSummary: "Days {start} - {end} of {total}",
    availableCountTitle:
      "{date} {time} · {available}/{total} available · {names}",
    nobodyAvailableTitle: "{date} {time} · nobody available",
    slotDetailsTitle: "Slot details",
    slotDetailsSummary: "{date} · {time} · {available}/{total} available",
    slotDetailsPrompt: "Select a slot in the heatmap to inspect availability for that time.",
    available: "Available",
    unavailable: "Not available",
    nobodyAvailableInSlot: "Nobody is available in this slot.",
    everyoneAvailableHere: "Everyone with at least one selection is available here.",
    bestWindowsTitle: "Best matching windows",
    bestWindowsDescription:
      "Ranked by overlap across the full {duration}-minute meeting.",
    yourTimezone: "Your timezone: {label}",
    fixedDateDescription:
      "This event is closed and the organizer picked the final meeting slot.",
    participantsSidebarDescription:
      "Click a participant to highlight their availability on the grid.",
    finalSlotFits: "This slot fits the full {duration}-minute meeting.",
    finalSlotFitsDescription: "Pick it as the fixed date for the closed event.",
    finalSlotOutOfRange:
      "This start time does not fit the full {duration}-minute meeting inside the selected day window.",
    fullWindowFree: {
      one: "{count} participant free for the full window",
      other: "{count} participants free for the full window",
    },
  },
  manageEvent: {
    title: "Manage event",
    description:
      "Share the public board, keep the private organizer URL safe and control whether new changes are still allowed.",
    eventUpdated: "Event updated",
    participantRenamed: "Participant renamed",
    participantRemoved: "Participant removed",
    titleLabel: "Title",
    statusLabel: "Status",
    statusOpen: "Open for edits",
    statusClosed: "Closed",
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
    bestWindowsTitle: "Best windows right now",
    fixedDatePublishedDescription:
      "This is the published fixed date for the closed event.",
    fixedDateDraftDescription:
      "This fixed date is selected locally and will be published after saving.",
    closeRequiresFixedDate: "Pick a fixed date before closing this event.",
    closeRequiresFixedDateInHeatmap:
      "Pick a fixed date in the heatmap before closing this event.",
    closedHeatmapDescription:
      "Click any slot to inspect availability and set the fixed date for this closed event.",
    closedHeatmapDescriptionWindowed:
      "Select a slot to inspect overlap and use the button below to set the fixed date. Use the arrows to move through the date range.",
    openHeatmapDescription:
      "Click any slot to inspect availability. Close the event when you are ready to choose the fixed date.",
    openHeatmapDescriptionWindowed:
      "Select a slot to inspect availability. Close the event to choose the fixed date.",
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
    privateLinkSaved: "Private link saved",
    openPublic: "Open board",
    openOrganizer: "Manage event",
    remove: "Remove",
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
      "The service is intentionally small and avoids account creation or marketing tracking.",
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
      "No analytics, advertising, or other non-essential tracking technologies are included in the current version of the app.",
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
      dateRangeMax: "Choose a date range of up to 31 days.",
      validDailyStart: "Choose a valid daily start time.",
      validDailyEnd: "Choose a valid daily end time.",
      supportedSlotSize: "Select a supported slot size.",
      supportedMeetingDuration: "Select a supported meeting duration.",
      endAfterStart: "End time must be later than start time.",
      durationMatchesSlot: "Meeting duration must align with slot size.",
      dateRangeRequired: "Choose a start and end date for the event.",
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
    description: "Eine moderne, selbst gehostete When2Meet-Alternative auf Basis von Next.js.",
    homeTitle: "Startseite",
    newEventTitle: "Neues Event",
    setupTitle: "Setup",
    imprintTitle: "Impressum",
    privacyTitle: "Datenschutz",
    notFoundTitle: "Nicht gefunden",
    manageTitle: "Event verwalten",
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
    addToCalendar: "Zum Kalender hinzufügen (.ics)",
    setFixedDate: "Fixen Termin setzen",
    clearFixedDate: "Fixen Termin entfernen",
    fixedDateSelected: "Fixer Termin ausgewählt",
    option: "Option {count}",
    and: "und",
    yes: "Ja",
    no: "Nein",
  },
  appChrome: {
    newEvent: "Neues Event",
    newEventCompact: "Neu",
    recentEvents: "Letzte Events",
    recentEventsCompact: "Events",
    footerDescription:
      "{appName} ist ein selbst hostbares Echtzeit-Planungsboard für moderne Teams.",
    featureRequest: "Feature-Wunsch oder Vorschlag",
    imprint: "Impressum",
    privacy: "Datenschutz",
  },
  home: {
    badge: "Self-hosted, in Echtzeit, ohne Konto",
    title: "Die übersichtliche Alternative zu When2Meet.",
    description:
      "Erstelle ein Event, teile den Link und lass alle ihre Verfügbarkeit direkt auf einer Live-Heatmap markieren. Die organisierende Person erhält eine private Verwaltungsseite, alle anderen steigen nur mit einem Namen ein.",
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
        title: "Für asynchrone Zusammenarbeit gebaut",
        description:
          "Teilnehmende können in Sekunden beitreten, freie Zeiten markieren und live sehen, wie sich die gemeinsame Verfügbarkeit entwickelt.",
      },
      selfHosting: {
        title: "Für Self-Hosting gemacht",
        description:
          "Prisma, Postgres sowie Deployment über Docker oder Coolify halten den Stack operativ einfach und vollständig in deiner Hand.",
      },
      modernTeams: {
        title: "Für moderne Teams gemacht",
        description:
          "Klare Hierarchie, gutes mobiles Verhalten und gerankte Zeitfenster halten die Entscheidungsfindung kompakt.",
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
      "Lege einen Datumsbereich fest, wähle das tägliche Zeitfenster und teile anschließend einen einzigen Link. Jeder Tag im ausgewählten Bereich erscheint im Verfügbarkeitsraster.",
    titleLabel: "Event-Titel",
    titlePlaceholder: "Design-Review, Sprint-Planung, Abendessen mit Freund:innen...",
    timezoneLabel: "Zeitzone",
    timezonePlaceholder: "Zeitzone wählen",
    dateRangeLabel: "Datumsbereich",
    dateRangePlaceholder: "Start- und Enddatum wählen",
    dateRangeOpenTitle: "Event-Bereich wählen",
    dateRangeOpenDescription: "Wochen beginnen am Montag. Das gesamte Intervall wird angezeigt.",
    dailyStartLabel: "Tagesbeginn",
    dailyStartPlaceholder: "Startzeit wählen",
    dailyEndLabel: "Tagesende",
    dailyEndPlaceholder: "Endzeit wählen",
    slotSizeLabel: "Slot-Größe",
    slotSizePlaceholder: "Slot-Größe wählen",
    meetingDurationLabel: "Meeting-Dauer",
    meetingDurationPlaceholder: "Dauer wählen",
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
        "Ein Live-Verfügbarkeitsraster für jeden Tag zwischen dem gewählten Start- und Enddatum.",
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
    participantsSummary: {
      one: "{count} teilnehmende Person",
      other: "{count} Teilnehmende",
    },
    timesShownIn: "Zeiten angezeigt in {timezone}",
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
    participantHighlighting: "Hervorgehoben",
    joinTitle: "Diesem Board beitreten",
    joinDescription:
      "Gib deinen Namen ein, um die Zeiten zu markieren, die für dich passen.",
    yourNameLabel: "Dein Name",
    yourNamePlaceholder: "Alex, Nora, Produktteam...",
    joinButton: "Event beitreten",
    joined: "Du bist dem Event beigetreten",
    availabilityTitle: "Verfügbarkeit",
    availabilityDescriptionEditWindowed:
      "Tippe oder ziehe, um deine Verfügbarkeit zu markieren. Mit den Pfeilen bewegst du dich tageweise weiter.",
    availabilityDescriptionEdit:
      "Klicke oder ziehe über das Raster, um deine Verfügbarkeit zu markieren und gleichzeitig die Team-Heatmap im Blick zu behalten.",
    availabilityDescriptionViewWindowed:
      "Wähle einen Slot aus, um die Verfügbarkeit zu prüfen. Mit den Pfeilen bewegst du dich durch den Datumsbereich.",
    availabilityDescriptionView:
      "Klicke auf einen beliebigen Slot, um zu sehen, wer verfügbar ist und wer nicht.",
    editMode: "Bearbeiten",
    viewMode: "Ansehen",
    showPreviousDays: "Vorherige Tage anzeigen",
    showNextDays: "Nächste Tage anzeigen",
    dayWindowSummary: "Tage {start} - {end} von {total}",
    availableCountTitle:
      "{date} {time} · {available}/{total} verfügbar · {names}",
    nobodyAvailableTitle: "{date} {time} · niemand verfügbar",
    slotDetailsTitle: "Slot-Details",
    slotDetailsSummary: "{date} · {time} · {available}/{total} verfügbar",
    slotDetailsPrompt:
      "Wähle einen Slot in der Heatmap aus, um die Verfügbarkeit für diese Zeit zu prüfen.",
    available: "Verfügbar",
    unavailable: "Nicht verfügbar",
    nobodyAvailableInSlot: "In diesem Slot ist niemand verfügbar.",
    everyoneAvailableHere:
      "Hier sind alle verfügbar, die mindestens eine Auswahl getroffen haben.",
    bestWindowsTitle: "Beste passende Zeitfenster",
    bestWindowsDescription:
      "Gerankt nach Überschneidung über das gesamte {duration}-minütige Meeting.",
    yourTimezone: "Deine Zeitzone: {label}",
    fixedDateDescription:
      "Dieses Event ist geschlossen und die organisierende Person hat den finalen Meeting-Slot gewählt.",
    participantsSidebarDescription:
      "Klicke auf eine teilnehmende Person, um ihre Verfügbarkeit im Raster hervorzuheben.",
    finalSlotFits: "Dieser Slot passt zum gesamten {duration}-minütigen Meeting.",
    finalSlotFitsDescription:
      "Wähle ihn als fixes Datum für das geschlossene Event.",
    finalSlotOutOfRange:
      "Diese Startzeit passt innerhalb des gewählten Tagesfensters nicht zum gesamten {duration}-minütigen Meeting.",
    fullWindowFree: {
      one: "{count} Person ist im gesamten Zeitfenster frei",
      other: "{count} Personen sind im gesamten Zeitfenster frei",
    },
  },
  manageEvent: {
    title: "Event verwalten",
    description:
      "Teile das öffentliche Board, bewahre die private Organizer-URL sicher auf und steuere, ob weitere Änderungen noch erlaubt sind.",
    eventUpdated: "Event aktualisiert",
    participantRenamed: "Teilnehmende Person umbenannt",
    participantRemoved: "Teilnehmende Person entfernt",
    titleLabel: "Titel",
    statusLabel: "Status",
    statusOpen: "Für Änderungen geöffnet",
    statusClosed: "Geschlossen",
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
    bestWindowsTitle: "Beste Zeitfenster im Moment",
    fixedDatePublishedDescription:
      "Das ist der veröffentlichte feste Termin für das geschlossene Event.",
    fixedDateDraftDescription:
      "Dieser feste Termin ist lokal ausgewählt und wird nach dem Speichern veröffentlicht.",
    closeRequiresFixedDate:
      "Wähle ein fixes Datum aus, bevor du dieses Event schließt.",
    closeRequiresFixedDateInHeatmap:
      "Wähle in der Heatmap ein fixes Datum aus, bevor du dieses Event schließt.",
    closedHeatmapDescription:
      "Klicke auf einen beliebigen Slot, um die Verfügbarkeit zu prüfen und den fixen Termin für dieses geschlossene Event zu setzen.",
    closedHeatmapDescriptionWindowed:
      "Wähle einen Slot aus, um die Überschneidung zu prüfen, und nutze den Button darunter, um den fixen Termin zu setzen. Mit den Pfeilen bewegst du dich durch den Datumsbereich.",
    openHeatmapDescription:
      "Klicke auf einen beliebigen Slot, um die Verfügbarkeit zu prüfen. Schließe das Event, wenn du bereit bist, den fixen Termin auszuwählen.",
    openHeatmapDescriptionWindowed:
      "Wähle einen Slot aus, um die Verfügbarkeit zu prüfen. Schließe das Event, um den fixen Termin auszuwählen.",
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
    privateLinkSaved: "Privater Link gespeichert",
    openPublic: "Board öffnen",
    openOrganizer: "Event verwalten",
    remove: "Entfernen",
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
      "Der Dienst ist bewusst schlank gehalten und verzichtet auf Konten und Marketing-Tracking.",
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
      "In der aktuellen Version der App sind keine Analyse-, Werbe- oder sonstigen nicht erforderlichen Tracking-Technologien enthalten.",
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
      dateRangeMax: "Bitte wähle einen Datumsbereich mit höchstens 31 Tagen.",
      validDailyStart: "Bitte wähle eine gültige Startzeit.",
      validDailyEnd: "Bitte wähle eine gültige Endzeit.",
      supportedSlotSize: "Bitte wähle eine unterstützte Slot-Größe.",
      supportedMeetingDuration: "Bitte wähle eine unterstützte Meeting-Dauer.",
      endAfterStart: "Die Endzeit muss nach der Startzeit liegen.",
      durationMatchesSlot: "Die Meeting-Dauer muss zur Slot-Größe passen.",
      dateRangeRequired: "Bitte wähle Start- und Enddatum für das Event.",
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
