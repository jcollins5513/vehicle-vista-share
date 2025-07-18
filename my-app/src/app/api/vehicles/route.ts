import { NextResponse } from 'next/server';
import { redisService } from '@/lib/services/redisService';
import { PrismaClient } from '@/generated/prisma';
import { withAccelerate } from '@prisma/extension-accelerate';

const prisma = new PrismaClient().$extends(withAccelerate());

// GET /api/vehicles
export async function GET() {
  try {
    // Try to get vehicles from Redis cache first
    const vehicles = await redisService.getVehicles();
    
    if (vehicles.length === 0) {
      console.log('[API] No vehicles found in cache');
    }
    
    // Ensure all vehicles have an 'id' field that matches their 'stockNumber'
    // Fetch all 360 image data
    const threeSixtyImages = await prisma.threeSixtyImage.findMany();
    const threeSixtyImageMap = new Map(threeSixtyImages.map(img => [img.stockNumber, img.imageUrl]));

    // Merge vehicle data with 360 image data
    const vehiclesWithAllData = vehicles.map(vehicle => ({
      ...vehicle,
      id: vehicle.id || vehicle.stockNumber, // Use stockNumber as id if id is missing
      threeSixtyImageUrl: threeSixtyImageMap.get(vehicle.stockNumber) || null,
    }));
    
    return NextResponse.json(vehiclesWithAllData);
  } catch (err) {
    console.error('[API] vehicles GET error', err);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
