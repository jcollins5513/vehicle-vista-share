// Set up environment variables before importing anything else
process.env.UPSTASH_REDIS_REST_URL = 'https://test-redis-url.com';
process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';

console.log('Environment variables set:', {
  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN ? '***' : 'undefined'
});

// Import the module under test
import { createRedisClient } from '../redis';

// Mock the Redis module
console.log('Setting up Redis mock');
jest.mock('@upstash/redis');

// Import the mock after setting up the mock
const { Redis } = require('@upstash/redis');

console.log('Mock Redis imported:', { Redis });

describe('Redis Client', () => {
  let redisClient: any;
  let mockRedis: any;
  
  beforeEach(() => {
    console.log('\n--- Running beforeEach ---');
    
    // Create a new mock Redis instance
    console.log('Creating new mock Redis instance');
    mockRedis = new Redis();
    
    console.log('Mock Redis instance created:', mockRedis);
    
    // Setup default mock implementations with logging
    mockRedis.get.mockImplementation((key: string) => {
      console.log(`mockRedis.get called with key: ${key}`);
      return Promise.resolve('test-value');
    });
    
    mockRedis.set.mockImplementation((key: string, value: string) => {
      console.log(`mockRedis.set called with key: ${key}, value: ${value}`);
      return Promise.resolve('OK');
    });
    
    console.log('Creating Redis client with mock');
    redisClient = createRedisClient(mockRedis);
    console.log('Redis client created:', redisClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should set a value', async () => {
    console.log('\n--- Running test: should set a value ---');
    try {
      console.log('Calling redisClient.set');
      const result = await redisClient.set('test-key', 'test-value');
      console.log('redisClient.set result:', result);
      
      console.log('Checking expectations');
      expect(result).toBe('OK');
      expect(mockRedis.set).toHaveBeenCalledWith('test-key', 'test-value', undefined);
      console.log('Test passed');
    } catch (error) {
      console.error('Test failed with error:', error);
      throw error;
    }
  });

  it('should get a value', async () => {
    console.log('\n--- Running test: should get a value ---');
    try {
      console.log('Calling redisClient.get');
      const result = await redisClient.get('test-key');
      console.log('redisClient.get result:', result);
      
      console.log('Checking expectations');
      expect(result).toBe('test-value');
      expect(mockRedis.get).toHaveBeenCalledWith('test-key');
      console.log('Test passed');
    } catch (error) {
      console.error('Test failed with error:', error);
      throw error;
    }
  });
});
