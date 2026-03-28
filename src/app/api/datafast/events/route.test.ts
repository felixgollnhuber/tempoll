import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getClientIp = vi.fn();
const fetchMock = vi.fn();

vi.mock("@/lib/request", () => ({
  getClientIp,
}));

describe("POST /api/datafast/events", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getClientIp.mockReturnValue("203.0.113.42");
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("drops events for manage URLs when referer contains /manage/*", async () => {
    const { POST } = await import("./route");
    const response = await POST(
      new Request("https://tempoll.example.com/api/datafast/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Referer:
            "https://tempoll.example.com/manage/cmn8tbq86000001pbddo4sxf.a1b2c3d4e5f6",
        },
        body: JSON.stringify({
          pathname: "/manage/cmn8tbq86000001pbddo4sxf.a1b2c3d4e5f6",
        }),
      }),
    );

    expect(fetchMock).not.toHaveBeenCalled();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      status: "success",
      ignored: true,
    });
  });

  it("drops events for manage URLs when referer is missing but payload contains /manage/*", async () => {
    const { POST } = await import("./route");
    const response = await POST(
      new Request("https://tempoll.example.com/api/datafast/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pathname: "/manage/cmn8tbq86000001pbddo4sxf.a1b2c3d4e5f6",
        }),
      }),
    );

    expect(fetchMock).not.toHaveBeenCalled();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      status: "success",
      ignored: true,
    });
  });

  it("forwards non-manage events and forwards x-datafast-real-ip", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 202,
        headers: {
          "Content-Type": "application/json",
        },
      }),
    );

    const { POST } = await import("./route");
    const body = JSON.stringify({
      pathname: "/e/team-sync",
    });

    const response = await POST(
      new Request("https://tempoll.example.com/api/datafast/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "https://tempoll.example.com",
          Referer: "https://tempoll.example.com/e/team-sync",
          "User-Agent": "Vitest Agent",
        },
        body,
      }),
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "https://datafa.st/api/events",
      expect.objectContaining({
        method: "POST",
        body,
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          Origin: "https://tempoll.example.com",
          "User-Agent": "Vitest Agent",
          "x-datafast-real-ip": "203.0.113.42",
        }),
      }),
    );
    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });
});
