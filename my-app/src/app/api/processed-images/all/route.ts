import { NextResponse } from 'next/server';
import { listS3Objects } from '@/lib/s3';
import { redisService } from '@/lib/services/redisService';

interface ProcessedImageData {
  originalUrl: string;
  processedUrl: string;
  processedAt: Date;
  status: 'completed' | 'failed';
  imageIndex: number;
  vehicleInfo?: {
    id: string;
    stockNumber: string;
    make?: string;
    model?: string;
    year?: number;
  };
}

// GET /api/processed-images/all - Get ALL processed images from S3, not just cached ones
export async function GET() {
  try {
    console.log('[API] Fetching ALL processed images from S3...');
    
    // Get all processed images from S3
    const s3Objects = await listS3Objects({
      bucket: 'media',
      prefix: 'processed/',
      maxKeys: 5000, // Increase limit to get more images
    });

    console.log(`[API] Found ${s3Objects.length} processed images in S3`);

    // Get vehicle data from Redis to enrich the image data
    let vehicleData: any = {};
    try {
      const inventoryData = await redisService.getInventoryData();
      const vehicles = inventoryData.vehicles || [];
      
      // Create a lookup map for vehicles
      vehicles.forEach((vehicle: any) => {
        vehicleData[vehicle.stockNumber] = vehicle;
        if (vehicle.id && vehicle.id !== vehicle.stockNumber) {
          vehicleData[vehicle.id] = vehicle;
        }
      });
    } catch (error) {
      console.warn('[API] Could not fetch vehicle data from Redis:', error);
    }

    // Process S3 objects into structured data
    const processedImagesData: { [stockNumber: string]: ProcessedImageData[] } = {};
    const allProcessedImages: ProcessedImageData[] = [];

    s3Objects.forEach(obj => {
      // Extract vehicle ID from the S3 key (format: processed/{vehicleId}/{uuid})
      const pathParts = obj.key.split('/');
      if (pathParts.length >= 2 && pathParts[0] === 'processed') {
        const vehicleId = pathParts[1];
        const vehicle = vehicleData[vehicleId];
        
        const processedImage: ProcessedImageData = {
          originalUrl: '', // We don't have this from S3, would need to be stored in metadata
          processedUrl: obj.url,
          processedAt: obj.lastModified || new Date(),
          status: 'completed',
          imageIndex: 0, // We don't have this from S3 either
          vehicleInfo: vehicle ? {
            id: vehicle.id || vehicle.stockNumber,
            stockNumber: vehicle.stockNumber,
            make: vehicle.make,
            model: vehicle.model,
            year: vehicle.year,
          } : {
            id: vehicleId,
            stockNumber: vehicleId,
          }
        };

        // Group by stock number
        const stockNumber = vehicle?.stockNumber || vehicleId;
        if (!processedImagesData[stockNumber]) {
          processedImagesData[stockNumber] = [];
        }
        processedImagesData[stockNumber].push(processedImage);
        allProcessedImages.push(processedImage);
      }
    });

    // Sort images by processed date (newest first)
    Object.keys(processedImagesData).forEach(stockNumber => {
      processedImagesData[stockNumber].sort((a, b) => 
        new Date(b.processedAt).getTime() - new Date(a.processedAt).getTime()
      );
    });

    allProcessedImages.sort((a, b) => 
      new Date(b.processedAt).getTime() - new Date(a.processedAt).getTime()
    );

    console.log(`[API] Organized ${allProcessedImages.length} images across ${Object.keys(processedImagesData).length} vehicles`);
    
    return NextResponse.json({
      success: true,
      processedImages: processedImagesData,
      allImages: allProcessedImages,
      totalVehicles: Object.keys(processedImagesData).length,
      totalImages: allProcessedImages.length,
      source: 's3-direct', // Indicate this came from S3, not Redis cache
    });
    
  } catch (error) {
    console.error('[API] Error fetching all processed images:', error);
    
    return new NextResponse(
      JSON.stringify({
        success: false,
        error: 'Failed to fetch processed images from S3',
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