<p align="center">
  <img src="./.github/assets/tempoll-readme-hero.png" alt="tempoll.app" width="920" />
</p>

<h1 align="center">tempoll</h1>

<p align="center">
  An account-free, self-hosted When2Meet alternative for modern teams.
</p>

<p align="center">
  Create the board. Share the link. Find the overlap.
</p>

<p align="center">
  <a href="#quick-start"><strong>Quick start</strong></a>
  ·
  <a href="#how-tempoll-works"><strong>How it works</strong></a>
  ·
  <a href="#self-hosting"><strong>Self-hosting</strong></a>
  ·
  <a href="#configuration"><strong>Configuration</strong></a>
</p>

<p align="center">
  <a href="https://github.com/felixgollnhuber/tempoll/actions/workflows/ci.yml">
    <img src="https://img.shields.io/github/actions/workflow/status/felixgollnhuber/tempoll/ci.yml?branch=main&label=verify" alt="Verify workflow status" />
  </a>
  <a href="https://github.com/felixgollnhuber/tempoll/actions/workflows/security.yml">
    <img src="https://img.shields.io/github/actions/workflow/status/felixgollnhuber/tempoll/security.yml?branch=main&label=security" alt="Security workflow status" />
  </a>
  <img src="https://img.shields.io/badge/license-AGPL--3.0--only-black" alt="License: AGPL-3.0-only" />
  <img src="https://img.shields.io/badge/deploy-Docker%20Compose%20%2B%20Coolify-1f6feb" alt="Deploy with Docker Compose and Coolify" />
</p>

---

tempoll lets an organizer create a scheduling board, share one public link, and collect availability on a live heatmap. Participants join with just a name. The organizer gets a private manage URL to rename or remove participants and open or close the event.

> GitHub-ready for self-hosting with the included [`docker-compose.yaml`](./docker-compose.yaml) and a first-run setup flow built for Coolify.

The project is built for two audiences:

- operators who want to self-host a polished scheduling app with a simple Postgres stack
- maintainers who want a clean foundation for a hosted version without losing the product's current UX contract

## Highlights

- No required login. Public participants join with a name only.
- Private organizer management URL, separate from the public event URL.
- Realtime collaborative heatmap powered by Postgres `LISTEN/NOTIFY` and Server-Sent Events.
- Ranked best meeting windows based on shared overlap.
- Date-range based event creation. One range expands into concrete event dates internally.
- Browser-local recent events history, including private organizer links clearly marked as sensitive.
- First-run setup wizard that generates only non-secret app and legal env values.
- Optional legal pages rendered from environment variables.
- Docker Compose and Coolify ready.

## How tempoll works

1. Create an event with a title, timezone, one date range, a daily time window, slot size, and meeting duration.
2. tempoll expands the date range into actual dates and creates:
   - a public event URL
   - a private organizer manage URL
3. Participants open the public page, enter their name, and paint availability directly on the heatmap.
4. Everyone sees updates in real time.
5. The organizer uses the private manage page to share links, rename or remove participants, and close the board when scheduling is done.

## Stack

- `Next.js 16`
- `React 19`
- `Tailwind CSS 4`
- `shadcn/ui` and `Radix UI`
- `Prisma 7`
- `PostgreSQL 16`
- `pg` listener for realtime fan-out
- `Vitest` and `Testing Library`

## Quick Start

### Local development

Recommended local toolchain:

- Node.js 24+
- `pnpm`
- PostgreSQL 16

The local default database URL is:

```bash
postgresql://postgres:postgres@localhost:55432/tempoll?schema=public
```

That non-default `55432` port is intentional to avoid common Postgres collisions.

1. Copy the example env file:

```bash
cp .env.example .env
```
### Open-source safety notes

- `.env.example` and `.env.coolify.example` intentionally contain placeholders and local-only example values. Do not commit your real `.env`.
- Participant edit links are consumed server-side and immediately redirected to the canonical event URL, so raw participant tokens do not remain in the rendered page URL.
- Organizer links are bearer secrets. They are stored only in browser-local recent history and are visibly marked as private in the UI.
- Run `pnpm security:scan-secrets` and `pnpm security:audit` before publishing changes.

