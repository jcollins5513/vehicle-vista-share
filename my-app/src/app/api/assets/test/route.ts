import { NextResponse } from 'next/server';
import { s3Client } from '@/lib/s3';
import { HeadBucketCommand, GetBucketLocationCommand } from '@aws-sdk/client-s3';

export async function GET() {
  try {
    const mediaBucket = process.env.VEHICLE_MEDIA_BUCKET;
    const assetsBucket = process.env.VEHICLE_ASSETS_BUCKET;
    
    console.log('[Assets Test] Testing S3 configuration...');
    console.log('[Assets Test] Media bucket:', mediaBucket);
    console.log('[Assets Test] Assets bucket:', assetsBucket);
    
    // Test both buckets
    const results = {
      mediaBucket: {
        name: mediaBucket,
        exists: false,
        error: null as string | null,
        region: null as string | null,
      },
      assetsBucket: {
        name: assetsBucket,
        exists: false,
        error: null as string | null,
        region: null as string | null,
      },
    };
    
    // Test media bucket
    try {
      await s3Client.send(new HeadBucketCommand({ Bucket: mediaBucket }));
      results.mediaBucket.exists = true;
      
      // Get bucket region
      try {
        const locationResponse = await s3Client.send(new GetBucketLocationCommand({ Bucket: mediaBucket }));
        results.mediaBucket.region = locationResponse.LocationConstraint || 'us-east-1';
      } catch (regionError) {
        console.log('[Assets Test] Could not get media bucket region:', regionError);
      }
      
      console.log('[Assets Test] Media bucket exists and is accessible, region:', results.mediaBucket.region);
    } catch (error) {
      results.mediaBucket.error = error instanceof Error ? error.message : 'Unknown error';
      console.log('[Assets Test] Media bucket error:', results.mediaBucket.error);
    }
    
    // Test assets bucket
    try {
      await s3Client.send(new HeadBucketCommand({ Bucket: assetsBucket }));
      results.assetsBucket.exists = true;
      
      // Get bucket region
      try {
        const locationResponse = await s3Client.send(new GetBucketLocationCommand({ Bucket: assetsBucket }));
        results.assetsBucket.region = locationResponse.LocationConstraint || 'us-east-1';
      } catch (regionError) {
        console.log('[Assets Test] Could not get assets bucket region:', regionError);
      }
      
      console.log('[Assets Test] Assets bucket exists and is accessible, region:', results.assetsBucket.region);
    } catch (error) {
      results.assetsBucket.error = error instanceof Error ? error.message : 'Unknown error';
      console.log('[Assets Test] Assets bucket error:', results.assetsBucket.error);
    }
    
    return NextResponse.json({
      success: true,
      s3Config: {
        region: process.env.AWS_REGION,
        hasCredentials: !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY),
      },
      buckets: results,
    });
    
  } catch (error) {
    console.error('[Assets Test] Error testing S3:', error);
    return NextResponse.json(
      { 
        error: 'Failed to test S3 configuration',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}