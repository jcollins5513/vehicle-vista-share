// Mock implementation of the Upstash Redis client
export class Redis {
  get = jest.fn();
  set = jest.fn();
  del = jest.fn();
  hget = jest.fn();
  hset = jest.fn();
  hmset = jest.fn();
  hgetall = jest.fn();
  sadd = jest.fn();
  smembers = jest.fn();
  zadd = jest.fn();
  zrange = jest.fn();
  keys = jest.fn();
  expire = jest.fn();
  ttl = jest.fn();
  flushall = jest.fn();
  sendCommand = jest.fn();
}

// Create a singleton instance for tests to use
export const mockRedis = new Redis();

const mockUpstashRedis = {
  Redis: jest.fn(() => mockRedis),
  mockRedis,
};

export default mockUpstashRedis;
