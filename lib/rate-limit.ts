/**
 * Lightweight in-memory rate limiter using a fixed-window counter.
 *
 * This is intentionally dependency-free so it works in local dev and in a
 * single-instance deployment without extra infrastructure. For a multi-instance
 * / serverless deployment this should be backed by a shared store such as Redis
 * (e.g. `@upstash/ratelimit`) so the window is consistent across instances.
 */

export interface RateLimitOptions {
  /** Maximum number of requests allowed within the window. */
  limit: number;
  /** Length of the window in milliseconds. */
  windowMs: number;
}

export interface RateLimitResult {
  /** Whether the request is allowed. */
  success: boolean;
  /** Configured maximum requests in the window. */
  limit: number;
  /** Requests remaining in the current window. */
  remaining: number;
  /** Epoch ms at which the current window resets. */
  reset: number;
}

interface WindowState {
  count: number;
  reset: number;
}

/**
 * A reusable fixed-window rate limiter. Each distinct identifier (e.g. a user
 * id or IP address) gets its own counter that resets every `windowMs`.
 */
export class RateLimiter {
  private readonly limit: number;
  private readonly windowMs: number;
  private readonly store = new Map<string, WindowState>();

  constructor({ limit, windowMs }: RateLimitOptions) {
    if (limit <= 0) throw new Error("rate limit must be greater than 0");
    if (windowMs <= 0) throw new Error("windowMs must be greater than 0");
    this.limit = limit;
    this.windowMs = windowMs;
  }

  /**
   * Records a hit for `identifier` and reports whether it is within the limit.
   * @param now overridable clock, primarily for deterministic tests.
   */
  check(identifier: string, now: number = Date.now()): RateLimitResult {
    const existing = this.store.get(identifier);

    if (!existing || now >= existing.reset) {
      const reset = now + this.windowMs;
      this.store.set(identifier, { count: 1, reset });
      return {
        success: true,
        limit: this.limit,
        remaining: this.limit - 1,
        reset,
      };
    }

    existing.count += 1;
    const remaining = Math.max(0, this.limit - existing.count);

    return {
      success: existing.count <= this.limit,
      limit: this.limit,
      remaining,
      reset: existing.reset,
    };
  }

  /** Removes expired entries so the map does not grow unbounded. */
  cleanup(now: number = Date.now()): void {
    for (const [key, state] of this.store) {
      if (now >= state.reset) this.store.delete(key);
    }
  }

  /** Clears all tracked state. Mainly useful for tests. */
  reset(): void {
    this.store.clear();
  }
}

/**
 * Builds standard rate-limit response headers from a result.
 */
export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.reset / 1000)),
  };
}

/**
 * Derives a best-effort client identifier from a request. Prefers a provided
 * user id (authenticated user), then common proxy headers, then a fallback.
 */
export function getClientIdentifier(
  req: Request,
  userId?: string | null
): string {
  if (userId) return `user:${userId}`;

  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) return `ip:${forwardedFor.split(",")[0].trim()}`;

  const realIp = req.headers.get("x-real-ip");
  if (realIp) return `ip:${realIp.trim()}`;

  return "ip:unknown";
}
