import { describe, expect, it } from "vitest";

import {
  buildDatabaseUrl,
  buildManagedEnvBlock,
  createComposeProjectName,
  createWorktreeIdentity,
  findAvailablePort,
  getPortCandidates,
  updateManagedEnvContent,
} from "./dev-worktree-lib.mjs";

describe("dev worktree helpers", () => {
  it("derives stable worktree identities and port candidates from a path", () => {
    const worktreePath = "/Users/alex/worktrees/feature-a/tempoll";

    expect(createWorktreeIdentity(worktreePath)).toEqual(createWorktreeIdentity(worktreePath));
    expect(createWorktreeIdentity(worktreePath).id).toMatch(/^tempoll-[a-f0-9]{8}$/);
    expect(createComposeProjectName(worktreePath)).toMatch(/^tempoll-dev-tempoll-[a-f0-9]{8}$/);
    expect(getPortCandidates(worktreePath)).toEqual(getPortCandidates(worktreePath));
  });

  it("builds and replaces the managed env block without touching user content", () => {
    const firstBlock = buildManagedEnvBlock({
      appPort: 3210,
      dbPort: 56000,
    });
    const secondBlock = buildManagedEnvBlock({
      appPort: 3211,
      dbPort: 56001,
    });
    const initialContent = "APP_NAME=tempoll\n";

    const withBlock = updateManagedEnvContent(initialContent, firstBlock);
    const replaced = updateManagedEnvContent(withBlock, secondBlock);

    expect(withBlock).toContain("APP_NAME=tempoll");
    expect(withBlock).toContain("APP_URL=http://localhost:3210");
    expect(replaced).toContain("APP_NAME=tempoll");
    expect(replaced).toContain("APP_URL=http://localhost:3211");
    expect(replaced).not.toContain("APP_URL=http://localhost:3210");
    expect(buildDatabaseUrl(56001)).toBe(
      "postgresql://postgres:postgres@localhost:56001/tempoll?schema=public",
    );
  });

  it("scans upward until an available port is found", async () => {
    const port = await findAvailablePort(3000, {
      isAvailable: async (candidate) => candidate === 3003,
      maxAttempts: 5,
      reservedPorts: new Set([3001]),
    });

    expect(port).toBe(3003);
  });
});
