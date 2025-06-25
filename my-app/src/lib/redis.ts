import Redis from 'ioredis';

// Get Redis connection details from environment variables
const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

if (!REDIS_URL || !REDIS_TOKEN) {
  throw new Error('Missing required Redis environment variables');
}

// Create a Redis client
const redis = new Redis({
  host: new URL(REDIS_URL).hostname,
  port: Number(new URL(REDIS_URL).port),
  username: REDIS_URL.split('//')[1].split(':')[0],
  password: REDIS_TOKEN,
  tls: {},
  maxRetriesPerRequest: 3,
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 100, 5000);
    return delay;
  },
});

// Utility functions for common operations
export const redisClient = {
  // String operations
  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (ttl) {
      await redis.set(key, value, 'EX', ttl);
    } else {
      await redis.set(key, value);
    }
  },

  async get(key: string): Promise<string | null> {
    return redis.get(key);
  },

  async del(key: string): Promise<number> {
    return redis.del(key);
  },

  // Hash operations
  async hset(key: string, field: string, value: string): Promise<number> {
    return redis.hset(key, field, value);
  },

  async hget(key: string, field: string): Promise<string | null> {
    return redis.hget(key, field);
  },

  async hgetall(key: string): Promise<Record<string, string>> {
    return redis.hgetall(key);
  },

  // Set operations
  async sadd(key: string, ...members: string[]): Promise<number> {
    return redis.sadd(key, ...members);
  },

  async smembers(key: string): Promise<string[]> {
    return redis.smembers(key);
  },

  // Sorted Set operations
  async zadd(key: string, ...args: (string | number)[]): Promise<number> {
    return redis.zadd(key, ...args);
  },

  async zrange(key: string, start: number, stop: number, withScores = false): Promise<string[]> {
    const args: (string | number)[] = [key, start, stop];
    if (withScores) {
      args.push('WITHSCORES');
    }
    return redis.zrange(...args as [string, number, number, ...string[]]);
  },

  async keys(pattern: string): Promise<string[]> {
    return redis.keys(pattern);
  },

  // Key operations
  async exists(key: string): Promise<number> {
    return redis.exists(key);
  },

  async expire(key: string, seconds: number): Promise<number> {
    return redis.expire(key, seconds);
  },

  // Close the Redis connection
  async disconnect(): Promise<void> {
    await redis.quit();
  },
};

export default redis;
