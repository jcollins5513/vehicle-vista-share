import Redis from 'ioredis';

// Get Redis connection details from environment variables
const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

if (!REDIS_URL || !REDIS_TOKEN) {
  throw new Error('Missing required Redis environment variables');
}

// Create a Redis client
const redis = new Redis({
  host: REDIS_URL || 'localhost',
  port: parseInt(process.env.UPSTASH_REDIS_REST_PORT || '6379'),
  password: REDIS_TOKEN,
  tls: process.env.NODE_ENV === 'production' ? {} : undefined,
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

// Utility functions for common operations
// Type-safe wrapper for Redis client
type RedisZAddOptions = {
  nx?: boolean;
};

type RedisZAddParams = {
  score: number;
  member: string;
};

export const redisClient = {
  // String operations
  async get(key: string): Promise<string | null> {
    return redis.get(key);
  },

  async set(key: string, value: string, ttl?: number): Promise<'OK' | null> {
    if (ttl) {
      return redis.set(key, value, 'EX', ttl);
    }
    return redis.set(key, value);
  },

  async del(key: string | string[]): Promise<number> {
    if (Array.isArray(key)) {
      return redis.del(...key);
    }
    return redis.del(key);
  },

  async exists(key: string | string[]): Promise<number> {
    if (Array.isArray(key)) {
      return redis.exists(...key);
    }
    return redis.exists(key);
  },

  // Hash operations
  async hget(key: string, field: string): Promise<string | null> {
    return redis.hget(key, field);
  },

  async hgetall(key: string): Promise<Record<string, string>> {
    const result = await redis.hgetall(key);
    return result || {};
  },

  hset(key: string, field: string, value: string): Promise<number>;
  hset(key: string, obj: Record<string, string>): Promise<number>;
  async hset(key: string, fieldOrObj: string | Record<string, string>, value?: string): Promise<number> {
    if (typeof fieldOrObj === 'string' && value !== undefined) {
      return redis.hset(key, fieldOrObj, value);
    } else if (typeof fieldOrObj === 'object') {
      return redis.hset(key, fieldOrObj);
    }
    throw new Error('Invalid arguments for hset');
  },

  // Set operations
  async sadd(key: string, ...members: string[]): Promise<number> {
    return redis.sadd(key, ...members);
  },

  async smembers(key: string): Promise<string[]> {
    return redis.smembers(key);
  },

  // Sorted Set operations
  async zadd(key: string, score: number, member: string, options?: RedisZAddOptions): Promise<number> {
    const args: (string | number)[] = [key];
    if (options?.nx) args.push('NX');
    args.push(score, member);
    return redis.zadd(...(args as [string, ...(string | number)[]]));
  },

  async zrange(key: string, start: number, stop: number, withScores = false): Promise<string[]> {
    if (withScores) {
      return redis.zrange(key, start, stop, 'WITHSCORES');
    }
    return redis.zrange(key, start, stop);
  },

  async keys(pattern: string): Promise<string[]> {
    return redis.keys(pattern);
  },

  // Key operations
  async expire(key: string, seconds: number): Promise<number> {
    return redis.expire(key, seconds);
  },

  async ttl(key: string): Promise<number> {
    return redis.ttl(key);
  },

  // Utility methods
  async flushAll(): Promise<'OK'> {
    return redis.flushall();
  },
};

export default redis;