### Local Postgres example

2. Start a local Postgres instance however you prefer. Example with Docker:

```bash
docker run -d \
  --name tempoll-postgres \
  -e POSTGRES_DB=tempoll \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 55432:5432 \
  postgres:16
```

3. Install dependencies and start the app:

```bash
pnpm install
pnpm dev
```

4. Open [http://localhost:3000/setup](http://localhost:3000/setup).

By default, `.env.example` starts with `APP_SETUP_COMPLETE=false`, so normal routes redirect to `/setup`. That is expected.

5. Either:

- use the setup wizard to generate your non-secret app config and copy the values into `.env`, or
- edit `.env` manually if you already know your final configuration

6. Set `APP_SETUP_COMPLETE=true`, then apply migrations and restart the app:

```bash
pnpm prisma:migrate
pnpm dev
```

### Run the bundled Docker Compose stack

If you want a production-like local stack:

```bash
cp .env.coolify.example .env.coolify
export SERVICE_PASSWORD_TEMPOLL_DB=change-me
docker compose --env-file .env.coolify up -d --build
```

Then open `/setup`, copy the generated non-secret app config into your env file or deployment settings, switch `APP_SETUP_COMPLETE=true`, and redeploy or restart.

## Self-hosting

### Docker Compose

The repository ships with a root-level [`docker-compose.yaml`](./docker-compose.yaml) that defines:

- `app`
- `db`

The compose setup derives `DATABASE_URL` internally from:

- `TEMPOLL_DB_NAME`
- `TEMPOLL_DB_USER`
- `SERVICE_PASSWORD_TEMPOLL_DB`

Use [`.env.coolify.example`](./.env.coolify.example) as the operator-facing starting point. Do not ask operators to paste a full `DATABASE_URL` when they use the bundled database service.

### Coolify

tempoll targets Coolify via Docker Compose, not Nixpacks.

Recommended Coolify settings:

- Build Pack: `Docker Compose`
- Base Directory: `/`
- Assign your public domain to the `app` service
- Internal app port: `3000`

Suggested first deploy flow:

1. Add the repository as a Docker Compose application.
2. Seed the environment from [`.env.coolify.example`](./.env.coolify.example).
3. Keep `APP_SETUP_COMPLETE=false` for the first deploy.
4. Let Coolify generate `SERVICE_PASSWORD_TEMPOLL_DB` for a fresh stack.
5. Open `/setup` on the deployed app.
6. Copy only the generated non-secret app config values into Coolify.
7. Set `APP_SETUP_COMPLETE=true`.
8. Redeploy.

Important operational note:

- Postgres credentials only initialize a fresh volume.
- If you already have a persistent database volume, `SERVICE_PASSWORD_TEMPOLL_DB` must match the current live password before redeploying.
- If credentials drift, either align env vars with the existing database or reset the database volume deliberately.

Health checks stay available at `/api/health`, even while setup is incomplete.

## Configuration

### Core variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `APP_SETUP_COMPLETE` | Yes | Gates the whole app. Only the setup wizard and `/api/health` stay open when this is not exactly `true`. |
| `APP_NAME` | Yes | Product name shown in the UI. Defaults to `tempoll`. |
| `APP_URL` | Yes | Canonical public base URL used for generated links. |
| `LEGAL_PAGES_ENABLED` | No | Enables `/imprint` and `/privacy`. Defaults to `false`. |
| `DATAFAST_WEBSITE_ID` | No | Enables optional DataFast tracking when set together with `DATAFAST_DOMAIN`. |
| `DATAFAST_DOMAIN` | No | Domain sent to DataFast when optional tracking is enabled. |
| `DATABASE_URL` | Local dev or external DB only | Direct database connection string. |
| `TEMPOLL_DB_NAME` | Compose/Coolify | Bundled Postgres database name. |
| `TEMPOLL_DB_USER` | Compose/Coolify | Bundled Postgres database user. |
| `SERVICE_PASSWORD_TEMPOLL_DB` | Compose/Coolify | Bundled Postgres password secret. Use an underscore, not a hyphen. |

### Optional DataFast analytics (cookieless)

DataFast tracking is disabled by default. It is enabled only when **both** variables are set:

```env
DATAFAST_WEBSITE_ID=dfid_8DiCXWOXKydljn0usEGZE
DATAFAST_DOMAIN=tempoll.app
```

Implementation details in this repository:

- Script source: `https://datafa.st/js/script.cookieless.js`
- Loaded globally from the root layout via `next/script` (`afterInteractive`)
- Event endpoint proxied through `POST /api/datafast/events`
- Organizer routes (`/manage/[token]`) are filtered and not forwarded to DataFast
- CSP already allows `https://datafa.st` in `script-src` and `connect-src`

### Optional legal and privacy variables

These fields are intentionally optional:

- `OPERATOR_LEGAL_NAME`
- `OPERATOR_DISPLAY_NAME`
- `OPERATOR_STREET_ADDRESS`
- `OPERATOR_POSTAL_CODE`
- `OPERATOR_CITY`
- `OPERATOR_COUNTRY`
- `OPERATOR_EMAIL`
- `OPERATOR_PHONE`
- `OPERATOR_WEBSITE`
- `OPERATOR_BUSINESS_PURPOSE`
- `MEDIA_OWNER`
- `EDITORIAL_LINE`
- `PRIVACY_CONTACT_EMAIL`
- `HOSTING_DESCRIPTION`
- `PRIVACY_PROCESSORS`

If legal pages are enabled and some of these fields are empty, tempoll falls back to softer wording such as "available on request" instead of hard-failing.

### Setup wizard rules

The setup wizard is deliberately narrow in scope:

- it generates app and legal config only
- it does not write files on the server
- it never renders or exports `DATABASE_URL`
- it never asks for database passwords in the browser
- it treats infrastructure as informational only

## Product model

tempoll's current UX is intentionally opinionated:

- public flow: organizer creates an event, participants join with only a name, availability is edited directly on the heatmap
- organizer flow: private manage URL, no mandatory account system
- calendar: Monday-first, compact popover calendar, no special "today" highlight
- event creation: one contiguous date range, expanded internally into `dates: string[]`
- legal pages: opt-in
- language: English-only for now

If you are building a hosted version, these constraints are worth preserving unless you intentionally want to change the product.

## Architecture

### Data model

The Prisma schema is intentionally small:

- `Event`: metadata, timezone, slot size, meeting duration, organizer manage secret, status
- `EventDate`: concrete expanded dates for the event
- `Participant`: participant identity, color, normalized name, edit token hash
- `AvailabilitySlot`: selected slot rows stored in UTC

### Security model

- Organizer access is controlled by a private bearer-style manage URL.
- Participant editing is tied to an HTTP-only cookie scoped to that event.
- Recent event history is stored only in the browser, never synced to the server.
- Organizer URLs are stored locally on purpose and should always be treated as sensitive.

### Realtime model

Realtime updates are built on:

- PostgreSQL `LISTEN/NOTIFY`
- a server-side `pg` listener
- SSE at `/api/events/[slug]/stream`

Current behavior:

- the client that saves availability applies the returned snapshot directly
- other connected clients react to the SSE event and refetch the latest snapshot

The cleanup logic in [`src/lib/realtime.ts`](./src/lib/realtime.ts) matters. Closed streams must be removed carefully to avoid listener leaks or broken heartbeats.

### API surface

| Route | Purpose |
| --- | --- |
| `POST /api/events` | Create a new event |
| `GET /api/events/[slug]` | Fetch the public event snapshot |
| `POST /api/events/[slug]/participants` | Join an event with a name and establish an edit session |
| `PUT /api/events/[slug]/availability` | Save availability for the current participant |
| `GET /api/events/[slug]/stream` | Subscribe to realtime event updates via SSE |
| `POST /api/datafast/events` | Proxy/filter optional DataFast analytics events |
| `PATCH /api/manage/[token]` | Update event status/title or rename a participant |
| `DELETE /api/manage/[token]/participants/[participantId]` | Remove a participant |
| `GET /api/health` | Health check that remains available before setup completes |

## Repository layout

```text
.
├── docker-compose.yaml
├── Dockerfile
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── public/
├── src/
│   ├── app/            # Next.js routes and API endpoints
│   ├── components/     # UI and feature components
│   ├── lib/            # domain logic, realtime, setup, tokens, utilities
│   └── test/           # test setup
├── .env.example
└── .env.coolify.example
```

## Development workflow

### Scripts

```bash
pnpm dev
pnpm build
pnpm start
pnpm lint
pnpm typecheck
pnpm test:run
pnpm prisma:generate
pnpm prisma:migrate
pnpm prisma:studio
```

### Contributor checklist

Before opening a PR or cutting a release, the usual minimum is:

```bash
pnpm lint
pnpm typecheck
pnpm test:run
```

If you touch deployment-related files, Prisma wiring, or dependency boundaries, also run:

```bash
pnpm build
docker build -t tempoll-debug .
```

If you change the Prisma schema or Prisma-related setup, also run:

```bash
pnpm prisma:generate
```

### Community and security

- Contribution policy: [CONTRIBUTING.md](./CONTRIBUTING.md) (currently issues-first)
- Community conduct: [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)
- Security reporting: [SECURITY.md](./SECURITY.md)

### Important maintainer notes

- This repo targets `Next.js 16`. Do not assume older Next.js conventions. Read the relevant guide in `node_modules/next/dist/docs/` before making framework-level changes.
- Runtime imports must live in `dependencies`, not only in your local dev tree.
- The Docker image intentionally copies `prisma/` and `prisma.config.ts` into both build and runtime stages.
- The runtime container skips `pnpm prisma migrate deploy` unless `APP_SETUP_COMPLETE=true` so `/setup` can work on first deploys.

## Guardrails for a hosted version

If you continue building a managed or hosted tempoll service, these are the current product and ops guardrails:

- Keep the product name `tempoll` everywhere.
- Do not reintroduce old `Terminfinder` branding in UI copy, env names, storage keys, cookies, docs, or deployment files.
- Keep the public flow account-free unless you intentionally redesign it.
- Keep organizer access based on a private manage URL unless you intentionally add a real auth system.
- Keep recent-event history local-only in the browser.
- Keep private organizer links visibly marked as sensitive.
- Keep setup bootstrap non-secret. Do not render database passwords or a bundled `DATABASE_URL` in the browser.
- Keep legal pages opt-in via env config.
- Keep the Coolify story centered on `TEMPOLL_DB_*` plus `SERVICE_PASSWORD_TEMPOLL_DB`, not operator-managed `POSTGRES_*`.
- Keep the scheduling grid compact and practical rather than turning it into oversized dashboard UI.

## Troubleshooting

### Everything redirects to `/setup`

`APP_SETUP_COMPLETE` is missing or not exactly `true`. That is expected during first-run setup, but not after deployment is finalized.

### Coolify or Docker boot loop after changing DB credentials

The database volume was already initialized with older credentials. Either restore the correct password in `SERVICE_PASSWORD_TEMPOLL_DB` or reset the Postgres volume on purpose.

### Prisma migrate fails in the container

Make sure the runtime image still contains `prisma.config.ts` and that `DATABASE_URL` is available at runtime.

### Realtime updates do not reach other browsers

Check all three layers:

- Postgres `LISTEN/NOTIFY`
- the long-lived `pg` listener in [`src/lib/realtime.ts`](./src/lib/realtime.ts)
- the SSE endpoint at `/api/events/[slug]/stream`

## License

tempoll is licensed under the `GNU Affero General Public License v3.0`. This is intentional: tempoll is a self-hosted web app, and AGPL helps ensure that hosted or network-facing modifications remain open as well.

Copyright (c) 2026 Felix Gollnhuber.
