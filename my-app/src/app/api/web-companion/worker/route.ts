import { NextRequest, NextResponse } from 'next/server';
import { redisClient } from '@/lib/redis';
import { uploadBufferToS3 } from '@/lib/s3';
import type { WebCompanionUpload } from '@/types/webCompanion';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

export const runtime = 'nodejs';

const stockUploadsKey = (stockNumber: string) => `web-companion:stock:${stockNumber}:uploads`;
const uploadKey = (id: string) => `web-companion:upload:${id}`;

type RemoveBackgroundFn = (
  input: Buffer | ArrayBuffer | Uint8Array,
  options?: Record<string, unknown>
) => Promise<Buffer | ArrayBuffer | Uint8Array | Blob>;

let cachedRemoveBackground: RemoveBackgroundFn | null = null;

function ensureFileBackedObjectURL() {
  // Node's ESM loader cannot handle blob: URLs. Convert blobs to file:// URLs in /tmp.
  const originalCreateObjectURL = URL.createObjectURL;

  function waitForBuffer(blob: Blob): Buffer {
    const signal = new Int32Array(new SharedArrayBuffer(4));
    let result: Buffer | null = null;
    let error: unknown;

    blob.arrayBuffer()
      .then((arrayBuf) => {
        result = Buffer.from(new Uint8Array(arrayBuf));
        Atomics.store(signal, 0, 1);
        Atomics.notify(signal, 0);
      })
      .catch((err) => {
        error = err;
        Atomics.store(signal, 0, 1);
        Atomics.notify(signal, 0);
      });

    while (Atomics.load(signal, 0) === 0) {
      Atomics.wait(signal, 0, 0, 50);
    }

    if (error) throw error;
    return result as Buffer;
  }

  URL.createObjectURL = (blob: Blob) => {
    const buffer = waitForBuffer(blob);
    const fileName = `imgly-${randomUUID()}.bin`;
    const filePath = path.join('/tmp', fileName);
    fs.writeFileSync(filePath, buffer);
    return `file://${filePath}`;
  };

  URL.revokeObjectURL = (url: string) => {
    if (url.startsWith('file://')) {
      try {
        fs.unlinkSync(url.replace('file://', ''));
      } catch {
        // ignore cleanup errors
      }
    } else {
      originalCreateObjectURL(url);
    }
  };
}

async function getRemoveBackground(): Promise<RemoveBackgroundFn> {
  if (cachedRemoveBackground) return cachedRemoveBackground;

  // Provide a minimal navigator shim for the WASM build when running in Node.js.
  if (typeof globalThis.navigator === 'undefined') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).navigator = { userAgent: 'node' };
  }

  if (typeof globalThis.window === 'undefined') {
    ensureFileBackedObjectURL();
  }

  // Use the WASM-based build to avoid bundling native binaries
  const mod = (await import('@imgly/background-removal')) as unknown as {
    removeBackground: RemoveBackgroundFn;
  };
  cachedRemoveBackground = mod.removeBackground;
  return cachedRemoveBackground;
}

async function toBuffer(output: Buffer | ArrayBuffer | Uint8Array | Blob): Promise<Buffer> {
  if (Buffer.isBuffer(output)) return output;
  if (output instanceof Uint8Array) return Buffer.from(output);
  if (output instanceof ArrayBuffer) return Buffer.from(new Uint8Array(output));
  if (output instanceof Blob) {
    const arrayBuf = await output.arrayBuffer();
    return Buffer.from(new Uint8Array(arrayBuf));
  }
  throw new Error('Unsupported output type from background removal');
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

// Allow GET (manual/alternative triggers) to run the same worker logic
export async function GET(req: NextRequest) {
  return POST(req);
}

