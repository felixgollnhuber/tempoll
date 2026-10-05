import { EventEmitter } from "node:events";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { findEvent, createClient, getClientIp } = vi.hoisted(() => ({
  findEvent: vi.fn(),
  createClient: vi.fn(),
  getClientIp: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: { event: { findUnique: findEvent } } }));
vi.mock("@/lib/request", () => ({ getClientIp }));
vi.mock("@/lib/config", () => ({
  appConfig: { defaultLocale: "en" },
  getDatabaseUrl: () => "postgresql://postgres:postgres@localhost:55432/tempoll",
}));
vi.mock("pg", () => ({
  Client: class {
    constructor() {
      return createClient();
    }
  },
  Pool: class {},
}));

function makeClient() {
  return Object.assign(new EventEmitter(), {
    connect: vi.fn().mockResolvedValue(undefined),
    query: vi.fn().mockResolvedValue(undefined),
    end: vi.fn().mockResolvedValue(undefined),
  });
}

const realtimeGlobal = globalThis as typeof globalThis & {
  eventListenerPromise?: unknown;
  eventSubscribers?: Map<string, Set<{ close: () => void }>>;
};
let requestNumber = 0;

describe("GET /api/events/[slug]/stream", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    delete realtimeGlobal.eventListenerPromise;
    delete realtimeGlobal.eventSubscribers;
    getClientIp.mockReturnValue(`stream-test-${++requestNumber}`);
    findEvent.mockResolvedValue({ id: "event_1" });
    createClient.mockImplementation(makeClient);
  });

  afterEach(() => {
    for (const subscribers of realtimeGlobal.eventSubscribers?.values() ?? []) {
      for (const subscriber of subscribers) {
        subscriber.close();
      }
    }
    vi.restoreAllMocks();
  });

  async function openStream(signal?: AbortSignal) {
    const { GET } = await import("./route");
    return GET(new Request("https://tempoll.example.com/api/events/team-sync/stream", { signal }), {
      params: Promise.resolve({ slug: "team-sync" }),
    });
  }

  it("releases connection slots when response bodies are cancelled", async () => {
    for (let index = 0; index < 5; index += 1) {
      const response = await openStream();
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toBe("text/event-stream; charset=utf-8");
      await response.body?.cancel();
    }
  });

  it("closes aborted requests and permits subsequent connections", async () => {
    for (let index = 0; index < 5; index += 1) {
      const controller = new AbortController();
      const response = await openStream(controller.signal);
      expect(response.status).toBe(200);
      controller.abort();
      const reader = response.body!.getReader();
      while (!(await reader.read()).done) {
        // Drain messages queued before the abort.
      }
    }
  });

  it("releases all connection slots when the database listener disconnects", async () => {
    for (let index = 0; index < 3; index += 1) {
      expect((await openStream()).status).toBe(200);
    }
    expect((await openStream()).status).toBe(429);
    const client = createClient.mock.results[0].value as ReturnType<typeof makeClient>;
    client.emit("end");

    const response = await openStream();
    expect(response.status).toBe(200);
    expect(createClient).toHaveBeenCalledTimes(2);
    await response.body?.cancel();
  });

  it("recovers after initialization failures without leaking a connection slot", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const client = makeClient();
    client.connect.mockRejectedValueOnce(new Error("database unavailable"));
    createClient.mockReturnValueOnce(client);

    expect((await openStream()).status).toBe(500);
    for (let index = 0; index < 3; index += 1) {
      expect((await openStream()).status).toBe(200);
    }
  });

  it("releases the slot when a request is aborted while the database connection is pending", async () => {
    const client = makeClient();
    const connected = Promise.withResolvers<void>();
    const connecting = Promise.withResolvers<void>();
    client.connect.mockImplementation(() => {
      connecting.resolve();
      return connected.promise;
    });
    createClient.mockReturnValueOnce(client);
    const controller = new AbortController();
    const responsePromise = openStream(controller.signal);
    await connecting.promise;
    controller.abort();
    connected.resolve();

    const response = await responsePromise;
    expect(response.status).toBe(200);
    await expect(response.body!.getReader().read()).resolves.toMatchObject({ done: true });
    for (let index = 0; index < 3; index += 1) {
      expect((await openStream()).status).toBe(200);
    }
  });

  it("returns 404 without opening a database listener for an unknown event", async () => {
    findEvent.mockResolvedValue(null);
    expect((await openStream()).status).toBe(404);
    expect(createClient).not.toHaveBeenCalled();
  });
});
