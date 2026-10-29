import type { Request, Response, NextFunction } from 'express';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimiterOptions {
  windowMs: number;
  maxRequests: number;
  message: string;
}

const MAX_TRACKED_KEYS = 5000;

export function createRateLimiter(options: RateLimiterOptions) {
  const store = new Map<string, RateLimitEntry>();

  const pruneExpired = (now: number) => {
    if (store.size < MAX_TRACKED_KEYS) return;
    for (const [key, entry] of store.entries()) {
      if (now >= entry.resetAt) {
        store.delete(key);
      }
    }
    // If still full, evict oldest entry
    if (store.size >= MAX_TRACKED_KEYS) {
      const oldestKey = store.keys().next().value;
      if (oldestKey) store.delete(oldestKey);
    }
  };

  return (req: Request, res: Response, next: NextFunction): void => {
    const now = Date.now();
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    pruneExpired(now);

    const existing = store.get(clientIp);
    if (!existing || now >= existing.resetAt) {
      store.set(clientIp, {
        count: 1,
        resetAt: now + options.windowMs,
      });
      next();
      return;
    }

    existing.count += 1;
    if (existing.count > options.maxRequests) {
      const retryAfterSec = Math.ceil((existing.resetAt - now) / 1000);
      res.setHeader('Retry-After', String(Math.max(1, retryAfterSec)));
      res.status(429).json({ error: options.message });
      return;
    }

    next();
  };
}
