// Test script to populate vista:inventory key in Redis
const { Redis } = require('@upstash/redis');
require('dotenv').config();

async function main() {
  // Create Upstash Redis client
  const client = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });

  console.log('Connecting to Upstash Redis...');
  
  // Test connection by pinging
  try {
    const pong = await client.ping();
    console.log('Connected to Upstash Redis:', pong);
  } catch (err) {
    console.error('Failed to connect to Upstash Redis:', err);
    process.exit(1);
  }

  try {
    // Create test vehicle data
    const testVehicles = [
      {
        id: 'v1',
        make: 'Toyota',
        model: 'Camry',
        year: 2023,
        price: 25000,
        vin: 'ABC123456789',
        description: 'A reliable sedan',
        images: [
          'https://example.com/images/camry1.jpg',
          'https://example.com/images/camry2.jpg'
        ]
      },
      {
        id: 'v2',
        make: 'Honda',
        model: 'Accord',
        year: 2023,
        price: 27000,
        vin: 'DEF123456789',
        description: 'Comfortable and efficient',
        images: [
          'https://example.com/images/accord1.jpg',
          'https://example.com/images/accord2.jpg'
        ]
      }
    ];

    // Create inventory data structure
    const inventoryData = {
      vehicles: testVehicles,
      lastUpdated: new Date().toISOString()
    };

    // Store in Redis
    await client.set('vista:inventory', JSON.stringify(inventoryData));
    console.log('Test inventory data stored in Redis');

    // Verify data was stored correctly
    const storedData = await client.get('vista:inventory');
    console.log('Retrieved data:', storedData);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    // Upstash Redis doesn't need explicit connection closing
    console.log('Test script completed');
  }
}

main().catch(console.error);
