import { NextResponse } from 'next/server';
import { redisService } from '@/lib/services/redisService';
import { PrismaClient } from '@/generated/prisma';
import { withAccelerate } from '@prisma/extension-accelerate';

const prisma = new PrismaClient().$extends(withAccelerate());

// GET /api/vehicles
export async function GET() {
  try {
    console.log('[API] Fetching vehicles from Redis...');
    // Try to get vehicles from Redis cache first
    const vehicles = await redisService.getVehicles();
    console.log(`[API] Retrieved ${vehicles.length} vehicles from Redis`);
    
    if (vehicles.length === 0) {
      console.log('[API] No vehicles found in cache');
    }
    
    // Ensure all vehicles have an 'id' field that matches their 'stockNumber'
    try {
      console.log('[API] Fetching 360 images from database...');
      const threeSixtyImages = await prisma.threeSixtyImage.findMany();
      console.log(`[API] Found ${threeSixtyImages.length} 360 images`);
      
      const threeSixtyImageMap = new Map(threeSixtyImages.map(img => [img.stockNumber, img.imageUrl]));

      // Merge vehicle data with 360 image data
      const vehiclesWithAllData = vehicles.map(vehicle => {
        try {
          return {
            ...vehicle,
            id: vehicle.id || vehicle.stockNumber, // Use stockNumber as id if id is missing
            threeSixtyImageUrl: threeSixtyImageMap.get(vehicle.stockNumber) || null,
          };
        } catch (mapError) {
          console.error('[API] Error processing vehicle:', {
            vehicleId: vehicle?.id,
            stockNumber: vehicle?.stockNumber,
            error: mapError
          });
          return null;
        }
      }).filter(Boolean); // Remove any null entries from failed mappings
      
      console.log(`[API] Successfully processed ${vehiclesWithAllData.length} vehicles`);
      return NextResponse.json(vehiclesWithAllData);
    } catch (dbError) {
      console.error('[API] Database error:', dbError);
      // If DB fails but we have vehicles, return them without 360 images
      if (vehicles.length > 0) {
        console.log('[API] Returning vehicles without 360 images due to database error');
        return NextResponse.json(vehicles.map(vehicle => ({
          ...vehicle,
          id: vehicle.id || vehicle.stockNumber,
          threeSixtyImageUrl: null,
        })));
      }
      throw dbError; // Re-throw if we have no vehicles to fall back to
    }
  } catch (err) {
    console.error('[API] vehicles GET error:', {
      message: err instanceof Error ? err.message : 'Unknown error',
      stack: err instanceof Error ? err.stack : undefined,
      name: err instanceof Error ? err.name : 'UnknownError'
    });
    
    return new NextResponse(
      JSON.stringify({
        error: 'Failed to load vehicles',
        details: process.env.NODE_ENV === 'development' 
          ? (err instanceof Error ? err.message : 'Unknown error')
          : undefined
      }),
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  }
}
