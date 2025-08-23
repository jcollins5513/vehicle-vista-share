import { NextResponse } from 'next/server';
import { uploadBufferToS3 } from '@/lib/s3';
import { redisService } from '@/lib/services/redisService';

interface ProcessedImageData {
  originalUrl: string;
  processedUrl: string;
  processedAt: Date;
  status: 'completed' | 'failed';
  imageIndex: number;
}

// POST /api/vehicles/[id]/processed-images
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const formData = await request.formData();
    
    const imageBlob = formData.get('image') as Blob;
    const originalUrl = formData.get('originalUrl') as string;
    const imageIndex = parseInt(formData.get('imageIndex') as string);
    
    if (!imageBlob || !originalUrl || isNaN(imageIndex)) {
      return new NextResponse(
        JSON.stringify({
          error: 'Missing required fields: image, originalUrl, imageIndex'
        }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`[API] Processing background-removed image for vehicle ${id}, image index ${imageIndex}`);

    // Convert blob to buffer
    const arrayBuffer = await imageBlob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to S3
    const { url: processedUrl } = await uploadBufferToS3({
      buffer,
      mimeType: 'image/png',
      keyPrefix: `processed/${id}`
    });

    console.log(`[API] Uploaded processed image to S3: ${processedUrl}`);

    // Create processed image data
    const processedImageData: ProcessedImageData = {
      originalUrl,
      processedUrl,
      processedAt: new Date(),
      status: 'completed',
      imageIndex
    };

    // Update vehicle data in Redis
    await updateVehicleWithProcessedImage(id, processedImageData);

    return NextResponse.json({
      success: true,
      processedImage: processedImageData
    });

  } catch (error) {
    console.error('[API] Error processing background-removed image:', error);
    
    return new NextResponse(
      JSON.stringify({
        error: 'Failed to process image',
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

// Helper function to update vehicle with processed image
async function updateVehicleWithProcessedImage(
  vehicleId: string, 
  processedImage: ProcessedImageData
): Promise<void> {
  try {
    // Get the entire cached inventory
    const inventoryData = await redisService.getInventoryData();
    const vehicles = inventoryData.vehicles || [];

    // Find and update the specific vehicle
    const vehicleIndex = vehicles.findIndex((v: any) => 
      v.stockNumber === vehicleId || v.id === vehicleId
    );
    
    if (vehicleIndex !== -1) {
      const vehicle = vehicles[vehicleIndex];
      
      if (!vehicle.processedImages) {
        vehicle.processedImages = [];
      }
      
      // Remove existing processed image for this index if it exists
      vehicle.processedImages = vehicle.processedImages.filter(
        (img: ProcessedImageData) => img.imageIndex !== processedImage.imageIndex
      );
      
      // Add the new processed image
      vehicle.processedImages.push(processedImage);
      
      // Update the cache with the modified data
      const updatedInventoryData = {
        ...inventoryData,
        vehicles: vehicles,
        lastUpdated: new Date().toISOString()
      };

      // Save back to Redis with TTL
      const CACHE_TTL = 24 * 60 * 60; // 24 hours
      await redisService.setInventoryData(updatedInventoryData, CACHE_TTL);
      
      console.log(`[API] Updated vehicle ${vehicleId} with processed image at index ${processedImage.imageIndex}`);
    } else {
      console.error(`[API] Vehicle ${vehicleId} not found in cached inventory`);
    }
  } catch (error) {
    console.error(`[API] Error updating vehicle ${vehicleId} with processed image:`, error);
    throw error;
  }
}