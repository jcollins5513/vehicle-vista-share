import { NextRequest, NextResponse } from 'next/server';
import { redisClient } from '@/lib/redis';
import { uploadBufferToS3 } from '@/lib/s3';
import type { WebCompanionUpload } from '@/types/webCompanion';

export const runtime = 'nodejs';

const stockUploadsKey = (stockNumber: string) => `web-companion:stock:${stockNumber}:uploads`;
const uploadKey = (id: string) => `web-companion:upload:${id}`;
const globalPendingKey = 'web-companion:pending';

async function listPending(limit = 5): Promise<WebCompanionUpload[]> {
  const ids = await redisClient.smembers(globalPendingKey);
  const uploads: WebCompanionUpload[] = [];

  for (const id of ids.slice(0, Math.max(1, limit))) {
    const upload = await redisClient.get<WebCompanionUpload>(uploadKey(id));
    if (upload && upload.status === 'pending') {
      uploads.push(upload);
    } else {
      // Clean up stale ids that are no longer pending
      await redisClient.srem(globalPendingKey, id);
    }
  }

  return uploads;
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function processOne(upload: WebCompanionUpload) {
  if (!upload.originalUrl || !upload.stockNumber) {
    throw new Error('Missing originalUrl or stockNumber');
  }

  // Fetch original image
  const res = await fetch(upload.originalUrl);
  if (!res.ok) {
    throw new Error(`Failed to fetch original (${res.status})`);
  }
  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Run server-side background removal (returns Buffer)
  const removeBackground = await getRemoveBackground();
  const processed = await removeBackground(buffer, {
    output: { format: 'image/png', quality: 0.9 },
  });

  // Upload processed to S3
  const normalizedBuffer = await toBuffer(processed);

  const { url: processedUrl } = await uploadBufferToS3({
    buffer: normalizedBuffer,
    mimeType: 'image/png',
    keyPrefix: `web-companion/${upload.stockNumber}/processed`,
  });

  const updated: WebCompanionUpload = {
    ...upload,
    processedUrl,
    processedAt: new Date().toISOString(),
    status: 'processed',
  };

  await redisClient.set(uploadKey(upload.id), updated);
  await redisClient.sadd(stockUploadsKey(upload.stockNumber), upload.id);
  return updated;
}

async function processOneWithRetry(upload: WebCompanionUpload, attempts = 2) {
  let lastError: unknown;

  for (let attempt = 1; attempt <= Math.max(1, attempts); attempt++) {
    try {
      const updated = await processOne(upload);
      await redisClient.srem(globalPendingKey, upload.id);
      return updated;
    } catch (err) {
      lastError = err;
      if (attempt < attempts) {
        // brief backoff before retrying
        await sleep(300 * attempt);
      }
    }
  }

  // Remove from pending even when failed so it doesn't block the queue; status is set to failed below.
  await redisClient.srem(globalPendingKey, upload.id);
  throw lastError instanceof Error ? lastError : new Error('processing failed');
}

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = Number(searchParams.get('limit') || '5');

  try {
    const pending = await listPending(Number.isFinite(limit) ? limit : 5);
    const results = [];

    for (const upload of pending) {
      try {
        const updated = await processOneWithRetry(upload, 2);
        results.push({ id: upload.id, status: 'processed', processedUrl: updated.processedUrl });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'processing failed';
        console.error('[Worker] failed', upload.id, message);
        await redisClient.set(uploadKey(upload.id), { ...upload, status: 'failed', error: message });
        results.push({ id: upload.id, status: 'failed', error: message });
      }
    }

    return NextResponse.json({ success: true, processed: results.length, results });
  } catch (error) {
    console.error('[Worker] unexpected error', error);
    return NextResponse.json({ error: 'Worker failed' }, { status: 500 });
  }
}

