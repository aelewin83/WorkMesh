import type { NextRequest } from "next/server";

type Bucket = { count: number; resetAt: number };
type LimitOptions = { key: string; limit: number; windowMs: number };

const buckets = new Map<string, Bucket>();

export class RateLimitError extends Error {
  readonly status = 429;
  readonly code = "RATE_LIMITED";
  constructor(public readonly retryAfterSeconds: number) {
    super("Too many requests. Please wait a moment and try again.");
  }
}

export function assertRateLimit(request: NextRequest, options: LimitOptions) {
  const now = Date.now();
  const identity = clientIdentity(request);
  const bucketKey = `${options.key}:${identity}`;
  const current = buckets.get(bucketKey);
  if (!current || current.resetAt <= now) {
    buckets.set(bucketKey, { count: 1, resetAt: now + options.windowMs });
    return;
  }
  current.count += 1;
  if (current.count > options.limit) {
    throw new RateLimitError(Math.ceil((current.resetAt - now) / 1000));
  }
}

function clientIdentity(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || request.headers.get("cf-connecting-ip") || "local";
}
