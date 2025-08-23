import { NextResponse } from 'next/server';
import { redisService } from '@/lib/services/redisService';

interface ProcessedImageData {
  originalUrl: string;
  processedUrl: string;
  processedAt: Date;
  status: 'completed' | 'failed';
  imageIndex: number;
}

interface VehicleWithProcessedImages {
  id: string;
  stockNumber: string;
  make: string;
  model: string;
  year: number;
  processedImages: ProcessedImageData[];
}

// GET /api/processed-images - Get all processed images for content creation
export async function GET() {
  try {
    console.log('[API] Fetching all processed images...');
    
    // Get the complete inventory data from Redis
    const inventoryData = await redisService.getInventoryData();
    const vehicles = inventoryData.vehicles || [];
    
    // Filter vehicles that have processed images
    const vehiclesWithProcessedImages: VehicleWithProcessedImages[] = vehicles
      .filter((vehicle: any) => vehicle.processedImages && vehicle.processedImages.length > 0)
      .map((vehicle: any) => ({
        id: vehicle.id || vehicle.stockNumber,
        stockNumber: vehicle.stockNumber,
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        processedImages: vehicle.processedImages.filter(
          (img: ProcessedImageData) => img.status === 'completed'
        )
      }))
      .filter((vehicle: VehicleWithProcessedImages) => vehicle.processedImages.length > 0);
    
    console.log(`[API] Found ${vehiclesWithProcessedImages.length} vehicles with processed images`);
    
    // Also return a flat list of all processed images for easier access
    const allProcessedImages = vehiclesWithProcessedImages.flatMap(vehicle => 
      vehicle.processedImages.map(img => ({
        ...img,
        vehicleInfo: {
          id: vehicle.id,
          stockNumber: vehicle.stockNumber,
          make: vehicle.make,
          model: vehicle.model,
          year: vehicle.year
        }
      }))
    );
    
    // Convert to the format expected by the content creation page
    const processedImagesData: { [stockNumber: string]: ProcessedImageData[] } = {};
    vehiclesWithProcessedImages.forEach(vehicle => {
      processedImagesData[vehicle.stockNumber] = vehicle.processedImages;
    });
    
    return NextResponse.json({
      success: true,
      processedImages: processedImagesData,
      vehicles: vehiclesWithProcessedImages,
      allImages: allProcessedImages,
      totalVehicles: vehiclesWithProcessedImages.length,
      totalImages: allProcessedImages.length
    });
    
  } catch (error) {
    console.error('[API] Error fetching processed images:', error);
    
    return new NextResponse(
      JSON.stringify({
        success: false,
        error: 'Failed to fetch processed images',
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