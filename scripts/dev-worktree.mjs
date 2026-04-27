#!/usr/bin/env node

import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildDatabaseUrl,
  buildManagedEnvBlock,
  createComposeProjectName,
  findAvailablePort,
  getPortCandidates,
  updateManagedEnvContent,
} from "./dev-worktree-lib.mjs";

const scriptPath = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(scriptPath), "..");
const composeFile = path.join(repoRoot, "docker-compose.dev-db.yaml");
const envLocalPath = path.join(repoRoot, ".env.local");

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: repoRoot,
      env: options.env ?? process.env,
      stdio: options.stdio ?? "inherit",
    });

    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(" ")} failed with ${signal ?? code}.`));
    });
  });
}

async function commandSucceeds(command, args, env) {
  try {
    await run(command, args, { env, stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function composeArgs(projectName, args) {
  return ["compose", "-p", projectName, "-f", composeFile, ...args];
}

async function waitForPostgres(projectName, env) {
  const args = composeArgs(projectName, ["exec", "-T", "db", "pg_isready", "-U", "postgres", "-d", "tempoll"]);

  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (await commandSucceeds("docker", args, env)) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error("Postgres did not become ready in time.");
}

async function updateEnvLocal(appPort, dbPort) {
  let existingContent = "";

  try {
    existingContent = await fs.readFile(envLocalPath, "utf8");
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }

  const managedBlock = buildManagedEnvBlock({ appPort, dbPort });

  await fs.writeFile(envLocalPath, updateManagedEnvContent(existingContent, managedBlock));
}

async function main() {
  const projectName = createComposeProjectName(repoRoot);
  const candidates = getPortCandidates(repoRoot);
  const baseEnv = {
    ...process.env,
    TEMPOLL_DEV_DB_PORT: String(candidates.dbPort),
  };

  console.log(`Using Compose project ${projectName}`);

  await run("docker", composeArgs(projectName, ["down", "-v", "--remove-orphans"]), {
    env: baseEnv,
  });

  const dbPort = await findAvailablePort(candidates.dbPort);
  const appPort = await findAvailablePort(candidates.appPort, {
    reservedPorts: new Set([dbPort]),
  });
  const databaseUrl = buildDatabaseUrl(dbPort);
  const env = {
    ...process.env,
    APP_SETUP_COMPLETE: "true",
    APP_URL: `http://localhost:${appPort}`,
    DATABASE_URL: databaseUrl,
    TEMPOLL_DEV_DB_PORT: String(dbPort),
    TEMPOLL_DEV_MODE: "true",
  };

  console.log(`Using Postgres on localhost:${dbPort}`);
  console.log(`Using Next dev server on http://localhost:${appPort}`);

  await run("docker", composeArgs(projectName, ["up", "-d"]), { env });
  await waitForPostgres(projectName, env);
  await updateEnvLocal(appPort, dbPort);
  await run("pnpm", ["prisma:migrate"], { env });
  await run("node", ["scripts/seed-dev.mjs"], { env });

  console.log("");
  console.log("Dev database is fresh, migrated, and seeded.");
  console.log(`Starting app at http://localhost:${appPort}`);

  await run("pnpm", ["dev", "--port", String(appPort)], { env });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
