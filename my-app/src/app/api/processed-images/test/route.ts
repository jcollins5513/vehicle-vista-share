import { NextResponse } from 'next/server';
import { listS3Objects } from '@/lib/s3';

export async function GET() {
  try {
    console.log('[Processed Images Test] Testing processed images from S3...');
    
    // Get processed images from S3
    const s3Objects = await listS3Objects({
      bucket: 'media',
      prefix: 'processed/',
      maxKeys: 100,
    });

    console.log(`[Processed Images Test] Found ${s3Objects.length} processed images in S3`);

    // Sample the first few objects for debugging
    const sampleObjects = s3Objects.slice(0, 5).map(obj => ({
      key: obj.key,
      url: obj.url,
      lastModified: obj.lastModified,
      size: obj.size,
      vehicleId: obj.key.split('/')[1], // Extract vehicle ID from path
    }));

    return NextResponse.json({
      success: true,
      totalProcessedImages: s3Objects.length,
      sampleObjects,
      bucketInfo: {
        bucket: process.env.VEHICLE_MEDIA_BUCKET,
        prefix: 'processed/',
      },
    });
    
  } catch (error) {
    console.error('[Processed Images Test] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to test processed images',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}