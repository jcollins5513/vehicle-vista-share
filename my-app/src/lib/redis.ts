import { Redis as UpstashRedis } from '@upstash/redis';

type RedisValue = string | number | boolean | object | null;
type RedisClientOptions = { ex?: number; nx?: boolean; xx?: boolean };

// Extend the Upstash Redis client with our custom methods
interface RedisClient extends Omit<UpstashRedis, 'get' | 'set' | 'hset' | 'hgetall' | 'zadd' | 'zrange' | 'zrem'> {
  // Core methods with proper typing
  get<T = string>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, options?: RedisClientOptions | number): Promise<'OK'>;
  jsonGet<T = RedisValue>(key: string): Promise<T | null>;
  jsonSet(
    key: string,
    value: RedisValue,
    options?: RedisClientOptions | number
  ): Promise<'OK'>;
  
  // Hash methods
  hset(key: string, field: string, value: string): Promise<number>;
  hset(key: string, obj: Record<string, string>): Promise<number>;
  hgetall(key: string): Promise<Record<string, string> | null>;
  
  // Sorted set methods
  zadd(key: string, score: number, member: string): Promise<number>;
  zrange<T = string>(key: string, start: number, stop: number, withScores?: boolean): Promise<T[]>;
  zrem(key: string, ...members: string[]): Promise<number>;
  
  // Allow dynamic properties for other Redis commands
  [key: string]: unknown;
}

declare global {
   
  var redis: RedisClient | undefined;
}

const isProduction = process.env.NODE_ENV === 'production';

// Use KV_REST in production, UPSTASH_REDIS in development
const REDIS_CONFIG = {
  url: isProduction ? process.env.KV_REST_API_URL : process.env.UPSTASH_REDIS_REST_URL,
  token: isProduction ? process.env.KV_REST_API_TOKEN : process.env.UPSTASH_REDIS_REST_TOKEN
};

if (!REDIS_CONFIG.url || !REDIS_CONFIG.token) {
  throw new Error(
    `Redis configuration missing for ${isProduction ? 'production' : 'development'} environment. ` +
    `Missing: ${!REDIS_CONFIG.url ? 'URL' : ''} ${!REDIS_CONFIG.token ? 'TOKEN' : ''}`
  );
}

