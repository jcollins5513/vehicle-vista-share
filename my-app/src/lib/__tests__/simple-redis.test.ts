// Set up test environment variables before any imports
process.env.UPSTASH_REDIS_REST_URL = 'https://test-redis-url.com';
process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';

// Mock the Redis module before importing the client
jest.mock('@upstash/redis');

// Import the mock after setting up the mock
const { Redis } = require('@upstash/redis');

// Import the Redis client after setting up the mock
import { createRedisClient } from '../redis';

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

  it('should create a Redis client', () => {
    const redisClient = createRedisClient(mockRedis);
    
    // Verify the client was created with expected methods
    expect(redisClient).toBeDefined();
    expect(typeof redisClient.get).toBe('function');
    expect(typeof redisClient.set).toBe('function');
  });
  
  it('should set a value', async () => {
    const redisClient = createRedisClient(mockRedis);
    const setResult = await redisClient.set('test-key', 'test-value');
    
    // Verify set operation
    expect(setResult).toBe('OK');
    expect(mockRedis.set).toHaveBeenCalledTimes(1);
    expect(mockRedis.set).toHaveBeenCalledWith('test-key', 'test-value');
  });
  
  it('should get a value', async () => {
    const redisClient = createRedisClient(mockRedis);
    const getResult = await redisClient.get('test-key');
    
    // Verify get operation
    expect(getResult).toBe('test-value');
    expect(mockRedis.get).toHaveBeenCalledTimes(1);
    expect(mockRedis.get).toHaveBeenCalledWith('test-key');
  });

  it('should set and get hash values', async () => {
    const redisClient = createRedisClient(mockRedis);
    
    // Mock hset to return 1 (number of fields added)
    mockRedis.hset = jest.fn().mockResolvedValue(1);
    
    // Mock hget to return a value
    mockRedis.hget = jest.fn().mockResolvedValue('hash-value');
    
    // Test hset
    const hsetResult = await redisClient.hset('hash-key', 'field1', 'value1');
    expect(hsetResult).toBe(1);
    expect(mockRedis.hset).toHaveBeenCalledWith('hash-key', 'field1', 'value1');
    
    // Test hget
    const hgetResult = await redisClient.hget('hash-key', 'field1');
    expect(hgetResult).toBe('hash-value');
    expect(mockRedis.hget).toHaveBeenCalledWith('hash-key', 'field1');
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
