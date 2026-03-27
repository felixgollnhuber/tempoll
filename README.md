# tempoll

A modern, self-hosted When2Meet-style scheduler built with `Next.js 16`, `shadcn/ui`, `Prisma 7`, and `Postgres`.

The repository is ready for GitHub-based deployment with Coolify using the included [`docker-compose.yaml`](/Users/felixgollnhuber/Developer/tempoll/docker-compose.yaml).

## What is included

- First-run setup wizard gated by `APP_SETUP_COMPLETE`
- Landing page and event creation flow
- Global app chrome with home, new-event and recent-event navigation
- Browser-local recent event history for public and organizer links
- Public event board with drag-to-select availability heatmap
- Live updates via `Server-Sent Events` + `Postgres LISTEN/NOTIFY`
- Organizer management page with public/private links, rename/remove participant controls and open/closed status
- English `/imprint` and `/privacy` pages rendered from env-backed operator config
- Prisma schema, initial SQL migration, Dockerfile and healthcheck for Coolify deployments

## Local setup

1. Copy `.env.example` to `.env`.
2. Start a local Postgres instance or point `DATABASE_URL` to an existing one.
3. Run:

```bash
pnpm install
pnpm dev
```

If `APP_SETUP_COMPLETE=false` or the variable is missing, the app redirects to `/setup` and generates a non-secret app config snippet for you to copy into your deployment environment.

Once your final `.env` is in place and `APP_SETUP_COMPLETE=true`, run:

```bash
pnpm prisma migrate deploy
pnpm dev
```

The app will be available at `http://localhost:3000`.

### Local Postgres example

This repository defaults to a non-standard local Postgres port to avoid common clashes:

```bash
docker run -d \
  --name tempoll-postgres \
  -e POSTGRES_DB=tempoll \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 55432:5432 \
  -v tempoll-pgdata:/var/lib/postgresql/data \
  postgres:16
```

### Local Docker Compose

You can also boot the bundled stack directly:

```bash
cp .env.coolify.example .env.coolify
SERVICE_PASSWORD_TEMPOLL_DB=local-dev-password docker compose --env-file .env.coolify up -d
```

## Scripts

- `pnpm dev` starts the app in development
- `pnpm build` creates the production build
- `pnpm start` runs the production server
- `pnpm lint` runs ESLint
- `pnpm typecheck` runs TypeScript checks
- `pnpm test:run` runs the Vitest test suite
- `pnpm prisma:generate` regenerates Prisma Client
- `pnpm prisma:migrate` applies Prisma migrations

## Realtime architecture

- All write operations use Prisma.
- After a relevant change, the server calls `pg_notify('event_updates', eventId)`.
- A dedicated `pg` listener keeps a `LISTEN event_updates` connection open.
- Event pages subscribe to `/api/events/[slug]/stream` and refetch their snapshot on updates.

## Setup and configuration

- `APP_SETUP_COMPLETE` controls whether the app is considered configured.
- `LEGAL_PAGES_ENABLED` controls whether `/imprint` and `/privacy` are exposed at all.
- While setup is incomplete, normal routes redirect to `/setup` and most API routes return a setup-required response.
- The setup wizard generates a non-secret app config snippet containing:
  - app basics such as `APP_NAME` and `APP_URL`
  - optional operator/imprint fields
  - optional privacy and hosting disclosure fields
- The setup wizard never shows or exports:
  - `DATABASE_URL`
  - the database password
  - Coolify infrastructure secrets
- Operator-specific data is intentionally read from env-backed config so the project can be open-sourced without hard-coded personal details.
- If you keep `LEGAL_PAGES_ENABLED=false`, the footer hides legal links and both legal routes return `404`.

## Coolify notes

- The repository ships with a Git-ready [`docker-compose.yaml`](/Users/felixgollnhuber/Developer/tempoll/docker-compose.yaml) that includes both the app and a Postgres database.
- Coolify's Docker Compose mode treats the compose file as the source of truth for services, storage, and environment variables.
- Add the repository in Coolify as an `Application` using the `Docker Compose` build pack.
- Use [.env.coolify.example](/Users/felixgollnhuber/Developer/tempoll/.env.coolify.example) as the starting point for the Coolify environment variables.
- In Coolify, assign your domain to the `app` service and set the internal service port to `3000`.
- Set `APP_URL` to the final public URL of the app.
- Keep `TEMPOLL_DB_NAME` and `TEMPOLL_DB_USER` as the non-secret database metadata.
- The database password is derived from the Coolify-managed `SERVICE_PASSWORD_TEMPOLL_DB` secret and is never shown by `/setup`.
- `DATABASE_URL` is built inside Docker Compose from `TEMPOLL_DB_NAME`, `TEMPOLL_DB_USER`, and `SERVICE_PASSWORD_TEMPOLL_DB`.
- On first deployment you can keep `APP_SETUP_COMPLETE=false`, open `/setup`, copy the generated app config, merge it into Coolify, and redeploy.
- While `APP_SETUP_COMPLETE=false`, the container skips `prisma migrate deploy` so `/setup` can load without a migration boot loop.
- For existing persistent Postgres volumes, make sure `SERVICE_PASSWORD_TEMPOLL_DB` matches the current live database password before redeploying. Changing DB credentials after first initialization is an infrastructure migration or volume-reset task.
- The healthcheck endpoint is `/api/health`.

## Data model

- `Event`: metadata, timezone, slot size, meeting duration and organizer secret
- `EventDate`: selected concrete dates for an event
- `Participant`: participant profile and edit token hash
- `AvailabilitySlot`: discrete availability slots stored in UTC
