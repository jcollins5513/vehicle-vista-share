// Test script to verify Upstash Redis connection and populate test data
const { Redis } = require('@upstash/redis');
require('dotenv').config();

async function main() {
  console.log('Testing Upstash Redis connection...');
  
  // Log environment variables (redacted for security)
  console.log('UPSTASH_REDIS_REST_URL:', process.env.UPSTASH_REDIS_REST_URL ? '[Set]' : '[Not Set]');
  console.log('UPSTASH_REDIS_REST_TOKEN:', process.env.UPSTASH_REDIS_REST_TOKEN ? '[Set]' : '[Not Set]');
  
  try {
    // Create Upstash Redis client
    const client = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
    
    // Test connection with a simple ping
    const pong = await client.ping();
    console.log('Redis connection successful:', pong);
    
    // Test dealership:inventory key
    console.log('\nChecking dealership:inventory key...');
    const inventory = await client.get('dealership:inventory');
    if (inventory) {
      console.log('Inventory found!');
      console.log('Number of vehicles:', Array.isArray(inventory.vehicles) ? inventory.vehicles.length : 'Not an array');
      console.log('Last updated:', inventory.lastUpdated || 'Not available');
    } else {
      console.log('No inventory data found in Redis.');
      
      // Create test inventory data
      console.log('\nCreating test inventory data...');
      const testData = {
        vehicles: [
          {
            id: 'test-1',
            make: 'Toyota',
            model: 'Camry',
            year: 2023,
            price: 25000,
            vin: 'TEST123456789',
            description: 'Test vehicle'
          },
          {
            id: 'test-2',
            make: 'Honda',
            model: 'Accord',
            year: 2023,
            price: 27000,
            vin: 'TEST987654321',
            description: 'Another test vehicle'
          }
        ],
        lastUpdated: new Date().toISOString()
      };
      
      await redis.set('dealership:inventory', testData);
      console.log('Test inventory data created successfully!');
    }
  } catch (error) {
    console.error('Redis connection error:', error);
  }
}

main().catch(console.error);
