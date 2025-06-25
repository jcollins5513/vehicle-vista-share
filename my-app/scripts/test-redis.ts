import { redis } from '../src/lib/redis';

async function testRedis() {
  try {
    console.log('Testing Redis connection...');
    
    // Test basic set/get
    const testKey = 'test:key';
    const testValue = 'test-value';
    
    console.log('Setting key...');
    await redis.set(testKey, testValue);
    
    console.log('Getting key...');
    const value = await redis.get(testKey);
    console.log('Retrieved value:', value);
    
    // Test expire/ttl
    console.log('Setting key with TTL...');
    await redis.set('test:ttl', 'will-expire', 10);
    
    const ttl = await redis.ttl('test:ttl');
    console.log('TTL:', ttl, 'seconds');
    
    // Test hash operations
    console.log('Testing hash operations...');
    await redis.hset('test:hash', 'field1', 'value1');
    const hashValue = await redis.hget('test:hash', 'field1');
    console.log('Hash value:', hashValue);
    
    // Test sorted set operations
    console.log('Testing sorted set operations...');
    await redis.zadd('test:sorted', 1, 'one');
    await redis.zadd('test:sorted', 2, 'two');
    const sortedSet = await redis.zrange('test:sorted', 0, -1);
    console.log('Sorted set:', sortedSet);
    
    console.log('All tests completed successfully!');
  } catch (error) {
    console.error('Redis test failed:', error);
    process.exit(1);
  } finally {
    // Clean up test keys
    await redis.del([
      'test:key',
      'test:ttl',
      'test:hash',
      'test:sorted'
    ]);
    
    // Close the Redis connection
    // Note: Upstash Redis client doesn't have a disconnect method
    process.exit(0);
  }
}

testRedis();
