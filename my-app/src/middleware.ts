import { NextRequest, NextResponse } from 'next/server';

/*
 * Shared-key gate for internal / non-browser API routes.
 *
 * IMPORTANT: this only covers routes the browser UI does NOT call. Most
 * mutating endpoints (web-companion uploads, processed-images/save, upload-360,
 * vehicles CRUD, assets DELETE) are invoked directly by the browser, which
 * cannot hold a server secret — securing those requires the session/login phase,
 * not a shared key. Adding the key to them here would break the site.
 *
 * Set WEB_COMPANION_API_KEY in the environment and send it as the `x-api-key`
 * header when calling these routes (e.g. from a seed script or an admin tool).
 * Fails closed: if the key is unset, these routes reject all callers.
 */
const PROTECTED_PREFIXES = [
  '/api/populate',
  '/api/test-upload',
  '/api/media/delete',
  '/api/processed-images/test',
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next();
  }

  const expected = process.env.WEB_COMPANION_API_KEY;
  const provided = req.headers.get('x-api-key');
  if (!expected || !provided || provided !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
  ],
};
