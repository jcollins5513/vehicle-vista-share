/**
 * Type definitions for the Redis client wrapper
 */

// Redis command options
export interface RedisCommandOptions {
  nx?: boolean;
  ex?: number;
  [key: string]: unknown;
}

// Redis client options
export interface RedisOptions {
  url?: string;
  token?: string;
  debug?: boolean;
}

// Redis client interface with generic type support
export interface RedisClient {
  // String operations with generic type support
  get<T = string>(key: string): Promise<T | null>;
  set<T = string>(
    key: string,
    value: T,
    ttl?: number | { ex?: number; nx?: boolean; xx?: boolean }
  ): Promise<'OK'>;
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
  
  // Raw command execution (internal use only)
  sendCommand<T = unknown>(command: string, args?: (string | number | boolean)[], options?: { returnBuffers?: boolean }): Promise<T>;
  
  // JSON operations
  jsonGet<T = unknown>(key: string): Promise<T | null>;
  jsonSet<T = unknown>(
    key: string,
    value: T,
    ttl?: number | { ex?: number; nx?: boolean; xx?: boolean }
  ): Promise<'OK'>;
}

// Upstash Redis module augmentation
declare module '@upstash/redis' {
  interface Redis {
    // String operations
    get(key: string): Promise<string | null>;
    set(key: string, value: string, options?: RedisCommandOptions): Promise<'OK'>;
    del(...keys: string[]): Promise<number>;
    del(keys: string[]): Promise<number>;
    exists(...keys: string[]): Promise<number>;
    exists(keys: string[]): Promise<number>;
    expire(key: string, seconds: number): Promise<number>;
    ttl(key: string): Promise<number>;
    
    // Hash operations
    hget(key: string, field: string): Promise<string | null>;
    hgetall(key: string): Promise<Record<string, string>>;
    hset(key: string, field: string, value: string): Promise<number>;
    hset(key: string, obj: Record<string, string>): Promise<number>;
    hmset(key: string, ...args: (string | number)[]): Promise<'OK'>;
    
    // Set operations
    sadd(key: string, ...members: string[]): Promise<number>;
    smembers(key: string): Promise<string[]>;
    
    // Sorted Set operations
    zadd(key: string, ...args: (number | string | 'NX' | 'XX' | 'CH' | 'INCR')[]): Promise<number>;
    zrange(key: string, start: number, stop: number, withScores?: 'WITHSCORES'): Promise<string[]>;
    
    // Key operations
    keys(pattern: string): Promise<string[]>;
    
    // Utility methods
    flushall(): Promise<'OK'>;
    
    // Raw command execution
    sendCommand<T = unknown>(command: string, ...args: (string | number)[]): Promise<T>;
  }
}

export interface RedisClient {
  // String operations
  get(key: string): Promise<string | null>;
  set(
    key: string,
    value: string,
    ttl?: number | { ex?: number; nx?: boolean; xx?: boolean }
  ): Promise<'OK'>;
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
