import { NextRequest, NextResponse } from 'next/server';
import { uploadBufferToS3 } from '@/lib/s3';
import { redisClient } from '@/lib/redis';
import { v4 as uuidv4 } from 'uuid';
import type { WebCompanionUpload, WebCompanionUploadStatus } from '@/types/webCompanion';

const MAX_UPLOAD_SIZE = 25 * 1024 * 1024; // 25MB

const stockUploadsKey = (stockNumber: string) => `web-companion:stock:${stockNumber}:uploads`;
const uploadKey = (id: string) => `web-companion:upload:${id}`;
const stockSequenceKey = (stockNumber: string) => `web-companion:stock:${stockNumber}:seq`;
const globalPendingKey = 'web-companion:pending';

export const runtime = 'nodejs';
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
  },
};

async function saveUpload(upload: WebCompanionUpload) {
  await redisClient.set(uploadKey(upload.id), upload);
  await redisClient.sadd(stockUploadsKey(upload.stockNumber), upload.id);
  
  if (upload.status === 'pending') {
    await redisClient.sadd(globalPendingKey, upload.id);
  }
}

// Fire-and-forget trigger to let the server worker process pending uploads
async function triggerWorker(url: string, limit = 3) {
  try {
    const workerUrl = new URL('/api/web-companion/worker', url);
    workerUrl.searchParams.set('limit', String(limit));
    // Do not await the response; kick it off and return
    fetch(workerUrl.toString(), { method: 'POST' }).catch((err) => {
      console.warn('[Web Companion] worker trigger failed:', err instanceof Error ? err.message : err);
    });
  } catch (err) {
    console.warn('[Web Companion] worker trigger setup failed:', err instanceof Error ? err.message : err);
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const stockNumber = searchParams.get('stockNumber');
  const statusFilter = searchParams.get('status') as WebCompanionUploadStatus | null;

  if (!stockNumber) {
    return NextResponse.json({ error: 'stockNumber is required' }, { status: 400 });
  }

  try {
    const uploadIds = await redisClient.smembers(stockUploadsKey(stockNumber));
    const uploads = await Promise.all(
      uploadIds.map(async (id) => redisClient.get<WebCompanionUpload>(uploadKey(id)))
    );

    const filteredUploads = uploads
      .filter((u): u is WebCompanionUpload => Boolean(u))
      .filter((u) => (statusFilter ? u.status === statusFilter : true))
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    return NextResponse.json({
      success: true,
      uploads: filteredUploads,
      total: filteredUploads.length,
    });
  } catch (error) {
    console.error('[Web Companion] Failed to list uploads:', error);
    return NextResponse.json({ error: 'Failed to load uploads' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const contentType = req.headers.get('content-type') || '';
  if (!contentType.includes('multipart/form-data')) {
    return NextResponse.json({ error: 'Expected multipart/form-data' }, { status: 400 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file');
    const stockNumber = (formData.get('stockNumber') as string | null)?.trim();

    if (!stockNumber) {
      return NextResponse.json({ error: 'stockNumber is required' }, { status: 400 });
    }

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'file is required' }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Only image uploads are supported' }, { status: 415 });
    }

    if (file.size > MAX_UPLOAD_SIZE) {
      return NextResponse.json(
        { error: `File exceeds ${MAX_UPLOAD_SIZE / (1024 * 1024)}MB limit` },
        { status: 413 }
      );
    }

    const isProcessedRaw = formData.get('isProcessed');
    const isProcessed = isProcessedRaw === 'true';

    console.log(`[Web Companion] Upload for stock ${stockNumber}, isProcessed: ${isProcessed} (raw: ${isProcessedRaw})`);

    const buffer = Buffer.from(await file.arrayBuffer());

    // Choose appropriate S3 prefix based on whether it's processed or original
    // Use 'processed/' prefix for processed images so they are picked up by the main inventory API
    const keyPrefix = isProcessed
      ? `processed/${stockNumber}`
      : `web-companion/${stockNumber}/original`;

    const { url, key } = await uploadBufferToS3({
      buffer,
      mimeType: file.type || 'image/jpeg',
      keyPrefix,
    });

    const rawSequence = typeof (redisClient as any).incr === 'function'
      ? ((await (redisClient as any).incr(stockSequenceKey(stockNumber))) as number)
      : null;
    const imageIndex = rawSequence !== null ? Math.max(rawSequence - 1, 0) : Date.now();

    const upload: WebCompanionUpload = {
      id: uuidv4(),
      stockNumber,
      originalUrl: url,
      s3Key: key,
      status: isProcessed ? 'processed' : 'pending',
      createdAt: new Date().toISOString(),
      originalFilename: file.name,
      size: file.size,
      imageIndex,
      // If it's already processed, the "originalUrl" IS the processed URL in this context,
      // or we can set processedUrl to the same value.
      processedUrl: isProcessed ? url : undefined,
      processedAt: isProcessed ? new Date().toISOString() : undefined,
    };

    await saveUpload(upload);

    if (!isProcessed) {
      // Kick off server-side background removal so the browser isn't required
      triggerWorker(req.url, 3);
    }

    return NextResponse.json({ success: true, upload });
  } catch (error) {
    console.error('[Web Companion] Upload failed:', error);
    return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 });
  }
}
