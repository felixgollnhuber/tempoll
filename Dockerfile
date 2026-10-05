FROM node:24-bookworm-slim AS base
WORKDIR /app
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
# Stop at the failed download, before package resolution can hide the cause.
RUN printf '%s\n' \
    'APT::Update::Error-Mode "any";' \
    'Acquire::Retries "0";' \
    'Acquire::http::Timeout "20";' \
    'Acquire::https::Timeout "20";' \
    > /etc/apt/apt.conf.d/99download-policy
# The slim image has no system CA bundle yet; use Node's roots to bootstrap HTTPS.
RUN rm -rf /var/lib/apt/lists/* \
  && node -e "require('node:fs').writeFileSync('/tmp/node-root-certificates.pem', require('node:tls').rootCertificates.join('\n') + '\n')" \
  && sed -i 's|http://deb.debian.org|https://deb.debian.org|g' /etc/apt/sources.list.d/debian.sources \
  && apt-get -o Acquire::https::CAInfo=/tmp/node-root-certificates.pem update \
  && apt-get -o Acquire::https::CAInfo=/tmp/node-root-certificates.pem install -y --no-install-recommends openssl ca-certificates \
  && rm -f /tmp/node-root-certificates.pem \
  && rm -rf /var/lib/apt/lists/*

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY patches ./patches
COPY prisma ./prisma
COPY prisma.config.ts ./prisma.config.ts
RUN pnpm install --frozen-lockfile

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm prisma generate
RUN pnpm build

FROM base AS runner
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
COPY --chown=node:node --from=deps /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/.next/standalone ./
COPY --chown=node:node --from=builder /app/.next/static ./.next/static
COPY --chown=node:node --from=builder /app/public ./public
COPY --chown=node:node --from=builder /app/prisma ./prisma
COPY --chown=node:node --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --chown=node:node --from=builder /app/package.json ./package.json
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 CMD node -e "fetch('http://127.0.0.1:3000/api/health').then((res)=>process.exit(res.ok?0:1)).catch(()=>process.exit(1))"
CMD ["sh", "-c", "if [ \"$APP_SETUP_COMPLETE\" = \"true\" ]; then pnpm prisma migrate deploy; else echo 'Skipping Prisma migrations because APP_SETUP_COMPLETE is not true.'; fi && exec node server.js"]
