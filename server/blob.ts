/**
 * Private Vercel Blob helper for hotel images (server-side only).
 *
 * Security posture (see plan):
 *  - The read/write token (BLOB_READ_WRITE_TOKEN) or OIDC credentials are read
 *    ONLY from the server environment by the SDK. They are never sent to the
 *    browser and never returned in any API response.
 *  - Files are uploaded with `access: 'private'`, so the raw blob URLs are NOT
 *    publicly fetchable. Delivery goes through the authorized proxy route
 *    (`GET /api/hotel-image/:id` in server.ts) which uses `get(url, { access: 'private' })`.
 *  - Storage paths are generated here (unpredictable), never taken from the
 *    client-supplied filename.
 */
import { put, get, del } from '@vercel/blob';
import crypto from 'crypto';

export interface BlobUploadResult {
  url: string;
  pathname: string;
  contentType: string;
  size: number;
}

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB per image.

/** True when Blob credentials are available (static token or Vercel OIDC). */
export function isBlobConfigured(): boolean {
  return Boolean(
    process.env.BLOB_READ_WRITE_TOKEN ||
      (process.env.VERCEL_OIDC_TOKEN && process.env.BLOB_STORE_ID)
  );
}

/**
 * Detect an allowed image format from the actual file signature (magic bytes),
 * not the client-declared MIME type. Returns a canonical { contentType, ext }
 * or null when the buffer is not a supported image.
 */
export function detectImageType(buffer: Buffer): { contentType: string; ext: string } | null {
  if (!buffer || buffer.length < 12) return null;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { contentType: 'image/jpeg', ext: 'jpg' };
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47 &&
    buffer[4] === 0x0d && buffer[5] === 0x0a && buffer[6] === 0x1a && buffer[7] === 0x0a
  ) {
    return { contentType: 'image/png', ext: 'png' };
  }
  // WebP: "RIFF" <4 bytes> "WEBP"
  if (
    buffer.slice(0, 4).toString('ascii') === 'RIFF' &&
    buffer.slice(8, 12).toString('ascii') === 'WEBP'
  ) {
    return { contentType: 'image/webp', ext: 'webp' };
  }
  // AVIF: <4 size bytes> "ftyp" brand "avif" | "avis"
  if (
    buffer.slice(4, 8).toString('ascii') === 'ftyp' &&
    ['avif', 'avis', 'mif1', 'msf1'].includes(buffer.slice(8, 12).toString('ascii'))
  ) {
    return { contentType: 'image/avif', ext: 'avif' };
  }
  return null;
}

function buildPathname(ext: string): string {
  const year = new Date().getFullYear();
  const id = crypto.randomUUID();
  return `hotel-images/${year}/${id}.${ext}`;
}

/**
 * Upload a validated hotel image buffer to the private Blob store.
 * Throws a typed Error when validation fails or the upload is rejected.
 */
export async function uploadHotelImage(
  buffer: Buffer,
  declaredContentType?: string
): Promise<BlobUploadResult> {
  if (!isBlobConfigured()) {
    const err = new Error(
      'Vercel Blob is not configured. Set BLOB_READ_WRITE_TOKEN (or connect a private Blob store via Vercel).'
    );
    (err as any).status = 503;
    throw err;
  }

  if (buffer.length > MAX_BYTES) {
    const err = new Error('Image exceeds the maximum size of 10MB.');
    (err as any).status = 400;
    throw err;
  }

  const detected = detectImageType(buffer);
  if (!detected) {
    const err = new Error('Unsupported image format. Allowed: JPEG, PNG, WebP, AVIF.');
    (err as any).status = 400;
    throw err;
  }

  // The signature wins over any client-declared content type.
  const pathname = buildPathname(detected.ext);
  const blob = await put(pathname, buffer, {
    access: 'private',
    contentType: detected.contentType,
    addRandomSuffix: false,
  });

  return {
    url: blob.url,
    pathname: blob.pathname,
    contentType: blob.contentType || detected.contentType,
    size: buffer.length,
  };
}

/**
 * Fetch a private blob's content stream for authorized delivery.
 * Returns the raw SDK result (stream + metadata) or null if not found.
 */
export async function fetchPrivateBlob(url: string) {
  return get(url, { access: 'private' });
}

/**
 * Best-effort delete of a private blob. Never throws: callers may proceed with
 * DB cleanup even when the remote delete fails (an orphaned private blob is not
 * a security issue, only a storage-cost one).
 */
export async function deleteBlobByUrl(url: string): Promise<boolean> {
  try {
    await del(url);
    return true;
  } catch (err) {
    console.error('[Blob] delete failed for', url, (err as Error)?.message || err);
    return false;
  }
}
