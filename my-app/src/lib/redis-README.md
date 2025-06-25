# Redis Client for Vehicle Vista Share

This module provides a Redis client wrapper for the Vehicle Vista Share application, with built-in support for Upstash Redis and comprehensive testing.

## Features

- Type-safe Redis client wrapper
- Support for common Redis operations (get, set, hget, hset, del, exists, etc.)
- Built-in retry logic for failed operations
- Comprehensive test coverage with Jest
- Mock support for testing without a Redis server

## Installation

1. Install the required dependencies:

```bash
npm install @upstash/redis
```

2. Set up your environment variables in a `.env` file:

```env
UPSTASH_REDIS_REST_URL=your_redis_rest_url
UPSTASH_REDIS_REST_TOKEN=your_redis_rest_token
```

## Usage

### Importing the Client

```typescript
import { createRedisClient } from './lib/redis';

// Create a new Redis client
const redisClient = createRedisClient();
```

### Basic Operations

```typescript
// Set a value
await redisClient.set('key', 'value');

// Get a value
const value = await redisClient.get('key');

// Delete a key
await redisClient.del('key');

// Check if a key exists
const exists = await redisClient.exists('key');
```

### Hash Operations

```typescript
// Set a hash field
await redisClient.hset('hash-key', 'field', 'value');

// Get a hash field
const value = await redisClient.hget('hash-key', 'field');
```

## Testing

The Redis client includes comprehensive tests using Jest. The test suite includes:

- Unit tests for all Redis operations
- Mock implementations for testing without a Redis server
- Test coverage reporting

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- src/lib/__tests__/simple-redis.test.ts
```

### Mocking Redis in Tests

When writing tests, you can provide a mock Redis client:

```typescript
import { createRedisClient } from '../redis';

// Create a mock Redis client
const mockRedis = {
  get: jest.fn().mockResolvedValue('mocked-value'),
  set: jest.fn().mockResolvedValue('OK'),
  // Add other methods as needed
};

// Create a Redis client with the mock
const redisClient = createRedisClient(mockRedis);
```

## Error Handling

The client includes built-in retry logic for failed operations. By default, it will retry failed operations up to 3 times with exponential backoff.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
