import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rateLimit';

/*
 * Two concerns, both non-breaking:
 *
 * 1. Shared-key gate for internal / non-browser API routes. Only covers routes
 *    the browser UI does NOT call — most mutating endpoints are invoked directly
 *    by the browser (which cannot hold a server secret), so securing those
 *    requires the session/login phase, not a shared key.
 *
 * 2. Per-IP rate limiting on the costly / abusable POST routes (uploads and the
 *    OpenAI-billed endpoints), to blunt cost/DoS/poisoning abuse while they are
 *    still unauthenticated. Limits are generous so normal browser/app use never
 *    trips them; the limiter fails open on any error.
 */

const PROTECTED_PREFIXES = [
  '/api/populate',
  '/api/test-upload',
  '/api/media/delete',
  '/api/processed-images/test',
];

// path prefix -> { limit per window, bucket name }. windowSec is 60.
const RATE_LIMITS: { prefix: string; limit: number; bucket: string }[] = [
  { prefix: '/api/chat', limit: 30, bucket: 'llm' },
  { prefix: '/api/content-generation', limit: 30, bucket: 'llm' },
  { prefix: '/api/upload-360', limit: 60, bucket: 'upload' },
  { prefix: '/api/assets/upload', limit: 60, bucket: 'upload' },
  { prefix: '/api/upload', limit: 60, bucket: 'upload' },
  { prefix: '/api/web-companion/uploads', limit: 60, bucket: 'upload' },
  { prefix: '/api/processed-images/save', limit: 60, bucket: 'upload' },
];

function matchPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(prefix + '/');
}

function clientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.headers.get('x-real-ip') || 'unknown';
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Shared-key gate.
  if (PROTECTED_PREFIXES.some((p) => matchPrefix(pathname, p))) {
    const expected = process.env.WEB_COMPANION_API_KEY;
    const provided = req.headers.get('x-api-key');
    if (!expected || !provided || provided !== expected) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  // 2. Rate limiting (only for POST — GETs are reads and can be chatty).
  if (req.method === 'POST') {
    // Note: /api/upload matches /api/upload-360's prefix guard order — check the
    // longest match by iterating; the first hit wins and buckets are shared.
    const rule = RATE_LIMITS.find((r) => matchPrefix(pathname, r.prefix));
    if (rule) {
      const { allowed } = await rateLimit(`${rule.bucket}:${clientIp(req)}`, {
        limit: rule.limit,
        windowSec: 60,
        now: Date.now(),
      });
      if (!allowed) {
        return NextResponse.json(
          { error: 'Too many requests. Please slow down and try again shortly.' },
          { status: 429 }
        );
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/api/populate/:path*',
    '/api/populate',
    '/api/test-upload/:path*',
    '/api/test-upload',
    '/api/media/delete/:path*',
    '/api/media/delete',
    '/api/processed-images/test/:path*',
    '/api/processed-images/test',
    '/api/chat/:path*',
    '/api/chat',
    '/api/content-generation/:path*',
    '/api/content-generation',
    '/api/upload/:path*',
    '/api/upload',
    '/api/upload-360/:path*',
    '/api/upload-360',
    '/api/assets/upload/:path*',
    '/api/assets/upload',
    '/api/web-companion/uploads/:path*',
    '/api/web-companion/uploads',
    '/api/processed-images/save/:path*',
    '/api/processed-images/save',
  ],
};
