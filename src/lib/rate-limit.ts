import { tooManyRequests } from "@/lib/errors";

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const globalForRateLimit = globalThis as unknown as {
  rateLimitBuckets?: Map<string, RateLimitBucket>;
  concurrentCounters?: Map<string, number>;
};

function getRateLimitBuckets() {
  if (!globalForRateLimit.rateLimitBuckets) {
    globalForRateLimit.rateLimitBuckets = new Map<string, RateLimitBucket>();
  }

  return globalForRateLimit.rateLimitBuckets;
}

function getConcurrentCounters() {
  if (!globalForRateLimit.concurrentCounters) {
    globalForRateLimit.concurrentCounters = new Map<string, number>();
  }

  return globalForRateLimit.concurrentCounters;
}

function cleanupExpiredBuckets(now: number) {
  const buckets = getRateLimitBuckets();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}

export function enforceRateLimit(
  key: string,
  options: {
    limit: number;
    windowMs: number;
    message: string;
  },
) {
  const now = Date.now();
  cleanupExpiredBuckets(now);

  const buckets = getRateLimitBuckets();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, {
      count: 1,
      resetAt: now + options.windowMs,
    });
    return;
  }

  if (bucket.count >= options.limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    throw tooManyRequests(options.message, retryAfterSeconds);
  }

  bucket.count += 1;
}

export function acquireConcurrencySlot(
  key: string,
  options: {
    limit: number;
    message: string;
    retryAfterSeconds?: number;
  },
) {
  const counters = getConcurrentCounters();
  const current = counters.get(key) ?? 0;

  if (current >= options.limit) {
    throw tooManyRequests(options.message, options.retryAfterSeconds ?? 30);
  }

  counters.set(key, current + 1);

  let released = false;

  return () => {
    if (released) {
      return;
    }

    released = true;

    const nextValue = (counters.get(key) ?? 1) - 1;
    if (nextValue <= 0) {
      counters.delete(key);
      return;
    }

    counters.set(key, nextValue);
  };
}
