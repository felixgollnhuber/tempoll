import { prisma } from "@/lib/prisma";

type DatabaseStatusRow = {
  database_name: string;
  schema_name: string;
  server_version: string;
  user_name: string;
};

export type DatabaseStatus =
  | {
      ok: true;
      databaseName: string;
      error: null;
      latencyMs: number;
      schemaName: string;
      serverVersion: string;
      target: string;
      userName: string;
    }
  | {
      ok: false;
      databaseName: null;
      error: string;
      latencyMs: number;
      schemaName: null;
      serverVersion: null;
      target: string;
      userName: null;
    };

const defaultDatabaseUrl = "postgresql://postgres:postgres@localhost:55432/tempoll?schema=public";

export function getDatabaseConnectionTarget(databaseUrl = process.env.DATABASE_URL ?? defaultDatabaseUrl) {
  try {
    const url = new URL(databaseUrl);
    const databaseName = url.pathname.replace(/^\//, "") || "(default database)";
    const schema = url.searchParams.get("schema");
    const host = url.host || "(local socket)";

    return `${host}/${databaseName}${schema ? `?schema=${schema}` : ""}`;
  } catch {
    return "(unparseable database target)";
  }
}

function sanitizeErrorMessage(error: unknown) {
  if (!(error instanceof Error) || !error.message.trim()) {
    return "Connection check failed.";
  }

  let message = error.message;
  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl) {
    message = message.replaceAll(databaseUrl, "[DATABASE_URL]");
  }

  try {
    const parsedUrl = new URL(databaseUrl ?? defaultDatabaseUrl);
    if (parsedUrl.password) {
      message = message.replaceAll(parsedUrl.password, "[password]");
    }
  } catch {
    // Keep the original message if DATABASE_URL is malformed.
  }

  return message.slice(0, 500);
}

export async function checkDatabaseStatus(): Promise<DatabaseStatus> {
  const startedAt = performance.now();
  const target = getDatabaseConnectionTarget();

  try {
    const rows = await prisma.$queryRaw<DatabaseStatusRow[]>`
      select
        current_database() as database_name,
        current_schema() as schema_name,
        current_setting('server_version') as server_version,
        current_user as user_name
    `;
    const latencyMs = Math.round(performance.now() - startedAt);
    const row = rows[0];

    if (!row) {
      return {
        ok: false,
        databaseName: null,
        error: "The database check returned no rows.",
        latencyMs,
        schemaName: null,
        serverVersion: null,
        target,
        userName: null,
      };
    }

    return {
      ok: true,
      databaseName: row.database_name,
      error: null,
      latencyMs,
      schemaName: row.schema_name,
      serverVersion: row.server_version,
      target,
      userName: row.user_name,
    };
  } catch (error) {
    return {
      ok: false,
      databaseName: null,
      error: sanitizeErrorMessage(error),
      latencyMs: Math.round(performance.now() - startedAt),
      schemaName: null,
      serverVersion: null,
      target,
      userName: null,
    };
  }
}
