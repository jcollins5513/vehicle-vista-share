import { NextResponse } from 'next/server';
import { listS3Objects, deleteObjectFromS3, checkBucketExists } from '@/lib/s3';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || '';
    const maxKeys = parseInt(searchParams.get('maxKeys') || '1000');

    console.log('[Assets API] Attempting to list assets from bucket:', process.env.VEHICLE_ASSETS_BUCKET);

    // Check if bucket exists first
    const bucketExists = await checkBucketExists('assets');
    if (!bucketExists) {
      console.log('[Assets API] Assets bucket does not exist yet, returning empty list');
      return NextResponse.json({
        success: true,
        assets: [],
        total: 0,
        warning: 'Assets bucket not found - it will be created when you upload your first asset',
      });
    }

    const assets = await listS3Objects({
      bucket: 'assets',
      prefix: category,
      maxKeys,
    });

    console.log(`[Assets API] Found ${assets.length} assets`);

    // Sort by last modified date (newest first)
    assets.sort((a, b) => {
      if (!a.lastModified || !b.lastModified) return 0;
      return b.lastModified.getTime() - a.lastModified.getTime();
    });

    return NextResponse.json({
      success: true,
      assets: assets.map(asset => ({
        ...asset,
        fileName: asset.key.split('/').pop() || asset.key,
        category: asset.key.split('/')[0] || 'uncategorized',
      })),
      total: assets.length,
    });

  } catch (error) {
    console.error('Error listing assets:', error);
    
    // Check if it's a bucket not found error
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isNoSuchBucket = errorMessage.includes('NoSuchBucket') || errorMessage.includes('does not exist');
    
    if (isNoSuchBucket) {
      console.log('[Assets API] Assets bucket does not exist yet, returning empty list');
      return NextResponse.json({
        success: true,
        assets: [],
        total: 0,
        warning: 'Assets bucket not found - it will be created when you upload your first asset',
      });
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to list assets',
        details: process.env.NODE_ENV === 'development' 
          ? errorMessage
          : undefined,
        bucketName: process.env.VEHICLE_ASSETS_BUCKET,
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (!key) {
      return NextResponse.json(
        { error: 'Asset key is required' },
        { status: 400 }
      );
    }

    await deleteObjectFromS3(key, 'assets');

    return NextResponse.json({
      success: true,
      message: 'Asset deleted successfully',
    });

  } catch (error) {
    console.error('Error deleting asset:', error);
    return NextResponse.json(
      { 
        error: 'Failed to delete asset',
        details: process.env.NODE_ENV === 'development' 
          ? (error instanceof Error ? error.message : 'Unknown error')
          : undefined
      },
      { status: 500 }
    );
  }
}