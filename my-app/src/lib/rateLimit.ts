import { Redis } from '@upstash/redis';

/*
 * Minimal fixed-window rate limiter on the existing Upstash Redis (HTTP, so it
 * works in Edge middleware). No extra dependency. Fails OPEN on any config or
 * Redis error — rate limiting must never take the site down.
 */

let client: Redis | null = null;
let initialized = false;

function getClient(): Redis | null {
  if (initialized) return client;
  initialized = true;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    client = new Redis({ url, token });
  }
  return client;
}

export async function rateLimit(
  identifier: string,
  opts: { limit: number; windowSec: number; now: number }
): Promise<{ allowed: boolean; remaining: number }> {
  const redis = getClient();
  if (!redis) return { allowed: true, remaining: opts.limit };

  const bucket = Math.floor(opts.now / 1000 / opts.windowSec);
  const key = `ratelimit:${identifier}:${bucket}`;
  try {
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, opts.windowSec);
    }
    return { allowed: count <= opts.limit, remaining: Math.max(0, opts.limit - count) };
  } catch {
    // Never block real traffic because Redis hiccuped.
    return { allowed: true, remaining: opts.limit };
  }
}
