import { NextResponse } from 'next/server';
import { redisService } from '@/lib/services/redisService';

export async function POST() {
  try {
    console.log('[Populate API] Starting data population...');
    
    // For now, let's just check if we can connect to Redis and see what's there
    const vehicles = await redisService.getVehicles();
    console.log(`[Populate API] Current vehicle count: ${vehicles.length}`);
    
    if (vehicles.length === 0) {
      return NextResponse.json({ 
        success: false, 
        message: 'No vehicles found in Redis. You need to run the scraper locally and ensure the Redis database is shared between environments.',
        vehicleCount: 0
      });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: `Redis contains ${vehicles.length} vehicles`,
      vehicleCount: vehicles.length,
      sampleVehicles: vehicles.slice(0, 3).map(v => ({ 
        id: v.id, 
        stockNumber: v.stockNumber, 
        make: v.make, 
        model: v.model 
      }))
    });
    
  } catch (error) {
    console.error('[Populate API] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to check Redis data'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Just return the current vehicle count
    const vehicles = await redisService.getVehicles();
    return NextResponse.json({ 
      vehicleCount: vehicles.length,
      vehicles: vehicles.slice(0, 3).map(v => ({ id: v.id, stockNumber: v.stockNumber, make: v.make, model: v.model }))
    });
  } catch (error) {
    console.error('[Populate API] Error getting vehicle count:', error);
    return NextResponse.json(
      { error: 'Failed to get vehicle count' },
      { status: 500 }
    );
  }
} 