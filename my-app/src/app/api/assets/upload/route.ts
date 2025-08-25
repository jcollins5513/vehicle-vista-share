import { NextResponse } from 'next/server';
import { uploadFileToAssets } from '@/lib/s3';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const category = formData.get('category') as string || 'manual-uploads';
    const isMarketingAsset = formData.get('isMarketingAsset') === 'true';

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, and WebP images are allowed.' },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to S3 assets bucket
    const result = await uploadFileToAssets({
      buffer,
      fileName: file.name,
      mimeType: file.type,
      category,
      isMarketingAsset,
    });

    return NextResponse.json({
      success: true,
      asset: {
        url: result.url,
        key: result.key,
        fileName: file.name,
        size: file.size,
        type: file.type,
        category,
        isMarketingAsset,
        uploadedAt: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('Error uploading asset:', error);
    return NextResponse.json(
      { 
        error: 'Failed to upload asset',
        details: process.env.NODE_ENV === 'development' 
          ? (error instanceof Error ? error.message : 'Unknown error')
          : undefined
      },
      { status: 500 }
    );
  }
}