import { NextRequest, NextResponse } from 'next/server';
import { redisClient } from '@/lib/redis';
import { uploadBufferToS3 } from '@/lib/s3';
import type { WebCompanionUpload } from '@/types/webCompanion';

export const runtime = 'nodejs';

const stockUploadsKey = (stockNumber: string) => `web-companion:stock:${stockNumber}:uploads`;
const uploadKey = (id: string) => `web-companion:upload:${id}`;

type RemoveBackgroundFn = (
  input: Buffer | ArrayBuffer | Uint8Array,
  options?: unknown
) => Promise<unknown>;

let cachedRemoveBackground: RemoveBackgroundFn | null = null;

async function getRemoveBackground(): Promise<RemoveBackgroundFn> {
  if (cachedRemoveBackground) return cachedRemoveBackground;

  const mod = (await import('@imgly/background-removal-node')) as unknown as { removeBackground: RemoveBackgroundFn };
  cachedRemoveBackground = mod.removeBackground;
  return cachedRemoveBackground;
}

async function listPending(limit = 5): Promise<WebCompanionUpload[]> {
  const clientWithKeys = redisClient as unknown as { keys?: (pattern: string) => Promise<string[]> };
  const stockSets = typeof clientWithKeys.keys === 'function'
    ? await clientWithKeys.keys('web-companion:stock:*:uploads')
    : [];

  const uploads: WebCompanionUpload[] = [];
  for (const key of stockSets) {
    const ids = await redisClient.smembers(key);
    for (const id of ids) {
      const upload = await redisClient.get<WebCompanionUpload>(uploadKey(id));
      if (upload && upload.status === 'pending') {
        uploads.push(upload);
        if (uploads.length >= limit) return uploads;
      }
    }
  }
  return uploads;
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
  const processedBuffer = await removeBackground(buffer, {
    output: { format: 'image/png', quality: 0.9 },
  });

  // Upload processed to S3
  const normalizedBuffer = Buffer.isBuffer(processedBuffer)
    ? processedBuffer
    : Buffer.from(
        processedBuffer instanceof ArrayBuffer
          ? new Uint8Array(processedBuffer)
          : (processedBuffer as Uint8Array)
      );

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

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = Number(searchParams.get('limit') || '5');

  try {
    const pending = await listPending(Number.isFinite(limit) ? limit : 5);
    const results = [];

    for (const upload of pending) {
      try {
        const updated = await processOne(upload);
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

