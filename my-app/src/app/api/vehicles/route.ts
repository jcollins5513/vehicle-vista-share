import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { redisService } from '@/lib/services/redisService';

// GET /api/vehicles
export async function GET() {
  try {
    // Try to get vehicles from Redis cache first
    let vehicles = await redisService.getVehicles();
    
    // If cache miss, get from database and update cache
    if (vehicles.length === 0) {
      console.log('[API] Cache miss - fetching vehicles from database');
      
      // Get vehicles from database
      const dbVehicles = await prisma.vehicle.findMany({ 
        orderBy: { createdAt: 'desc' },
        include: { media: true },
      });
      
      // Cache the vehicles and their media
      await Promise.all([
        ...dbVehicles.map(vehicle => redisService.cacheVehicle(vehicle)),
        ...dbVehicles.flatMap(vehicle => 
          vehicle.media.map(media => redisService.cacheMedia(media))
        )
      ]);
      
      vehicles = dbVehicles;
    } else {
      console.log('[API] Cache hit - returning vehicles from Redis');
    }
    
    return NextResponse.json(vehicles);
  } catch (err) {
    console.error('[API] vehicles GET error', err);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
