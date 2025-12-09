import { NextRequest, NextResponse } from 'next/server';
import { redisClient } from '@/lib/redis';
import type { WebCompanionUpload, WebCompanionUploadStatus } from '@/types/webCompanion';

const uploadKey = (id: string) => `web-companion:upload:${id}`;

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { uploadId, processedUrl, status, error, imageIndex } = await req.json();

    if (!uploadId) {
      return NextResponse.json({ error: 'uploadId is required' }, { status: 400 });
    }

    const upload = await redisClient.get<WebCompanionUpload>(uploadKey(uploadId));
    if (!upload) {
      return NextResponse.json({ error: 'Upload not found' }, { status: 404 });
    }

    const nextStatus: WebCompanionUploadStatus = status ?? 'processed';

    const updated: WebCompanionUpload = {
      ...upload,
      status: nextStatus,
      processedUrl: processedUrl ?? upload.processedUrl,
      processedAt: new Date().toISOString(),
      error: error ?? undefined,
      imageIndex: imageIndex ?? upload.imageIndex,
    };

    await redisClient.set(uploadKey(uploadId), updated);

    return NextResponse.json({ success: true, upload: updated });
  } catch (err) {
    console.error('[Web Companion] Failed to mark upload processed:', err);
    return NextResponse.json({ error: 'Failed to update upload' }, { status: 500 });
  }
}
