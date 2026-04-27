import crypto from "node:crypto";
import net from "node:net";
import path from "node:path";

const maxProjectNameLength = 63;

export function normalizeWorktreeName(worktreePath) {
  const basename = path.basename(worktreePath);
  const normalized = basename
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "worktree";
}

export function createWorktreeHash(worktreePath) {
  return crypto.createHash("sha1").update(path.resolve(worktreePath)).digest("hex").slice(0, 8);
}

export function createWorktreeIdentity(worktreePath) {
  const name = normalizeWorktreeName(worktreePath).slice(0, 28);
  const hash = createWorktreeHash(worktreePath);

  return {
    hash,
    id: `${name}-${hash}`,
  };
}

export function createComposeProjectName(worktreePath) {
  const { id } = createWorktreeIdentity(worktreePath);
  const projectName = `tempoll-dev-${id}`;

  return projectName.slice(0, maxProjectNameLength).replace(/-+$/g, "");
}

export function getPortCandidates(worktreePath) {
  const hash = createWorktreeHash(worktreePath);
  const offset = Number.parseInt(hash.slice(0, 6), 16) % 1000;

  return {
    appPort: 3000 + offset,
    dbPort: 55432 + offset,
  };
}

export function buildDatabaseUrl(dbPort) {
  return `postgresql://postgres:postgres@localhost:${dbPort}/tempoll?schema=public`;
}

export function buildManagedEnvBlock({ appPort, dbPort }) {
  return [
    "# BEGIN tempoll dev-worktree",
    "APP_SETUP_COMPLETE=true",
    `APP_URL=http://localhost:${appPort}`,
    `DATABASE_URL=${buildDatabaseUrl(dbPort)}`,
    "TEMPOLL_DEV_MODE=true",
    "# END tempoll dev-worktree",
  ].join("\n");
}

export function updateManagedEnvContent(existingContent, managedBlock) {
  const normalizedBlock = `${managedBlock.trim()}\n`;
  const pattern = /# BEGIN tempoll dev-worktree\n[\s\S]*?# END tempoll dev-worktree\n?/;

  if (pattern.test(existingContent)) {
    return existingContent.replace(pattern, normalizedBlock);
  }

  const separator = existingContent.trim().length > 0 ? "\n\n" : "";

  return `${existingContent.trimEnd()}${separator}${normalizedBlock}`;
}

export function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(port, "127.0.0.1");
  });
}

export async function findAvailablePort(startPort, options = {}) {
  const maxAttempts = options.maxAttempts ?? 200;
  const isAvailable = options.isAvailable ?? isPortAvailable;
  const reservedPorts = options.reservedPorts ?? new Set();

  for (let index = 0; index < maxAttempts; index += 1) {
    const port = startPort + index;

    if (!reservedPorts.has(port) && (await isAvailable(port))) {
      return port;
    }
  }

  throw new Error(`No available port found from ${startPort}.`);
}
