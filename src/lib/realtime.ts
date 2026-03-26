import { Client, Pool } from "pg";

import { getDatabaseUrl } from "@/lib/config";
import type { RealtimeEventPayload } from "@/lib/types";

type EventSubscriber = (payload: RealtimeEventPayload) => void;

const encoder = new TextEncoder();
const globalForRealtime = globalThis as unknown as {
  eventPool?: Pool;
  eventListenerPromise?: Promise<Client>;
  eventSubscribers?: Map<string, Set<EventSubscriber>>;
};

function getSubscribers() {
  if (!globalForRealtime.eventSubscribers) {
    globalForRealtime.eventSubscribers = new Map<string, Set<EventSubscriber>>();
  }

  return globalForRealtime.eventSubscribers;
}

function getPool() {
  if (!globalForRealtime.eventPool) {
    globalForRealtime.eventPool = new Pool({
      connectionString: getDatabaseUrl(),
    });
  }

  return globalForRealtime.eventPool;
}

async function ensureListener() {
  if (!globalForRealtime.eventListenerPromise) {
    globalForRealtime.eventListenerPromise = (async () => {
      const client = new Client({
        connectionString: getDatabaseUrl(),
      });

      await client.connect();
      await client.query("LISTEN event_updates");

      client.on("notification", (message) => {
        const payload = parseRealtimePayload(message.payload);
        if (!payload) {
          return;
        }

        const subscribers = getSubscribers().get(payload.eventId);
        if (!subscribers) {
          return;
        }

        for (const subscriber of subscribers) {
          subscriber(payload);
        }
      });

      client.on("error", () => {
        globalForRealtime.eventListenerPromise = undefined;
      });

      return client;
    })();
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

export async function createEventStream(eventId: string, signal?: AbortSignal) {
  await ensureListener();

  let cleanup = () => {};

  return new ReadableStream<Uint8Array>({
    start(controller) {
      const subscribers = getSubscribers();
      let closed = false;
      let heartbeat: ReturnType<typeof setInterval> | null = null;

      const removeSubscriber = () => {
        const current = subscribers.get(eventId);
        current?.delete(callback);
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
        cleanupStream();
      };

      cleanup = cleanupStream;

      if (signal?.aborted) {
        cleanupStream();
        return;
      }

      const existing = subscribers.get(eventId) ?? new Set<EventSubscriber>();
      existing.add(callback);
      subscribers.set(eventId, existing);

      safeEnqueue("event: connected\ndata: {}\n\n");
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
