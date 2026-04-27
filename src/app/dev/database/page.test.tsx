import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { formatMessage } from "@/lib/i18n/format";
import { getMessages } from "@/lib/i18n/messages";

const checkDatabaseStatus = vi.fn();
const getServerI18n = vi.fn();
const isDevModeEnabled = vi.fn();
const notFound = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});

vi.mock("@/lib/database-status", () => ({
  checkDatabaseStatus,
}));

vi.mock("@/lib/dev-mode", () => ({
  isDevModeEnabled,
}));

vi.mock("@/lib/i18n/server", () => ({
  getServerI18n,
}));

vi.mock("next/navigation", () => ({
  notFound,
}));

describe("DevDatabasePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServerI18n.mockResolvedValue({
      locale: "en",
      messages: getMessages("en"),
      format: formatMessage,
    });
    checkDatabaseStatus.mockResolvedValue({
      ok: true,
      databaseName: "tempoll",
      error: null,
      latencyMs: 12,
      schemaName: "public",
      serverVersion: "16.8",
      target: "localhost:55432/tempoll?schema=public",
      userName: "postgres",
    });
  });

  it("returns not found when dev mode is disabled", async () => {
    isDevModeEnabled.mockReturnValue(false);
    const { default: DevDatabasePage } = await import("./page");

    await expect(DevDatabasePage()).rejects.toThrow("NEXT_NOT_FOUND");

    expect(notFound).toHaveBeenCalled();
    expect(checkDatabaseStatus).not.toHaveBeenCalled();
  });

  it("renders a successful database check when dev mode is enabled", async () => {
    isDevModeEnabled.mockReturnValue(true);
    const { default: DevDatabasePage } = await import("./page");

    render(await DevDatabasePage());

    expect(screen.getByRole("heading", { name: "Database status" })).toBeInTheDocument();
    expect(screen.getByText("Connected")).toBeInTheDocument();
    expect(screen.getByText("localhost:55432/tempoll?schema=public")).toBeInTheDocument();
    expect(screen.getByText("tempoll")).toBeInTheDocument();
    expect(screen.getByText("postgres")).toBeInTheDocument();
    expect(screen.queryByText(/postgres:postgres/)).not.toBeInTheDocument();
  });
});
