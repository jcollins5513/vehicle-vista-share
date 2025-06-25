// Set up environment variables before importing anything else
process.env.UPSTASH_REDIS_REST_URL = 'https://test-redis-url.com';
process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';

// Import the module under test
import { createRedisClient } from '../redis';

// Mock the Redis module
jest.mock('@upstash/redis');

// Import the mock after setting up the mock
const { Redis } = require('@upstash/redis');

// Enable test debugging
console.log('Test file loaded');

describe('Redis Client', () => {
  let redisClient: any;
  let mockRedis: any;
  
  const testKey = 'test:key';
  const testHashKey = 'test:hash';
  const testSetKey = 'test:set';
  const testZsetKey = 'test:zset';

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create a new mock Redis instance
    mockRedis = new Redis();
    
    // Setup default mock implementations
    mockRedis.get.mockResolvedValue(null);
    mockRedis.set.mockResolvedValue('OK');
    mockRedis.del.mockResolvedValue(1);
    mockRedis.hget.mockResolvedValue(null);
    mockRedis.hset.mockResolvedValue(1);
    mockRedis.hmset.mockResolvedValue('OK');
    mockRedis.hgetall.mockResolvedValue({});
    mockRedis.sadd.mockResolvedValue(1);
    mockRedis.smembers.mockResolvedValue([]);
    mockRedis.zadd.mockResolvedValue(1);
    mockRedis.zrange.mockResolvedValue([]);
    mockRedis.keys.mockResolvedValue([]);
    mockRedis.expire.mockResolvedValue(1);
    mockRedis.ttl.mockResolvedValue(-2);
    mockRedis.flushall.mockResolvedValue('OK');
    
    // Create a new Redis client with the mock
    redisClient = createRedisClient(mockRedis);
  });

  describe('String operations', () => {
    it('should set and get a string value', async () => {
      console.log('Running test: should set and get a string value');
      const value = 'test value';
      
      // Mock the Redis methods
      console.log('Setting up mock for set method');
      mockRedis.set.mockImplementation((...args: any[]) => {
        console.log('mockRedis.set called with:', args);
        return Promise.resolve('OK');
      });
      
      console.log('Setting up mock for get method');
      mockRedis.get.mockImplementation((...args: any[]) => {
        console.log('mockRedis.get called with:', args);
        return Promise.resolve(value);
      });
      mockRedis.set.mockResolvedValue('OK');
      mockRedis.get.mockResolvedValue(value);
      
      console.log('Testing set operation');
      try {
        const setResult = await redisClient.set(testKey, value);
        console.log('set result:', setResult);
        expect(setResult).toBe('OK');
        expect(mockRedis.set).toHaveBeenCalledWith(testKey, value, undefined);
      } catch (error) {
        console.error('Error in set operation:', error);
        throw error;
      }
      
      console.log('Testing get operation');
      try {
        const getResult = await redisClient.get(testKey);
        console.log('get result:', getResult);
        expect(getResult).toBe(value);
        expect(mockRedis.get).toHaveBeenCalledWith(testKey);
      } catch (error) {
        console.error('Error in get operation:', error);
        throw error;
      }
    });
  });

  describe('Hash operations', () => {
    it('should set and get a hash field', async () => {
      const field = 'field1';
      const value = 'value1';
      
      // Mock the Redis methods
      mockRedis.hset.mockResolvedValue(1);
      mockRedis.hget.mockResolvedValue(value);
      
      // Test hset
      const hsetResult = await redisClient.hset(testHashKey, field, value);
      expect(hsetResult).toBe(1);
      expect(mockRedis.hset).toHaveBeenCalledWith(testHashKey, field, value);
      
      // Test hget
      const hgetResult = await redisClient.hget(testHashKey, field);
      expect(hgetResult).toBe(value);
      expect(mockRedis.hget).toHaveBeenCalledWith(testHashKey, field);
    });

    it('should set and get multiple hash fields', async () => {
      const hashData = {
        field1: 'value1',
        field2: 'value2',
      };
      
      // Mock the Redis methods
      mockRedis.hmset.mockResolvedValue('OK');
      mockRedis.hgetall.mockResolvedValue(hashData);
      
      // Test hmset
      const hmsetResult = await redisClient.hmset(testHashKey, hashData);
      expect(hmsetResult).toBe('OK');
      expect(mockRedis.hmset).toHaveBeenCalledWith(testHashKey, hashData);
      
      // Test hgetall
      const hgetallResult = await redisClient.hgetall(testHashKey);
      expect(hgetallResult).toEqual(hashData);
      expect(mockRedis.hgetall).toHaveBeenCalledWith(testHashKey);
    });
  });

  describe('Set operations', () => {
    it('should add members to a set', async () => {
      const member = 'test-member';
      
      // Mock the Redis method
      mockRedis.sadd.mockResolvedValue(1);
      
      // Test sadd
      const result = await redisClient.sadd(testSetKey, member);
      expect(result).toBe(1);
      expect(mockRedis.sadd).toHaveBeenCalledWith(testSetKey, member);
    });
  });

  describe('Key operations', () => {
    it('should set and check key expiration', async () => {
      // Mock the Redis methods
      mockRedis.expire.mockResolvedValue(1);
      mockRedis.ttl.mockResolvedValue(60);
      
      // Test expire
      const expireResult = await redisClient.expire(testKey, 60);
      expect(expireResult).toBe(1);
      expect(mockRedis.expire).toHaveBeenCalledWith(testKey, 60);
      
      // Test ttl
      const ttlResult = await redisClient.ttl(testKey);
      expect(ttlResult).toBe(60);
      expect(mockRedis.ttl).toHaveBeenCalledWith(testKey);
    });
  });
});
