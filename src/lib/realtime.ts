import { Client, Pool } from "pg";

import { getDatabaseUrl } from "@/lib/config";
import type { RealtimeEventPayload } from "@/lib/types";

type EventSubscriber = (payload: RealtimeEventPayload) => void;
type StreamSubscriber = {
  notify: EventSubscriber;
  close: () => void;
};

const encoder = new TextEncoder();
const globalForRealtime = globalThis as unknown as {
  eventPool?: Pool;
  eventListenerPromise?: Promise<Client>;
  eventSubscribers?: Map<string, Set<StreamSubscriber>>;
};

function getSubscribers() {
  if (!globalForRealtime.eventSubscribers) {
    globalForRealtime.eventSubscribers = new Map<string, Set<StreamSubscriber>>();
  }

  return globalForRealtime.eventSubscribers;
}

function getPool() {
  if (!globalForRealtime.eventPool) {
    globalForRealtime.eventPool = new Pool({
      connectionString: getDatabaseUrl(),
    });
    globalForRealtime.eventPool.on("error", () => {
      console.error("[realtime] Database notification pool connection failed.");
    });
  }

  return globalForRealtime.eventPool;
}

function ensureListener() {
  if (!globalForRealtime.eventListenerPromise) {
    const client = new Client({
      connectionString: getDatabaseUrl(),
      connectionTimeoutMillis: 10_000,
    });

    const disconnect = () => {
      if (globalForRealtime.eventListenerPromise !== listenerPromise) {
        return;
      }

      globalForRealtime.eventListenerPromise = undefined;
      for (const subscribers of Array.from(getSubscribers().values())) {
        for (const subscriber of Array.from(subscribers)) {
          subscriber.close();
        }
      }

      void client.end().catch(() => {});
    };

    client.on("error", disconnect);
    client.on("end", disconnect);

    const listenerPromise = Promise.resolve().then(async () => {
      try {
        await client.connect();
        await client.query("LISTEN event_updates");
      } catch (error) {
        disconnect();
        throw error;
      }

      client.on("notification", (message) => {
        if (globalForRealtime.eventListenerPromise !== listenerPromise) {
          return;
        }

        const payload = parseRealtimePayload(message.payload);
        if (!payload) {
          return;
        }

        const subscribers = getSubscribers().get(payload.eventId);
        if (!subscribers) {
          return;
        }

        for (const subscriber of subscribers) {
          subscriber.notify(payload);
        }
      });

      return client;
    });

    globalForRealtime.eventListenerPromise = listenerPromise;
  }

  return globalForRealtime.eventListenerPromise;
}

function parseRealtimePayload(rawPayload?: string | null): RealtimeEventPayload | null {
  if (!rawPayload) {
    return null;
  }

  try {
    return JSON.parse(rawPayload) as RealtimeEventPayload;
  } catch {
    return {
      eventId: rawPayload,
      kind: "event-updated",
    };
  }
}

export async function publishEventUpdate(payload: RealtimeEventPayload) {
  await getPool().query("SELECT pg_notify('event_updates', $1)", [JSON.stringify(payload)]);
}

export async function createEventStream(
  eventId: string,
  signal?: AbortSignal,
  onClose?: () => void,
) {
  const listenerPromise = ensureListener();
  await listenerPromise;
  if (globalForRealtime.eventListenerPromise !== listenerPromise) {
    throw new Error("Realtime listener disconnected during initialization.");
  }

  let cleanup = () => {};

  return new ReadableStream<Uint8Array>({
    start(controller) {
      const subscribers = getSubscribers();
      let closed = false;
      let heartbeat: ReturnType<typeof setInterval> | null = null;

      const removeSubscriber = () => {
        const current = subscribers.get(eventId);
        current?.delete(subscriber);
        if (current && current.size === 0) {
          subscribers.delete(eventId);
        }
      };

      const cleanupStream = () => {
        if (closed) {
          return;
        }

        closed = true;
        if (heartbeat) {
          clearInterval(heartbeat);
        }
        signal?.removeEventListener("abort", handleAbort);
        removeSubscriber();
        onClose?.();
      };

      const closeStream = () => {
        cleanupStream();
        try {
          controller.close();
        } catch {
          // Cancellation may have already closed the controller.
        }
      };

      const safeEnqueue = (chunk: string) => {
        if (closed) {
          return;
        }

        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          cleanupStream();
        }
      };

      const callback: EventSubscriber = (payload) => {
        safeEnqueue(`event: event-update\ndata: ${JSON.stringify(payload)}\n\n`);
      };

      const handleAbort = () => {
        closeStream();
      };

      const subscriber: StreamSubscriber = { notify: callback, close: closeStream };
      cleanup = cleanupStream;

      if (signal?.aborted) {
        closeStream();
        return;
      }

      const existing = subscribers.get(eventId) ?? new Set<StreamSubscriber>();
      existing.add(subscriber);
      subscribers.set(eventId, existing);

      safeEnqueue("event: connected\ndata: {}\n\n");
      // Refresh snapshots after reconnecting, including updates missed during an outage.
      callback({ eventId, kind: "event-updated" });
      heartbeat = setInterval(() => {
        safeEnqueue(": heartbeat\n\n");
      }, 15_000);

      signal?.addEventListener("abort", handleAbort, { once: true });
    },
    cancel() {
      cleanup();
    },
  });
}
