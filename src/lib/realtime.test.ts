import { EventEmitter } from "node:events";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { createClient, createPool } = vi.hoisted(() => ({
  createClient: vi.fn(),
  createPool: vi.fn(),
}));

vi.mock("pg", () => ({
  Client: class {
    constructor() {
      return createClient();
    }
  },
  Pool: class {
    constructor() {
      return createPool();
    }
  },
}));

vi.mock("@/lib/config", () => ({
  getDatabaseUrl: () => "postgresql://postgres:postgres@localhost:55432/tempoll",
}));

function makeClient() {
  return Object.assign(new EventEmitter(), {
    connect: vi.fn().mockResolvedValue(undefined),
    query: vi.fn().mockResolvedValue(undefined),
    end: vi.fn().mockResolvedValue(undefined),
  });
}

const realtimeGlobal = globalThis as typeof globalThis & {
  eventPool?: unknown;
  eventListenerPromise?: unknown;
  eventSubscribers?: Map<string, Set<{ close: () => void }>>;
};

async function readHandshake(reader: ReadableStreamDefaultReader<Uint8Array>) {
  const decoder = new TextDecoder();
  expect(decoder.decode((await reader.read()).value)).toContain("event: connected");
  expect(decoder.decode((await reader.read()).value)).toContain('"kind":"event-updated"');
}

describe("realtime event streams", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.useFakeTimers();
    delete realtimeGlobal.eventPool;
    delete realtimeGlobal.eventListenerPromise;
    delete realtimeGlobal.eventSubscribers;
    createClient.mockImplementation(makeClient);
    createPool.mockImplementation(() => Object.assign(new EventEmitter(), {
      query: vi.fn().mockResolvedValue(undefined),
    }));
  });

  afterEach(() => {
    for (const subscribers of realtimeGlobal.eventSubscribers?.values() ?? []) {
      for (const subscriber of subscribers) {
        subscriber.close();
      }
    }
    vi.useRealTimers();
  });

  it("shares a listener and sends updates only to subscribers of the matching event", async () => {
    const { createEventStream } = await import("./realtime");
    const streams = await Promise.all([
      createEventStream("event_1"),
      createEventStream("event_1"),
      createEventStream("event_2"),
    ]);
    const readers = streams.map((stream) => stream.getReader());
    await Promise.all(readers.map(readHandshake));

    expect(createClient).toHaveBeenCalledTimes(1);
    const client = createClient.mock.results[0].value as ReturnType<typeof makeClient>;
    expect(client.query).toHaveBeenCalledWith("LISTEN event_updates");
    const payload = { eventId: "event_1", kind: "participant-joined" };
    client.emit("notification", { payload: JSON.stringify(payload) });

    for (const reader of readers.slice(0, 2)) {
      expect(new TextDecoder().decode((await reader.read()).value)).toContain(JSON.stringify(payload));
    }
    await vi.advanceTimersByTimeAsync(15_000);
    expect(new TextDecoder().decode((await readers[2].read()).value)).toBe(": heartbeat\n\n");
  });

  it.each(["connect", "query"] as const)("recovers after a failed initial %s", async (operation) => {
    const failedClient = makeClient();
    failedClient[operation].mockRejectedValueOnce(new Error("database unavailable"));
    createClient.mockReturnValueOnce(failedClient);
    const { createEventStream } = await import("./realtime");

    await expect(createEventStream("event_1")).rejects.toThrow("database unavailable");
    expect(failedClient.end).toHaveBeenCalledTimes(1);

    const stream = await createEventStream("event_1");
    await readHandshake(stream.getReader());
    expect(createClient).toHaveBeenCalledTimes(2);
  });

  it.each(["error", "end"])("closes streams on database %s and permits a fresh listener", async (event) => {
    const { createEventStream } = await import("./realtime");
    const onClose = vi.fn();
    const stream = await createEventStream("event_1", undefined, onClose);
    const reader = stream.getReader();
    await readHandshake(reader);
    const client = createClient.mock.results[0].value as ReturnType<typeof makeClient>;

    client.emit(event, new Error("connection lost"));
    await expect(reader.read()).resolves.toMatchObject({ done: true });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);

    const nextStream = await createEventStream("event_1");
    const nextReader = nextStream.getReader();
    await readHandshake(nextReader);
    expect(createClient).toHaveBeenCalledTimes(2);

    client.emit("end");
    client.emit("notification", { payload: "event_1" });
    await vi.advanceTimersByTimeAsync(15_000);
    expect(new TextDecoder().decode((await nextReader.read()).value)).toBe(": heartbeat\n\n");
  });

  it("does not attach a stream to a listener that disconnected during initialization", async () => {
    const client = makeClient();
    client.query.mockImplementationOnce(async () => { client.emit("end"); });
    createClient.mockReturnValueOnce(client);
    const { createEventStream } = await import("./realtime");

    await expect(createEventStream("event_1")).rejects.toThrow("disconnected during initialization");
    expect(realtimeGlobal.eventSubscribers?.size ?? 0).toBe(0);
    const stream = await createEventStream("event_1");
    await readHandshake(stream.getReader());
    expect(createClient).toHaveBeenCalledTimes(2);
  });

  it("closes an aborted stream and releases its slot exactly once", async () => {
    const { createEventStream } = await import("./realtime");
    const controller = new AbortController();
    const removeListener = vi.spyOn(controller.signal, "removeEventListener");
    const onClose = vi.fn();
    const stream = await createEventStream("event_1", controller.signal, onClose);
    const reader = stream.getReader();
    await readHandshake(reader);

    controller.abort();
    await expect(reader.read()).resolves.toMatchObject({ done: true });
    await reader.cancel();
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(removeListener).toHaveBeenCalledWith("abort", expect.any(Function));
    expect(realtimeGlobal.eventSubscribers?.size).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("finishes immediately when a request was already aborted during connection setup", async () => {
    const { createEventStream } = await import("./realtime");
    const controller = new AbortController();
    controller.abort();
    const onClose = vi.fn();

    const stream = await createEventStream("event_1", controller.signal, onClose);
    await expect(stream.getReader().read()).resolves.toMatchObject({ done: true });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("cleans up cancelled response bodies without waiting for a request abort", async () => {
    const { createEventStream } = await import("./realtime");
    const controller = new AbortController();
    const onClose = vi.fn();
    const stream = await createEventStream("event_1", controller.signal, onClose);

    await stream.cancel();
    controller.abort();
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(realtimeGlobal.eventSubscribers?.size).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("handles idle notification pool errors without an unhandled error event", async () => {
    const { publishEventUpdate } = await import("./realtime");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const payload = { eventId: "event_1", kind: "event-updated" } as const;
    await publishEventUpdate(payload);
    const pool = createPool.mock.results[0].value as EventEmitter & { query: ReturnType<typeof vi.fn> };

    expect(pool.query).toHaveBeenCalledWith("SELECT pg_notify('event_updates', $1)", [JSON.stringify(payload)]);
    expect(() => pool.emit("error", new Error("idle connection failed"))).not.toThrow();
    expect(consoleError).toHaveBeenCalledWith("[realtime] Database notification pool connection failed.");
    consoleError.mockRestore();
  });
});
