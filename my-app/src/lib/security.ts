import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

/*
 * Shared security helpers: SSRF-safe outbound fetch, upload content-type
 * allowlisting, and S3 key-segment sanitization. Kept dependency-free so it can
 * be imported from any route handler (Node runtime).
 */

// Raster image types we are willing to store in / serve from a public bucket.
// SVG is intentionally excluded: it can carry <script> and would be stored XSS.
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type AllowedImageType = (typeof ALLOWED_IMAGE_TYPES)[number];

export function isAllowedImageType(mimeType: string | null | undefined): mimeType is AllowedImageType {
  return !!mimeType && (ALLOWED_IMAGE_TYPES as readonly string[]).includes(mimeType);
}

/**
 * Restrict a user-supplied value that will become part of an S3 key or a DB
 * unique key (stockNumber, vehicleId, id). Rejects path traversal, slashes, and
 * anything outside a conservative charset so callers cannot craft arbitrary keys
 * or overwrite unrelated records.
 */
export function sanitizeKeySegment(value: unknown, opts: { maxLength?: number } = {}): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  const maxLength = opts.maxLength ?? 64;
  if (trimmed.length === 0 || trimmed.length > maxLength) return null;
  if (!/^[A-Za-z0-9._-]+$/.test(trimmed)) return null;
  if (trimmed === '.' || trimmed === '..' || trimmed.includes('..')) return null;
  return trimmed;
}

// --- SSRF protection -------------------------------------------------------

function ipToLong(ip: string): number | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  let value = 0;
  for (const part of parts) {
    const n = Number(part);
    if (!Number.isInteger(n) || n < 0 || n > 255) return null;
    value = value * 256 + n;
  }
  return value >>> 0;
}

function isPrivateIPv4(ip: string): boolean {
  const long = ipToLong(ip);
  if (long === null) return true; // fail closed on anything we can't parse
  const inRange = (cidrBase: string, bits: number) => {
    const base = ipToLong(cidrBase)!;
    const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
    return (long & mask) === (base & mask);
  };
  return (
    inRange('0.0.0.0', 8) ||       // "this" network
    inRange('10.0.0.0', 8) ||      // private
    inRange('100.64.0.0', 10) ||   // CGNAT
    inRange('127.0.0.0', 8) ||     // loopback
    inRange('169.254.0.0', 16) ||  // link-local incl. 169.254.169.254 metadata
    inRange('172.16.0.0', 12) ||   // private
    inRange('192.0.0.0', 24) ||    // IETF protocol
    inRange('192.168.0.0', 16) ||  // private
    inRange('198.18.0.0', 15) ||   // benchmarking
    inRange('224.0.0.0', 4) ||     // multicast
    inRange('240.0.0.0', 4)        // reserved
  );
}

function isPrivateIPv6(ip: string): boolean {
  const addr = ip.toLowerCase().split('%')[0]; // strip zone id
  if (addr === '::1' || addr === '::') return true;
  if (addr.startsWith('fe80') || addr.startsWith('fc') || addr.startsWith('fd')) return true; // link-local, ULA
  // IPv4-mapped/compatible (::ffff:a.b.c.d) — validate the embedded v4.
  const mapped = addr.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (mapped) return isPrivateIPv4(mapped[1]);
  return false;
}

function isDisallowedAddress(ip: string): boolean {
  const kind = isIP(ip);
  if (kind === 4) return isPrivateIPv4(ip);
  if (kind === 6) return isPrivateIPv6(ip);
  return true; // not a valid IP → reject
}

/**
 * Validate a user-supplied URL for outbound fetching: https only, and every
 * resolved address must be public (blocks localhost, RFC1918/ULA, link-local,
 * and the 169.254.169.254 cloud-metadata endpoint). Throws on rejection.
 */
export async function assertPublicHttpsUrl(rawUrl: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error('Invalid URL');
  }
  if (url.protocol !== 'https:') {
    throw new Error('Only https URLs are allowed');
  }
  const host = url.hostname;
  // If the host is a literal IP, check it directly; otherwise resolve all A/AAAA.
  if (isIP(host)) {
    if (isDisallowedAddress(host)) throw new Error('URL resolves to a disallowed address');
    return url;
  }
  const results = await lookup(host, { all: true });
  if (results.length === 0) throw new Error('Host did not resolve');
  for (const { address } of results) {
    if (isDisallowedAddress(address)) throw new Error('URL resolves to a disallowed address');
  }
  return url;
}

/**
 * Fetch a user-supplied URL with SSRF protection AND manual redirect handling so
 * every hop is re-validated (a public URL can 3xx-redirect to an internal one).
 */
export async function safeImageFetch(
  rawUrl: string,
  opts: { maxRedirects?: number; maxBytes?: number; headers?: Record<string, string> } = {}
): Promise<{ body: ArrayBuffer; contentType: string }> {
  const maxRedirects = opts.maxRedirects ?? 4;
  const maxBytes = opts.maxBytes ?? 15 * 1024 * 1024;
  let current = rawUrl;

  for (let hop = 0; hop <= maxRedirects; hop++) {
    const url = await assertPublicHttpsUrl(current);
    const response = await fetch(url, {
      redirect: 'manual',
      headers: opts.headers,
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) throw new Error('Redirect without location');
      current = new URL(location, url).toString();
      continue;
    }

    if (!response.ok) {
      throw new Error(`Upstream returned ${response.status}`);
    }

    const rawType = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    if (!rawType.startsWith('image/')) {
      throw new Error('Upstream content-type is not an image');
    }

    const declaredLength = Number(response.headers.get('content-length'));
    if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
      throw new Error('Image exceeds size limit');
    }

    const body = await response.arrayBuffer();
    if (body.byteLength > maxBytes) {
      throw new Error('Image exceeds size limit');
    }
    return { body, contentType: rawType };
  }

  throw new Error('Too many redirects');
}
