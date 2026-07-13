import { NextRequest, NextResponse } from 'next/server';
import { safeImageFetch } from '@/lib/security';

export const runtime = 'nodejs';

// GET /api/proxy-image?url=<image-url>
// Only fetches public https image URLs. All redirect hops are re-validated so a
// public URL cannot redirect into the cloud-metadata endpoint or an internal
// service, and the response is never returned with an attacker-influenced
// content-type or a wildcard CORS header.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const imageUrl = searchParams.get('url');

  if (!imageUrl) {
    return new NextResponse('Missing url parameter', { status: 400 });
  }

  try {
    const { body, contentType } = await safeImageFetch(imageUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });

    return new NextResponse(body, {
      headers: {
        'Content-Type': contentType.startsWith('image/') ? contentType : 'image/jpeg',
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    // Do not leak the resolved host/port or library internals to the caller.
    console.error('[API] Error proxying image:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    const safe = new Set([
      'Invalid URL',
      'Only https URLs are allowed',
      'URL resolves to a disallowed address',
      'Host did not resolve',
      'Upstream content-type is not an image',
      'Image exceeds size limit',
      'Too many redirects',
    ]);
    return new NextResponse(safe.has(message) ? message : 'Unable to fetch image', { status: 400 });
  }
}
