import { Redis as UpstashRedis } from '@upstash/redis';

// Enable debug logging
const DEBUG = process.env.NODE_ENV !== 'production';

// Get Redis connection details from environment variables
const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

// Log environment variables (masking token for security)
if (DEBUG) {
  console.log('[redis] Environment variables:', {
    REDIS_URL,
    REDIS_TOKEN: REDIS_TOKEN ? '***' : 'undefined'
  });
}

// Create a function to create a Redis client
export const createRedisClient = (client?: any) => {
  if (DEBUG) console.log('[redis] Creating Redis client, provided client:', !!client);
  
  // If a client is provided (e.g., for testing), use it
  if (client) {
    if (DEBUG) console.log('[redis] Using provided client');
    return client;
  }

  // Otherwise, create a new Redis client
  if (!REDIS_URL || !REDIS_TOKEN) {
    const error = new Error('Missing required Redis environment variables');
    if (DEBUG) console.error('[redis] Error creating client:', error);
    throw error;
  }

  if (DEBUG) console.log('[redis] Creating new Upstash Redis client');
  const redisClient = new UpstashRedis({
    url: REDIS_URL,
    token: REDIS_TOKEN,
  });
  
  if (DEBUG) console.log('[redis] Redis client created successfully');
  return redisClient;
};

// Create the default Redis client
const redis = createRedisClient();

// Helper function to handle retries
const withRetry = async <T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> => {
  let lastError: Error;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, Math.min(50 * Math.pow(2, i), 2000)));
      }
    }
  }
  
  throw lastError!;
};

// Utility functions for common operations
// Type-safe wrapper for Redis client
type RedisZAddOptions = {
  nx?: boolean;
};

type RedisZAddParams = {
  score: number;
  member: string;
};

// Define Redis client interface
export interface RedisClient {
  // String operations
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttl?: number): Promise<'OK'>;
  del(key: string | string[]): Promise<number>;
  exists(key: string | string[]): Promise<number>;
  
  // Hash operations
  hget(key: string, field: string): Promise<string | null>;
  hgetall(key: string): Promise<Record<string, string>>;
  hset(key: string, field: string, value: string): Promise<number>;
  hmset(key: string, obj: Record<string, string>): Promise<'OK'>;
  
  // Set operations
  sadd(key: string, ...members: string[]): Promise<number>;
  smembers(key: string): Promise<string[]>;
  
  // Sorted Set operations
  zadd(key: string, score: number, member: string, options?: RedisZAddOptions): Promise<number>;
  zrange(key: string, start: number, stop: number, withScores?: boolean): Promise<string[]>;
  
  // Key operations
  keys(pattern: string): Promise<string[]>;
  expire(key: string, seconds: number): Promise<number>;
  ttl(key: string): Promise<number>;
  
  // Utility methods
  flushAll(): Promise<'OK'>;
}

// Create the Redis client wrapper
export const redisClient: RedisClient = {
  // String operations
  async get(key: string): Promise<string | null> {
    return redis.get(key);
  },

  async set(key: string, value: string, ttl?: number): Promise<'OK'> {
    if (ttl) {
      await redis.set(key, value, { ex: ttl });
    } else {
      await redis.set(key, value);
    }
    return 'OK';
  },

  async del(keys: string | string[]): Promise<number> {
    const keyArray = Array.isArray(keys) ? keys : [keys];
    return redis.del(...keyArray);
  },

  async exists(keys: string | string[]): Promise<number> {
    const keyArray = Array.isArray(keys) ? keys : [keys];
    const results = await Promise.all(keyArray.map(k => redis.exists(k)));
    return results.reduce((sum, val) => sum + (val ? 1 : 0), 0);
  },

  // Hash operations
  async hget(key: string, field: string): Promise<string | null> {
    const result = await redis.hget(key, field);
    return result ? String(result) : null;
  },

  async hgetall(key: string): Promise<Record<string, string>> {
    const result = await redis.hgetall(key);
    if (!result) return {};
    
    // Convert all values to strings
    const stringResult: Record<string, string> = {};
    for (const [k, v] of Object.entries(result)) {
      stringResult[k] = String(v);
    }
    return stringResult;
  },

  async hset(key: string, field: string, value: string): Promise<number> {
    const result = await redis.hset(key, { [field]: value });
    return result || 0;
  },
  
  async hmset(key: string, obj: Record<string, string>): Promise<'OK'> {
    // Convert all values to strings
    const stringObj: Record<string, string> = {};
    for (const [k, v] of Object.entries(obj)) {
      stringObj[k] = String(v);
    }
    
    await redis.hset(key, stringObj);
    return 'OK';
  },

  // Set operations
  async sadd(key: string, ...members: string[]): Promise<number> {
    return redis.sadd(key, ...members);
  },

  async smembers(key: string): Promise<string[]> {
    return redis.smembers(key);
  },

  // Sorted Set operations
  async zadd(
    key: string,
    score: number,
    member: string,
    options?: RedisZAddOptions
  ): Promise<number> {
    const command = ['ZADD', key];
    
    if (options?.nx) {
      command.push('NX');
    }
    
    command.push(score.toString(), member);
    
    try {
      const result = await redis.sendCommand<number>(command);
      return result || 0;
    } catch (error) {
      console.error('Redis zadd error:', error);
      throw error;
    }
  },

  async zrange(
    key: string,
    start: number,
    stop: number,
    withScores = false
  ): Promise<string[]> {
    const command = ['ZRANGE', key, start.toString(), stop.toString()];
    
    if (withScores) {
      command.push('WITHSCORES');
    }
    
    try {
      const result = await redis.sendCommand<(string | number)[]>(command);
      return result?.map(String) || [];
    } catch (error) {
      console.error('Redis zrange error:', error);
      throw error;
    }
  },

  // Key operations
  async keys(pattern: string): Promise<string[]> {
    const result = await redis.keys(pattern);
    return Array.isArray(result) ? result.map(String) : [];
  },

  async expire(key: string, seconds: number): Promise<number> {
    const result = await redis.expire(key, seconds);
    return result ? 1 : 0;
  },

  async ttl(key: string): Promise<number> {
    try {
      const result = await redis.ttl(key);
      return result !== null ? result : -2; // -2 means key doesn't exist
    } catch (error) {
      console.error('Redis ttl error:', error);
      return -2;
    }
  },

  // Utility methods
  async flushAll(): Promise<'OK'> {
    await redis.flushall();
    return 'OK';
  },
};

export default redis;