// Create the Redis client instance
function createRedisClient(): RedisClient {
  // Create base client
  const client = new UpstashRedis({
    url: REDIS_CONFIG.url!,
    token: REDIS_CONFIG.token!,
    retry: {
      retries: 3,
      backoff: (retryCount) => {
        const delay = Math.min(Math.exp(retryCount) * 50, 1000);
        console.log(`[Redis] Retry ${retryCount + 1}, delay: ${delay}ms`);
        return delay;
      }
    }
  }) as unknown as RedisClient;

  // Helper function to handle Redis commands with error handling
  const withErrorHandling = async <T>(fn: () => Promise<T>): Promise<T> => {
    try {
      return await fn();
    } catch (error) {
      console.error('Redis operation failed:', error);
      throw error;
    }
  };

  // Save original methods
  const originalGet = client.get.bind(client);
  const originalSet = client.set.bind(client);
  const originalHset = client.hset?.bind(client) ||
    ((...args: unknown[]) => client.command('hset', ...args));
  const originalHgetall = client.hgetall?.bind(client) || 
    (async (key: string) => client.command('hgetall', key));
  const originalZadd = client.zadd?.bind(client) ||
    ((...args: unknown[]) => client.command('zadd', ...args));
  const originalZrange = client.zrange?.bind(client) ||
    ((...args: unknown[]) => client.command('zrange', ...args));
  const originalZrem = client.zrem?.bind(client) ||
    ((...args: unknown[]) => client.command('zrem', ...args));

  // Override get with JSON parsing
  client.get = async function<T = string>(key: string): Promise<T | null> {
    return withErrorHandling(async () => {
      const result = await originalGet(key);
      if (result === null) return null;
      
      if (typeof result === 'string') {
        try {
          return JSON.parse(result) as T;
        } catch {
          // If not valid JSON, return as string
          return result as unknown as T;
        }
      }
      return result as T;
    });
  };

  // Override set with JSON stringification
  client.set = async function<T>(
    key: string,
    value: T,
    options: RedisClientOptions | number = {}
  ): Promise<'OK'> {
    return withErrorHandling(async () => {
      const opts: RedisClientOptions =
        typeof options === 'number' ? { ex: options } : options;

      // Handle primitive values directly
      if (
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean'
      ) {
        return originalSet(key, value, opts);
      }

      // Handle object values with JSON stringification
      if (value !== null && typeof value === 'object') {
        const serializedValue = JSON.stringify(value);
        return originalSet(key, serializedValue, opts);
      }

      throw new Error(`Unsupported value type for Redis SET: ${typeof value}`);
    });
  };

  // Add jsonGet convenience method
  client.jsonGet = async function<T = RedisValue>(key: string): Promise<T | null> {
    return withErrorHandling(async () => {
      const value = await originalGet<string>(key);
      if (value === null) return null;
      
      // If value is already an object, return it directly
      if (typeof value === 'object') {
        return value as T;
      }
      
      // Otherwise, try to parse it as JSON
      try {
        return JSON.parse(value) as T;
      } catch (e) {
        console.error(`Error parsing JSON for key ${key}:`, e);
        return null;
      }
    });
  };

  // Add jsonSet convenience method
  client.jsonSet = async function(
    key: string,
    value: RedisValue,
    options: RedisClientOptions | number = {}
  ): Promise<'OK'> {
    return withErrorHandling(async () => {
      const opts: RedisClientOptions =
        typeof options === 'number' ? { ex: options } : options;
      const serialized = JSON.stringify(value);
      return originalSet(key, serialized, opts);
    });
  };

  // Implement hash methods
  client.hset = async function(
    key: string, 
    fieldOrObj: string | Record<string, string>, 
    value?: string
  ): Promise<number> {
    return withErrorHandling(async () => {
      if (typeof fieldOrObj === 'string' && value !== undefined) {
        return originalHset(key, fieldOrObj, value);
      } else if (typeof fieldOrObj === 'object' && fieldOrObj !== null) {
        return originalHset(key, fieldOrObj);
      }
      throw new Error('Invalid arguments for hset');
    });
  };

  client.hgetall = async function(key: string): Promise<Record<string, string> | null> {
    return withErrorHandling(async () => {
      const result = await originalHgetall(key);
      return result as Record<string, string>;
    });
  };

  // Implement sorted set methods
  client.zadd = async function(
    key: string, 
    score: number, 
    member: string
  ): Promise<number> {
    return withErrorHandling(async () => {
      return originalZadd(key, { score, member });
    });
  };

  client.zrange = async function<T = string>(
    key: string, 
    start: number, 
    stop: number, 
    withScores = false
  ): Promise<T[]> {
    return withErrorHandling(async () => {
      const args: unknown[] = [key, start, stop];
      if (withScores) {
        args.push('WITHSCORES');
      }
      return originalZrange(...args);
    });
  };

  client.zrem = async function(
    key: string, 
    ...members: string[]
  ): Promise<number> {
    return withErrorHandling(async () => {
      return originalZrem(key, ...members);
    });
  };

  return client;
}

// Create or reuse Redis client
const redis: RedisClient = global.redis || createRedisClient();

// Cache the instance in development to prevent too many connections
if (process.env.NODE_ENV !== 'production' && !global.redis) {
  global.redis = redis;
}

// Test Redis connection on startup
async function testRedisConnection() {
  try {
    await redis.ping();
    console.log('[Redis] Connection successful');
  } catch (error) {
    console.error('[Redis] Connection failed:', error);
    throw error;
  }
}

// Only test connection if not in test environment
if (process.env.NODE_ENV !== 'test') {
  testRedisConnection().catch(console.error);
}

// Export the Redis instance
export const CACHE_KEY = 'showroom:data';
export const CACHE_TTL = parseInt(process.env.CACHE_TTL_HOURS || '4') * 60 * 60;

export default redis;
export const redisClient = redis;
