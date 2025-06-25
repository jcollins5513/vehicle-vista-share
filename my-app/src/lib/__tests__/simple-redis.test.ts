// Set up test environment variables before any imports
process.env.UPSTASH_REDIS_REST_URL = 'https://test-redis-url.com';
process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';

// Mock the Redis module before importing the client
jest.mock('@upstash/redis');

// Import the mock after setting up the mock
const { Redis } = require('@upstash/redis');

// Import the Redis client after setting up the mock
import redis, { redisClient, createRedisClient } from '../redis';

describe('Redis Client', () => {
  let mockRedis: any;
  
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Create a new mock Redis instance
    mockRedis = new Redis();
    
    // Setup default mock implementations
    mockRedis.get = jest.fn().mockResolvedValue('test-value');
    mockRedis.set = jest.fn().mockResolvedValue('OK');
  });

  it('should have the expected methods', () => {
    // Verify the client was created with expected methods
    expect(redis).toBeDefined();
    expect(typeof redis.get).toBe('function');
    expect(typeof redis.set).toBe('function');
    expect(typeof redis.jsonGet).toBe('function');
    expect(typeof redis.jsonSet).toBe('function');
    expect(redisClient).toBe(redis); // Ensure redisClient is the same as redis
  });
  
  it('should create a Redis client with createRedisClient', () => {
    const testClient = createRedisClient();
    expect(testClient).toBeDefined();
    expect(typeof testClient.get).toBe('function');
    expect(typeof testClient.set).toBe('function');
  });
  
  it('should set a string value', async () => {
    const setResult = await redis.set('test-key', 'test-value');
    
    // Verify set operation
    expect(setResult).toBe('OK');
    expect(mockRedis.set).toHaveBeenCalledTimes(1);
    expect(mockRedis.set).toHaveBeenCalledWith('test-key', 'test-value', undefined);
  });
  
  it('should set an object value', async () => {
    const testObj = { name: 'test', value: 123 };
    const setResult = await redis.set('test-obj', testObj);
    
    // Verify set operation
    expect(setResult).toBe('OK');
    expect(mockRedis.set).toHaveBeenCalledTimes(1);
    expect(mockRedis.set).toHaveBeenCalledWith('test-obj', JSON.stringify(testObj), undefined);
  });
  
  it('should get a string value', async () => {
    mockRedis.get.mockResolvedValueOnce('test-value');
    const getResult = await redis.get('test-key');
    
    // Verify get operation
    expect(getResult).toBe('test-value');
    expect(mockRedis.get).toHaveBeenCalledTimes(1);
    expect(mockRedis.get).toHaveBeenCalledWith('test-key');
  });
  
  it('should get and parse a JSON value', async () => {
    const testObj = { name: 'test', value: 123 };
    mockRedis.get.mockResolvedValueOnce(JSON.stringify(testObj));
    const getResult = await redis.get<{ name: string; value: number }>('test-json');
    
    // Verify get operation with JSON parsing
    expect(getResult).toEqual(testObj);
    expect(mockRedis.get).toHaveBeenCalledTimes(1);
    expect(mockRedis.get).toHaveBeenCalledWith('test-json');
  });
  
  it('should handle JSON get/set operations', async () => {
    const testData = { name: 'test', value: 123, items: ['a', 'b', 'c'] };
    
    // Test jsonSet
    const setResult = await redis.jsonSet('test-json', testData);
    expect(setResult).toBe('OK');
    expect(mockRedis.set).toHaveBeenCalledWith('test-json', JSON.stringify(testData), undefined);
    
    // Test jsonGet
    mockRedis.get.mockResolvedValueOnce(JSON.stringify(testData));
    const getResult = await redis.jsonGet<typeof testData>('test-json');
    expect(getResult).toEqual(testData);
  });

  it('should set and get hash values', async () => {
    // Mock hset and hget implementations
    mockRedis.hset = jest.fn().mockResolvedValue(1);
    mockRedis.hget = jest.fn().mockResolvedValue('value1');
    
    // Test hset and hget
    await redis.hset('test-hash', 'field1', 'value1');
    const hgetResult = await redis.hget('test-hash', 'field1');
    
    expect(hgetResult).toBe('value1');
    expect(mockRedis.hset).toHaveBeenCalledWith('test-hash', 'field1', 'value1');
    expect(mockRedis.hget).toHaveBeenCalledWith('test-hash', 'field1');
  });

  it('should handle sorted set operations', async () => {
    // Mock zadd and zrange implementations
    mockRedis.zadd = jest.fn().mockResolvedValue(1);
    mockRedis.zrange = jest.fn().mockResolvedValue(['member1', '1']);
    
    // Test zadd and zrange
    await redis.zadd('test-zset', 1, 'member1');
    const zrangeResult = await redis.zrange('test-zset', 0, -1, true);
    
    expect(zrangeResult).toContain('member1');
    expect(mockRedis.zadd).toHaveBeenCalledWith('test-zset', 1, 'member1');
    expect(mockRedis.zrange).toHaveBeenCalledWith('test-zset', 0, -1, 'WITHSCORES');
  });

  it('should delete a key', async () => {
    const redisClient = createRedisClient(mockRedis);
    
    // Mock del to return 1 (number of keys deleted)
    mockRedis.del = jest.fn().mockResolvedValue(1);
    
    const delResult = await redisClient.del('test-key');
    expect(delResult).toBe(1);
    expect(mockRedis.del).toHaveBeenCalledWith('test-key');
  });

  it('should check if a key exists', async () => {
    const redisClient = createRedisClient(mockRedis);
    
    // Mock exists to return 1 (key exists)
    mockRedis.exists = jest.fn().mockResolvedValue(1);
    
    const existsResult = await redisClient.exists('test-key');
    expect(existsResult).toBe(1);
    expect(mockRedis.exists).toHaveBeenCalledWith('test-key');
  });
});
