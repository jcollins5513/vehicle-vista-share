import { NextResponse } from 'next/server';
import { redisService } from '@/lib/services/redisService';

interface ProcessedImageData {
  originalUrl: string;
  processedUrl: string;
  processedAt: Date;
  status: 'completed' | 'failed';
  imageIndex: number;
  isMarketingAsset?: boolean;
  category?: string;
}

// POST /api/processed-images/save - Save processed images to Redis
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { stockNumber, processedImages } = body;

    if (!stockNumber || !processedImages || !Array.isArray(processedImages)) {
      return new NextResponse(
        JSON.stringify({
          error: 'Missing required fields: stockNumber and processedImages array'
        }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`[API] Saving ${processedImages.length} processed images for vehicle ${stockNumber}`);

    // Get the entire cached inventory
    const inventoryData = await redisService.getInventoryData();
    const vehicles = inventoryData.vehicles || [];

    // Find the specific vehicle
    const vehicleIndex = vehicles.findIndex((v: any) => 
      v.stockNumber === stockNumber || v.id === stockNumber
    );
    
    if (vehicleIndex !== -1) {
      const vehicle = vehicles[vehicleIndex] as any;
      
      if (!vehicle.processedImages) {
        vehicle.processedImages = [];
      }
      
      // Add the new processed images
      processedImages.forEach((processedImage: ProcessedImageData) => {
        // Remove existing processed image for this index if it exists
        vehicle.processedImages = vehicle.processedImages.filter(
          (img: ProcessedImageData) => img.imageIndex !== processedImage.imageIndex
        );
        
        // Add the new processed image
        vehicle.processedImages.push(processedImage);
      });
      
      // Update the cache with the modified data
      const updatedInventoryData = {
        ...inventoryData,
        vehicles: vehicles,
        lastUpdated: new Date().toISOString()
      };

      // Save back to Redis with TTL
      const CACHE_TTL = 24 * 60 * 60; // 24 hours
      await redisService.setInventoryData(updatedInventoryData, CACHE_TTL);
      
      console.log(`[API] Updated vehicle ${stockNumber} with ${processedImages.length} processed images`);
    } else {
      console.error(`[API] Vehicle ${stockNumber} not found in cached inventory`);
      return new NextResponse(
        JSON.stringify({
          error: `Vehicle ${stockNumber} not found in inventory`
        }),
        { 
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Successfully saved ${processedImages.length} processed images for vehicle ${stockNumber}`
    });

  } catch (error) {
    console.error('[API] Error saving processed images:', error);
    
    return new NextResponse(
      JSON.stringify({
        success: false,
        error: 'Failed to save processed images',
        details: process.env.NODE_ENV === 'development' 
          ? (error instanceof Error ? error.message : 'Unknown error')
          : undefined
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
