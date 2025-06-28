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
    
    // Ensure all vehicles have an 'id' field that matches their 'stockNumber'
    const vehiclesWithId = vehicles.map(vehicle => ({
      ...vehicle,
      id: vehicle.id || vehicle.stockNumber, // Use stockNumber as id if id is missing
    }));
    
    return NextResponse.json(vehiclesWithId);
  } catch (err) {
    console.error('[API] vehicles GET error', err);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
