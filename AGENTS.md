<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project Notes

## Branding

- The product name is `tempoll` everywhere.
- Do not reintroduce the old `Terminfinder` / `terminfinder` branding in UI copy, env defaults, storage keys, cookie names, docs, or deployment files.

## Product / UX decisions

- This is a modern, self-hosted When2Meet-style app with no required login.
- Public flow:
  - organizer creates an event
  - participants join with only a name
  - availability is edited directly on the heatmap
- Organizer flow:
  - organizer gets a private manage URL
  - manage page can rename/remove participants and open/close the event
- The create flow uses a date range, not manually added individual dates.
  - internally the selected range is expanded into `dates: string[]`
- Calendar expectations:
  - Monday-first weeks
  - no special “today” highlight
  - compact shadcn-style popover calendar, not the browser-native date picker
- The scheduling grid should stay compact and practical, closer to classic When2Meet density than oversized dashboard cards.
- Use normal shadcn/Radix primitives for general UI.
  - avoid introducing alternate component libraries for common controls
  - custom logic-heavy components like the heatmap grid are still fine

## App shell / recent events

- There is a global app chrome with home branding, `New event`, and `Recent events`.
- The home page has a browser-local `Recent events` section.
- Recent events store both:
  - public event URLs
  - private organizer URLs
- Organizer URLs are intentionally stored locally because the user asked for it; they must stay visibly marked as sensitive/private.
- Recent-event history is local only, no server sync.
- The recent-events store is implemented with `useSyncExternalStore`.
  - server snapshot must stay referentially stable
  - browser snapshot caching matters to avoid hydration/infinite-loop issues

## Setup / legal behavior

- The app is English-only for now.
- First-run setup is controlled by `APP_SETUP_COMPLETE`.
  - if it is missing or not exactly `true`, normal routes redirect to `/setup`
  - `/api/health` stays available
  - most other API routes should not assume a ready app while setup is incomplete
- The setup wizard is only a bootstrap generator.
  - it does not write files on the server
  - it generates only non-secret app/legal env values for the operator to copy into Coolify/server env vars
  - it must never render or export `DATABASE_URL` or database passwords
  - it must not ask for DB credentials in the browser
  - the "Infrastructure" step is informational only
  - first deploy flow is:
    - deploy with `APP_SETUP_COMPLETE=false`
    - open `/setup`
    - copy only the generated app config values into Coolify
    - redeploy with `APP_SETUP_COMPLETE=true`
- Legal pages are opt-in via `LEGAL_PAGES_ENABLED`.
  - if `false`, footer legal links are hidden and `/imprint` plus `/privacy` return `404`
  - if `true`, legal pages render from env-backed config
- Legal/operator/privacy fields are intentionally optional.
  - sensitive details like the address may be omitted
  - pages should fall back to “available on request” style wording rather than hard-failing

## Realtime architecture

- Realtime is based on:
  - Postgres `LISTEN/NOTIFY`
  - server-side `pg` listener
  - SSE stream at `/api/events/[slug]/stream`
- `src/lib/realtime.ts` manages global subscribers and must clean up closed streams carefully.
- Current behavior:
  - local availability saves apply the returned snapshot directly
  - other clients still respond to SSE updates by refetching the latest snapshot
- Avoid reintroducing the old closed-controller heartbeat bug in SSE cleanup.

## Deployment / Docker / Coolify

- Coolify target uses the repo’s Docker Compose setup, not Nixpacks.
- Current compose file is `docker-compose.yaml` in repo root.
- Coolify expectations:
  - Build Pack: `Docker Compose`
  - base directory: `/`
  - assign domain to the `app` service
  - internal app port: `3000`
- The compose stack includes:
  - `app`
  - `db` (Postgres 16)
- The DB service uses a persistent volume named `tempoll-postgresql`.
- Bundled DB infra variables are:
  - `TEMPOLL_DB_NAME`
  - `TEMPOLL_DB_USER`
  - `SERVICE_PASSWORD_TEMPOLL_DB`
- `DATABASE_URL` is derived inside `docker-compose.yaml`.
- Use an underscore in `SERVICE_PASSWORD_TEMPOLL_DB`.
  - Docker Compose interpolation breaks on a hyphenated variant like `SERVICE_PASSWORD_TEMPOLL-DB`
- Do not reintroduce `POSTGRES_DB`, `POSTGRES_USER`, or `POSTGRES_PASSWORD` as top-level operator-managed env vars in app docs or setup UX.
  - inside the `db` service, Compose still maps to `POSTGRES_*` because that is what the Postgres image expects
  - but operator-facing configuration should stay on `TEMPOLL_DB_*` plus `SERVICE_PASSWORD_TEMPOLL_DB`
- Do not ask the operator to paste or reveal a full `DATABASE_URL` in Coolify/UI flows when using the bundled DB.
- `SERVICE_PASSWORD_TEMPOLL_DB` is intended to be Coolify-generated for fresh stacks.
  - for local `docker compose` usage, it can be set manually in the shell or env file
- Important Postgres operational gotcha:
  - DB credentials only initialize a fresh volume
  - if the volume already exists, changing those env vars later does not recreate users/databases automatically
  - if credentials drift, either align env vars with the existing DB or reset the Postgres volume
  - for existing deployments, seed `SERVICE_PASSWORD_TEMPOLL_DB` with the current live DB password before switching compose/env naming

## Docker / Prisma gotchas

- Fresh container builds exposed multiple issues that local `node_modules` hid.
- When changing Docker, Prisma, or dependencies, validate with a real `docker build`, not only local `pnpm build`.
- The Dockerfile intentionally:
  - installs `openssl` and `ca-certificates`
  - copies `prisma/` and `prisma.config.ts` before `pnpm install`
  - copies `prisma.config.ts` into the final runner image
  - skips `pnpm prisma migrate deploy` when `APP_SETUP_COMPLETE` is not `true`
- Without `prisma.config.ts` in the final image, `pnpm prisma migrate deploy` fails with:
  - `The datasource.url property is required in your Prisma config file`
- Prisma and app dependencies that must remain direct dependencies in `package.json`:
  - `@prisma/client`
  - `pg`
  - `zod`
  - `date-fns-tz`
- If container builds suddenly fail after adding imports, first confirm the package is a direct dependency and not only present in a local dev tree.

## Data / env defaults

- Local non-default Postgres port is `55432` by convention to avoid collisions.
- Current local-style default DB name is `tempoll`.
- `APP_NAME` defaults to `tempoll`.
- `.env.coolify.example` is the reference starting point for Coolify variables.
- `.env.example` and `.env.coolify.example` are intentionally committed.
  - `.env` must stay ignored
  - if `.gitignore` env rules change, preserve explicit exceptions for the example files

## Practical workflow reminders

- If Codex creates a new git branch, the branch name must be English-only.
  - use English slugs even when the user writes in German
  - do not create German branch names like `codex/passe-viewmodemarkierung-an`
- If changing deployment-related files, re-run at minimum:
  - `pnpm build`
  - `docker build -t tempoll-debug .`
- If changing Prisma packages or schema setup, also run:
  - `pnpm prisma generate`
- If debugging a Coolify boot loop, separate:
  - DB health
  - app container start command
  - Prisma migrate startup errors
  - stale Postgres volume credentials
