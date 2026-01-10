import { NextRequest, NextResponse } from 'next/server';
import { uploadBufferToS3 } from '@/lib/s3';
import { redisClient } from '@/lib/redis';
import type { WebCompanionUpload } from '@/types/webCompanion';

const uploadKey = (id: string) => `web-companion:upload:${id}`;
const stockUploadsKey = (stockNumber: string) => `web-companion:stock:${stockNumber}:uploads`;

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const contentType = req.headers.get('content-type') || '';
  if (!contentType.includes('multipart/form-data')) {
    return NextResponse.json({ error: 'Expected multipart/form-data' }, { status: 400 });
  }

  try {
    const formData = await req.formData();
    const uploadId = (formData.get('uploadId') as string | null)?.trim();
    const stockNumber = (formData.get('stockNumber') as string | null)?.trim();
    const originalUrl = (formData.get('originalUrl') as string | null)?.trim();
    const imageIndexRaw = (formData.get('imageIndex') as string | null)?.trim();
    const image = formData.get('image');

    if (!uploadId) {
      return NextResponse.json({ error: 'uploadId is required' }, { status: 400 });
    }

    if (!stockNumber) {
      return NextResponse.json({ error: 'stockNumber is required' }, { status: 400 });
    }

    if (!image || !(image instanceof File)) {
      return NextResponse.json({ error: 'image is required' }, { status: 400 });
    }

    const imageIndex = imageIndexRaw ? Number.parseInt(imageIndexRaw, 10) : undefined;

    const buffer = Buffer.from(await image.arrayBuffer());
    const { url: processedUrl } = await uploadBufferToS3({
      buffer,
      mimeType: image.type || 'image/png',
      keyPrefix: `web-companion/${stockNumber}/processed`,
    });

    const existing = await redisClient.get<WebCompanionUpload>(uploadKey(uploadId));
    if (!existing) {
      return NextResponse.json({ error: 'Upload not found' }, { status: 404 });
    }

    const updated: WebCompanionUpload = {
      ...existing,
      processedUrl,
      processedAt: new Date().toISOString(),
      originalUrl: originalUrl ?? existing.originalUrl,
      status: 'processed',
      imageIndex: Number.isFinite(imageIndex) ? imageIndex : existing.imageIndex,
    };

    await redisClient.set(uploadKey(uploadId), updated);
    // Ensure the upload remains associated with the stock set
    await redisClient.sadd(stockUploadsKey(stockNumber), uploadId);

    return NextResponse.json({ success: true, upload: updated });
  } catch (error) {
    console.error('[Web Companion] Failed to save processed upload:', error);
    return NextResponse.json({ error: 'Failed to save processed upload' }, { status: 500 });
  }
}







