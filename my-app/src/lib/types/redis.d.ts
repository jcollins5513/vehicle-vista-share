/**
 * Type definitions for the Redis client wrapper
 */

declare module '@upstash/redis' {
  interface Redis {
    // String operations
    get(key: string): Promise<string | null>;
    set(key: string, value: string): Promise<'OK'>;
    del(keys: string | string[]): Promise<number>;
    exists(keys: string | string[]): Promise<number>;
    expire(key: string, seconds: number): Promise<number>;
    ttl(key: string): Promise<number>;
    
    // Hash operations
    hget(key: string, field: string): Promise<string | null>;
    hgetall(key: string): Promise<Record<string, string>>;
    hset(key: string, field: string, value: string): Promise<number>;
    hmset(key: string, obj: Record<string, string>): Promise<'OK'>;
    
    // Set operations
    sadd(key: string, ...members: string[]): Promise<number>;
    smembers(key: string): Promise<string[]>;
    
    // Sorted Set operations
    zadd(key: string, ...args: (number | string | { nx?: boolean })[]): Promise<number>;
    zrange(key: string, start: number, stop: number, withScores?: boolean): Promise<string[]>;
    
    // Key operations
    keys(pattern: string): Promise<string[]>;
    
    // Utility methods
    flushall(): Promise<'OK'>;
  }
}

export interface RedisClient {
  // String operations
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttl?: number): Promise<'OK'>;
  del(keys: string | string[]): Promise<number>;
  exists(keys: string | string[]): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
  ttl(key: string): Promise<number>;
  
  // Hash operations
  hget(key: string, field: string): Promise<string | null>;
  hgetall(key: string): Promise<Record<string, string>>;
  hset(key: string, field: string, value: string): Promise<number>;
  hmset(key: string, obj: Record<string, string>): Promise<'OK'>;
  
  // Set operations
  sadd(key: string, ...members: string[]): Promise<number>;
  smembers(key: string): Promise<string[]>;
  
  // Sorted Set operations
  zadd(key: string, score: number, member: string, options?: { nx?: boolean }): Promise<number>;
  zrange(key: string, start: number, stop: number, withScores?: boolean): Promise<string[]>;
  
  // Key operations
  keys(pattern: string): Promise<string[]>;
  
  // Utility methods
  flushAll(): Promise<'OK'>;
}

export interface RedisOptions {
  url?: string;
  token?: string;
  debug?: boolean;
}
