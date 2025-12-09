import { NextRequest, NextResponse } from 'next/server';
import { redisClient } from '@/lib/redis';
import type { WebCompanionUpload } from '@/types/webCompanion';

const stockUploadsKey = (stockNumber: string) => `web-companion:stock:${stockNumber}:uploads`;
const uploadKey = (id: string) => `web-companion:upload:${id}`;

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const stockNumber = searchParams.get('stockNumber');

  try {
    let uploads: WebCompanionUpload[] = [];

    if (stockNumber) {
      const ids = await redisClient.smembers(stockUploadsKey(stockNumber));
      const records = await Promise.all(
        ids.map(async (id) => redisClient.get<WebCompanionUpload>(uploadKey(id)))
      );
      uploads = records.filter((u): u is WebCompanionUpload => Boolean(u));
    } else {
      // Attempt to scan all stock upload sets when no filter is provided
      const clientWithKeys = redisClient as unknown as { keys?: (pattern: string) => Promise<string[]> };
      const stockSets = typeof clientWithKeys.keys === 'function'
        ? await clientWithKeys.keys('web-companion:stock:*:uploads')
        : [];
      for (const key of stockSets) {
        const ids = await redisClient.smembers(key);
        const records = await Promise.all(
          ids.map(async (id) => redisClient.get<WebCompanionUpload>(uploadKey(id)))
        );
        uploads.push(...records.filter((u): u is WebCompanionUpload => Boolean(u)));
      }
    }

    const processed = uploads
      .filter((u) => u.status === 'processed' && u.processedUrl)
      .sort((a, b) => {
        const aDate = a.processedAt ? new Date(a.processedAt).getTime() : 0;
        const bDate = b.processedAt ? new Date(b.processedAt).getTime() : 0;
        return bDate - aDate;
      });

    return NextResponse.json({ success: true, uploads: processed });
  } catch (error) {
    console.error('[Web Companion] Failed to load gallery uploads:', error);
    return NextResponse.json({ error: 'Failed to load uploads' }, { status: 500 });
  }
}

