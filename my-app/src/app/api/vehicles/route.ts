import { NextResponse } from 'next/server';
import { redisService } from '@/lib/services/redisService';

// GET /api/vehicles
export async function GET() {
  try {
    // Try to get vehicles from Redis cache first
    const vehicles = await redisService.getVehicles();
    
    if (vehicles.length === 0) {
      console.log('[API] No vehicles found in cache');
    }
    
    return NextResponse.json(vehicles);
  } catch (err) {
    console.error('[API] vehicles GET error', err);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
