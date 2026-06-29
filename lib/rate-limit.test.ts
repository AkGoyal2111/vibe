import { describe, it, expect } from "vitest";
import {
  RateLimiter,
  rateLimitHeaders,
  getClientIdentifier,
} from "./rate-limit";

describe("RateLimiter", () => {
  it("allows requests up to the configured limit", () => {
    const limiter = new RateLimiter({ limit: 3, windowMs: 1000 });
    const now = 1_000;

    expect(limiter.check("a", now).success).toBe(true);
    expect(limiter.check("a", now).success).toBe(true);
    const third = limiter.check("a", now);
    expect(third.success).toBe(true);
    expect(third.remaining).toBe(0);
  });

  it("blocks requests once the limit is exceeded", () => {
    const limiter = new RateLimiter({ limit: 2, windowMs: 1000 });
    limiter.check("a", 0);
    limiter.check("a", 0);
    const blocked = limiter.check("a", 0);
    expect(blocked.success).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("resets the counter after the window elapses", () => {
    const limiter = new RateLimiter({ limit: 1, windowMs: 1000 });
    expect(limiter.check("a", 0).success).toBe(true);
    expect(limiter.check("a", 500).success).toBe(false);
    // Window has rolled over.
    expect(limiter.check("a", 1000).success).toBe(true);
  });

  it("tracks identifiers independently", () => {
    const limiter = new RateLimiter({ limit: 1, windowMs: 1000 });
    expect(limiter.check("a", 0).success).toBe(true);
    expect(limiter.check("b", 0).success).toBe(true);
    expect(limiter.check("a", 0).success).toBe(false);
  });

  it("reports remaining count accurately", () => {
    const limiter = new RateLimiter({ limit: 5, windowMs: 1000 });
    expect(limiter.check("a", 0).remaining).toBe(4);
    expect(limiter.check("a", 0).remaining).toBe(3);
  });

  it("cleanup removes expired entries", () => {
    const limiter = new RateLimiter({ limit: 1, windowMs: 1000 });
    limiter.check("a", 0);
    limiter.cleanup(2000);
    // After cleanup the identifier starts fresh.
    expect(limiter.check("a", 2000).remaining).toBe(0);
  });

  it("rejects invalid configuration", () => {
    expect(() => new RateLimiter({ limit: 0, windowMs: 1000 })).toThrow();
    expect(() => new RateLimiter({ limit: 5, windowMs: 0 })).toThrow();
  });
});

describe("rateLimitHeaders", () => {
  it("builds standard X-RateLimit-* headers", () => {
    const headers = rateLimitHeaders({
      success: true,
      limit: 10,
      remaining: 7,
      reset: 5000,
    });
    expect(headers["X-RateLimit-Limit"]).toBe("10");
    expect(headers["X-RateLimit-Remaining"]).toBe("7");
    expect(headers["X-RateLimit-Reset"]).toBe("5");
  });
});

describe("getClientIdentifier", () => {
  it("prefers an authenticated user id", () => {
    const req = new Request("http://localhost");
    expect(getClientIdentifier(req, "user-123")).toBe("user:user-123");
  });

  it("falls back to the x-forwarded-for header", () => {
    const req = new Request("http://localhost", {
      headers: { "x-forwarded-for": "203.0.113.1, 10.0.0.1" },
    });
    expect(getClientIdentifier(req)).toBe("ip:203.0.113.1");
  });

  it("returns a stable fallback when nothing is available", () => {
    const req = new Request("http://localhost");
    expect(getClientIdentifier(req)).toBe("ip:unknown");
  });
});
