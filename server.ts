/**
 * Red Rock Hotel — Express API + SPA server.
 *
 * Works in three modes with one codebase:
 *  - Local dev:        `npm run dev`  (tsx server.ts, Vite middleware mode)
 *  - Local prod:       `npm run start` (tsx server.ts --prod, serves dist/)
 *  - Vercel:           api/index.ts re-exports `app` as a serverless function.
 *
 * All data access goes through Neon PostgreSQL (server/db.ts). No local
 * filesystem persistence is required for production data.
 */
import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import dotenv from 'dotenv';
import {
  ensureSchema,
  getAll,
  getOne,
  runQuery,
  verifyPassword,
  hashPassword,
  createSession,
  validateSession,
  deleteSession,
  saveUploadedFile,
  getUploadedFile,
} from './server/db.js';
import {
  uploadHotelImage,
  uploadPrivateImage,
  fetchPrivateBlob,
  deleteBlobByUrl,
  isBlobConfigured,
} from './server/blob.js';
import { Readable } from 'stream';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load DATABASE_URL etc. from the project .env (no-op on Vercel, where env vars are injected).
dotenv.config({ path: path.resolve(__dirname, '.env') });

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === 'production' || process.argv.includes('--prod');

// Local filesystem copy of uploads (legacy + local dev convenience).
const uploadsDir = path.resolve(__dirname, 'public/uploads');

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Ensure the Neon schema exists before handling API requests (runs at most once per warm instance).
// Scoped to /api/* so the static site still loads if the database is misconfigured.
app.use('/api', async (req, res, next) => {
  if (req.method === 'GET' && req.path === '/health') return next();
  try {
    await ensureSchema();
    next();
  } catch (err) {
    console.error('[DB] Schema initialization failed:', err);
    res.status(500).json({ success: false, message: 'Database unavailable. Check DATABASE_URL configuration.' });
  }
});

// Lightweight health probe (no DB dependency) for deployment verification.
app.get('/api/health', (_req, res) => {
  res.json({ success: true, status: 'ok', time: new Date().toISOString() });
});

// Bundled images (repo assets served from dist in prod, from public/ in dev).
const imagesRoot = isProd ? path.resolve(__dirname, 'dist/images') : path.resolve(__dirname, 'public/images');
app.use('/images', express.static(imagesRoot, {
  setHeaders: (res, filePath) => {
    // Some Node/Express setups do not know the AVIF MIME type.
    if (filePath.toLowerCase().endsWith('.avif')) res.setHeader('Content-Type', 'image/avif');
  },
}));
// Legacy local uploads (pre-Neon files) — still served during local dev.
app.use('/uploads', express.static(uploadsDir));

// Central error handler — must be registered with the routes; JSON responses, no stack leaks.
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[API] Unhandled error:', err?.message || err);
  if (res.headersSent) return;
  res.status(err?.status || 500).json({ success: false, message: err?.message || 'Internal server error' });
});

// ------------------------------------------
// PUBLIC API ROUTES
// ------------------------------------------

type Handler = (req: Request, res: Response) => Promise<void>;
const wrap = (fn: Handler) => (req: Request, res: Response, next: NextFunction) => {
  fn(req, res).catch(next);
};

// ------------------------------------------
// ROOM CATALOGUE + WALKTHROUGH HELPERS
// ------------------------------------------

function normalizeAmenities(input: unknown): string[] {
  const arr = Array.isArray(input) ? input : typeof input === 'string' ? input.split(',') : [];
  const seen = new Set<string>();
  for (const raw of arr) {
    const v = String(raw).trim().slice(0, 40);
    if (v) seen.add(v);
  }
  return Array.from(seen).slice(0, 30);
}

// Server-side validation for the extended room fields. Returns an error
// message or null. Prices are only ever set through these authorized routes.
function validateRoomFields(b: any): string | null {
  if (!b || typeof b !== 'object') return null;
  if (b.title !== undefined && String(b.title).trim().length > 120) return 'Room name must be 120 characters or fewer.';
  if (b.roomType !== undefined && String(b.roomType).trim().length > 80) return 'Room category must be 80 characters or fewer.';
  if (b.pricePerNight !== undefined) {
    const p = parseMoney(b.pricePerNight, { optional: true });
    if (p === null || Number.isNaN(p) || p > 100000000) return 'Price per night must be a valid non-negative number.';
  }
  if (b.maxGuests !== undefined) {
    const g = b.maxGuests === null || b.maxGuests === '' ? 0 : Number(b.maxGuests);
    if (!Number.isInteger(g) || g < 0 || g > 12) return 'Maximum guests must be a whole number between 0 and 12.';
  }
  if (b.slug !== undefined && String(b.slug).trim().length > 80) return 'Room slug must be 80 characters or fewer.';
  return null;
}

// Extracts the extended catalogue columns from a request body (camelCase in,
// snake_case DB values out). Validation must run before this is used.
function extractRoomExtFields(b: any): Record<string, unknown> {
  const price = b.pricePerNight !== undefined && b.pricePerNight !== null && String(b.pricePerNight) !== ''
    ? (parseMoney(b.pricePerNight, {}) || 0)
    : 0;
  const guests = b.maxGuests !== undefined && b.maxGuests !== null && String(b.maxGuests) !== ''
    ? Number(b.maxGuests)
    : 0;
  const publishStatus = b.publishStatus && ['draft', 'published', 'maintenance', 'unavailable'].includes(String(b.publishStatus))
    ? String(b.publishStatus)
    : 'published';
  return {
    short_description: String(b.shortDescription ?? '').trim().slice(0, 300),
    price_per_night: Number.isFinite(price) ? price : 0,
    currency: String(b.currency || 'PKR').trim().toUpperCase().slice(0, 3) || 'PKR',
    max_guests: Number.isInteger(guests) ? guests : 0,
    bed_type: String(b.bedType ?? '').trim().slice(0, 80),
    room_size: String(b.roomSize ?? '').trim().slice(0, 60),
    amenities: normalizeAmenities(b.amenities),
    publish_status: publishStatus,
  };
}

function roomToDto(row: any): any {
  if (!row) return row;
  let amenities: string[] = [];
  try { amenities = typeof row.amenities === 'string' ? JSON.parse(row.amenities) : (row.amenities || []); } catch { amenities = []; }
  let gallery: string[] = [];
  try { gallery = typeof row.gallery === 'string' ? JSON.parse(row.gallery) : (row.gallery || []); } catch { gallery = []; }
  return {
    ...row,
    slug: row.slug || row.room_number,
    price_per_night: Number(row.price_per_night || 0),
    max_guests: Number(row.max_guests || 0),
    display_order: Number(row.display_order || 0),
    publish_status: row.publish_status || (Number(row.is_published) === 1 ? 'published' : 'draft'),
    amenities,
    gallery,
  };
}

async function ensureUniqueRoomSlug(base: string, excludeId?: string): Promise<string> {
  const root = base || 'room';
  let candidate = root;
  let n = 1;
  while (n < 200) {
    const q = excludeId
      ? `SELECT id FROM rooms WHERE slug = $1 AND id <> $2`
      : `SELECT id FROM rooms WHERE slug = $1 AND slug <> ''`;
    const existing = await getOne<{ id: string }>(q, excludeId ? [candidate, excludeId] : [candidate]);
    if (!existing) return candidate;
    n += 1;
    candidate = `${root}-${n}`;
  }
  return `${root}-${Date.now()}`;
}

// Keeps the legacy gallery JSON column in sync so the existing room modal
// and availability matrix can render blob/primary images without changes.
async function syncRoomGalleryWithPrimary(room: any, primary: string): Promise<void> {
  let arr: string[] = [];
  try { arr = typeof room.gallery === 'string' ? JSON.parse(room.gallery) : (Array.isArray(room.gallery) ? room.gallery : []); } catch { arr = []; }
  if (!Array.isArray(arr)) arr = [];
  if (!arr.includes(primary)) arr = [primary, ...arr.filter((x) => x && x !== room.image_url)];
  await runQuery('UPDATE rooms SET gallery = $1, updated_at = $2 WHERE id = $3', [JSON.stringify(arr), new Date().toISOString(), room.id]);
}

function decodeImagePayload(fileData: unknown): Buffer | null {
  const matches = String(fileData || '').match(/^data:image\/([A-Za-z-+]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) return null;
  const buf = Buffer.from(matches[2], 'base64');
  return buf.length ? buf : null;
}

// Walkthrough editor text: plain text only (the public renderer never uses
// dangerouslySetInnerHTML), stripped of control characters and length-capped.
function sanitizeLite(v: unknown, max = 4000): string {
  return String(v ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max);
}

// Shared private-blob streaming (extracted from the hotel-image route so room
// images reuse the exact same authorization-aware delivery posture).
async function streamPrivateBlob(res: Response, blobUrl: string, contentType: string, publicCache: boolean) {
  let blob;
  try {
    blob = await fetchPrivateBlob(blobUrl);
  } catch (err) {
    console.error('[Blob] fetch failed:', (err as Error)?.message || err);
    res.status(502).setHeader('Cache-Control', 'no-store').json({ success: false, message: 'Image temporarily unavailable.' });
    return;
  }
  if (!blob || Number(blob.statusCode) === 404) {
    res.status(404).setHeader('Cache-Control', 'no-store').json({ success: false, message: 'Image not found in storage.' });
    return;
  }
  if (!blob.stream) {
    res.status(Number(blob.statusCode) || 204).end();
    return;
  }
  res.setHeader('Content-Type', (blob as any).blob?.contentType || contentType || 'application/octet-stream');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', publicCache ? 'public, max-age=300, stale-while-revalidate=60' : 'private, no-store');
  const etag = (blob as any).blob?.etag;
  if (etag) res.setHeader('ETag', etag);
  const nodeStream = Readable.fromWeb(blob.stream as any);
  nodeStream.on('error', (err) => {
    console.error('[Blob] stream error:', err?.message || err);
    if (!res.headersSent) res.status(502).end();
    else res.destroy(err);
  });
  nodeStream.pipe(res);
}

// 1. Get published facility sections (Entrance, Reception, etc.)
app.get('/api/facility', wrap(async (_req, res) => {
  const facilities = await getAll(`
    SELECT id, type, title, description, image_url, display_order, is_published, created_at, updated_at
    FROM facility_sections
    WHERE is_published = 1
    ORDER BY display_order ASC
  `);
  res.json({ success: true, facilities });
}));

// 2. Get published dynamic gallery items in exact sequence
app.get('/api/gallery', wrap(async (_req, res) => {
  const items = await getAll(`
    SELECT id, category, title, room_number, description, image_url, display_order, is_published, created_at, updated_at
    FROM gallery_items
    WHERE is_published = 1
    ORDER BY display_order ASC
  `);
  res.json({ success: true, items });
}));

// 3. Get published rooms with optional catalogue filters (category, guests,
// price range, availability). Unpublished/draft rooms are only returned for
// authenticated admin sessions.
app.get('/api/rooms', wrap(async (req, res) => {
  const {
    category, guests, minPrice, maxPrice, availableOnly, sort = 'featured',
  } = req.query as Record<string, string>;

  const token = extractToken(req);
  const session = token ? await validateSession(token) : { valid: false };
  const isAdmin = Boolean(session.valid);

  const where: string[] = [];
  where.push(isAdmin ? `1 = 1` : `is_published = 1 AND publish_status = 'published'`);

  const params: unknown[] = [];
  const addParam = (v: unknown) => { params.push(v); return `$${params.length}`; };

  if (category && category.trim() && category !== 'all') where.push(`room_type = ${addParam(category.trim())}`);
  if (guests && Number.isFinite(Number(guests)) && Number(guests) > 0) where.push(`max_guests >= ${addParam(Number(guests))}`);
  if (minPrice && Number.isFinite(Number(minPrice))) where.push(`price_per_night >= ${addParam(Number(minPrice))}`);
  if (maxPrice && Number.isFinite(Number(maxPrice))) where.push(`price_per_night <= ${addParam(Number(maxPrice))}`);
  if (availableOnly && ['1', 'true', 'yes'].includes(String(availableOnly))) where.push(`is_available = 1 AND status = 'Available'`);

  const orderMap: Record<string, string> = {
    price_asc: 'price_per_night ASC',
    price_desc: 'price_per_night DESC',
    name_asc: 'title ASC',
    featured: 'display_order ASC, room_number ASC',
  };
  const orderSql = orderMap[sort] || orderMap.featured;

  const rooms = await getAll(`
    SELECT * FROM rooms
    WHERE ${where.join(' AND ')}
    ORDER BY ${orderSql}
  `, params);
  res.json({ success: true, rooms: rooms.map(roomToDto) });
}));

// 4. Get public food items (No pricing)
app.get('/api/food', wrap(async (_req, res) => {
  const food = await getAll(`
    SELECT id, name, thumbnail, available_from, available_until, is_available, created_at, updated_at
    FROM food
    ORDER BY created_at DESC
  `);
  res.json({ success: true, food });
}));

// 5. Get public hotel settings (WhatsApp number, etc.)
app.get('/api/settings', wrap(async (_req, res) => {
  const settings = await getOne<{ id: string; whatsapp_number: string; updated_at: string }>(
    `SELECT id, whatsapp_number, updated_at FROM settings WHERE id = $1`,
    ['general']
  );
  res.json({
    success: true,
    settings: settings || { id: 'general', whatsapp_number: '', updated_at: new Date().toISOString() }
  });
}));

// ------------------------------------------
// AUTHENTICATION MIDDLEWARE
// ------------------------------------------

interface AuthenticatedRequest extends Request {
  adminUser?: string;
}

function extractToken(req: Request): string | undefined {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) return authHeader.substring(7);
  const headerToken = req.headers['x-admin-token'];
  if (typeof headerToken === 'string' && headerToken) return headerToken;
  // <img> tags cannot send headers, so image delivery routes also accept the
  // session token as a query parameter (validated exactly the same way).
  const queryToken = (req as any).query?.token;
  if (typeof queryToken === 'string' && queryToken) return queryToken;
  return undefined;
}

async function requireAdminAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) {
    res.status(401).json({ success: false, message: 'Authentication required. Access denied.' });
    return;
  }
  try {
    const session = await validateSession(token);
    if (!session.valid || !session.username) {
      res.status(401).json({ success: false, message: 'Session expired or invalid. Please sign in again.' });
      return;
    }
    req.adminUser = session.username;
    next();
  } catch (err) {
    console.error('Session validation error:', err);
    res.status(500).json({ success: false, message: 'Authentication service unavailable' });
  }
}

// ------------------------------------------
// ADMIN AUTHENTICATION
// ------------------------------------------

app.post('/api/admin/login', wrap(async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    res.status(400).json({ success: false, message: 'Username and password are required' });
    return;
  }

  const admin = await getOne<{ id: number; username: string; password_hash: string; salt: string }>(
    `SELECT id, username, password_hash, salt FROM admin WHERE username = $1`,
    [String(username).trim()]
  );

  if (!admin || !verifyPassword(String(password), admin.password_hash, admin.salt)) {
    res.status(401).json({ success: false, message: 'Invalid credentials. Access denied.' });
    return;
  }

  const token = await createSession(admin.username);
  res.json({
    success: true,
    token,
    admin: {
      username: admin.username,
      role: 'Administrator',
      loginTime: new Date().toISOString()
    }
  });
}));

app.post('/api/admin/logout', wrap(async (req, res) => {
  const token = extractToken(req);
  if (token) {
    await deleteSession(token);
  }
  res.json({ success: true, message: 'Signed out successfully' });
}));

app.get('/api/admin/me', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
  res.json({
    success: true,
    admin: {
      username: req.adminUser,
      role: 'Administrator'
    }
  });
});

app.put('/api/admin/password', requireAdminAuth, wrap(async (req: AuthenticatedRequest, res: Response) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword || String(newPassword).length < 6) {
    res.status(400).json({
      success: false,
      message: 'Current password and a new password with at least 6 characters are required.'
    });
    return;
  }

  const admin = await getOne<{ username: string; password_hash: string; salt: string }>(
    `SELECT username, password_hash, salt FROM admin WHERE username = $1`,
    [req.adminUser as string]
  );

  if (!admin || !verifyPassword(String(currentPassword), admin.password_hash, admin.salt)) {
    res.status(401).json({ success: false, message: 'Current password incorrect.' });
    return;
  }

  const { hash, salt } = hashPassword(String(newPassword));
  await runQuery(`UPDATE admin SET password_hash = $1, salt = $2 WHERE username = $3`, [hash, salt, admin.username]);

  res.json({ success: true, message: 'Password updated successfully.' });
}));

// ------------------------------------------
// ADMIN FACILITY MANAGEMENT (Entrance & Reception)
// ------------------------------------------

app.get('/api/admin/facility', requireAdminAuth, wrap(async (_req, res) => {
  const facilities = await getAll('SELECT * FROM facility_sections ORDER BY display_order ASC');
  res.json({ success: true, facilities });
}));

app.put('/api/admin/facility/:id', requireAdminAuth, wrap(async (req, res) => {
  const { id } = req.params;
  const { title, description, image_url, display_order, is_published } = req.body || {};

  const existing = await getOne<any>('SELECT * FROM facility_sections WHERE id = $1', [id]);
  if (!existing) {
    res.status(404).json({ success: false, message: 'Facility section not found' });
    return;
  }

  const now = new Date().toISOString();
  const cleanTitle = title !== undefined ? String(title).trim() : existing.title;
  const cleanDesc = description !== undefined ? String(description).trim() : existing.description;
  const cleanImage = image_url !== undefined ? String(image_url).trim() : existing.image_url;
  const cleanOrder = display_order !== undefined ? Number(display_order) : existing.display_order;
  const cleanPublished = is_published !== undefined ? (is_published ? 1 : 0) : existing.is_published;

  await runQuery(`
    UPDATE facility_sections
    SET title = $1, description = $2, image_url = $3, display_order = $4, is_published = $5, updated_at = $6
    WHERE id = $7
  `, [cleanTitle, cleanDesc, cleanImage, cleanOrder, cleanPublished, now, id]);

  // Synchronize the corresponding gallery item when this facility maps to one.
  // (Only when the gallery row already exists — never insert or delete here.)
  const galId = id === 'entrance' ? 'gal-01-entrance' : id === 'reception' ? 'gal-02-reception' : null;
  if (galId) {
    await runQuery(`
      UPDATE gallery_items
      SET title = $1, description = $2, image_url = $3, is_published = $4, updated_at = $5
      WHERE id = $6
    `, [cleanTitle, cleanDesc, cleanImage, cleanPublished, now, galId]);
  }

  const updated = await getOne('SELECT * FROM facility_sections WHERE id = $1', [id]);
  res.json({ success: true, facility: updated });
}));

app.post('/api/admin/facility', requireAdminAuth, wrap(async (req, res) => {
  const { id, type, title, description, image_url, display_order, is_published } = req.body || {};
  if (!title) {
    res.status(400).json({ success: false, message: 'Title is required' });
    return;
  }

  const cleanId = id ? String(id).trim() : `facility-${Date.now()}`;
  const cleanType = type || 'facility';
  const cleanTitle = String(title).trim();
  const cleanDesc = description ? String(description).trim() : '';
  const cleanImage = image_url || '/images/00-entrance.jpg';
  const cleanOrder = display_order ? Number(display_order) : 99;
  const cleanPublished = is_published !== false && is_published !== 0 ? 1 : 0;
  const now = new Date().toISOString();

  await runQuery(`
    INSERT INTO facility_sections (id, type, title, description, image_url, display_order, is_published, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
  `, [cleanId, cleanType, cleanTitle, cleanDesc, cleanImage, cleanOrder, cleanPublished, now, now]);

  const created = await getOne('SELECT * FROM facility_sections WHERE id = $1', [cleanId]);
  res.json({ success: true, facility: created });
}));

app.delete('/api/admin/facility/:id', requireAdminAuth, wrap(async (req, res) => {
  const { id } = req.params;
  if (id === 'entrance' || id === 'reception') {
    res.status(400).json({ success: false, message: 'Default entrance and reception sections cannot be deleted, but can be edited or unpublished.' });
    return;
  }
  const result = await runQuery('DELETE FROM facility_sections WHERE id = $1', [id]);
  if (result.rowCount === 0) {
    res.status(404).json({ success: false, message: 'Facility section not found' });
    return;
  }
  res.json({ success: true, message: 'Facility section deleted successfully' });
}));

// ------------------------------------------
// ADMIN ROOM MANAGEMENT (Full Dynamic Controls & Live Availability)
// ------------------------------------------

// Admin: list all rooms (with the extended catalogue fields resolved).
app.get('/api/admin/rooms', requireAdminAuth, wrap(async (_req, res) => {
  const rooms = await getAll('SELECT * FROM rooms ORDER BY display_order ASC, room_number ASC');
  res.json({ success: true, rooms: rooms.map(roomToDto) });
}));

app.post('/api/admin/rooms', requireAdminAuth, wrap(async (req, res) => {
  const { room_number, room_type, title, description, image_url, status, display_order, is_published, gallery } = req.body || {};
  if (!room_number || !String(room_number).trim()) {
    res.status(400).json({ success: false, message: 'Room number is required (e.g. Room 21)' });
    return;
  }

  const cleanNum = String(room_number).trim();
  const existingNum = await getOne('SELECT id FROM rooms WHERE room_number = $1', [cleanNum]);
  if (existingNum) {
    res.status(400).json({ success: false, message: `A room with number "${cleanNum}" already exists.` });
    return;
  }
  const roomErr = validateRoomFields(req.body || {});
  if (roomErr) {
    res.status(400).json({ success: false, message: roomErr });
    return;
  }

  const id = `room-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const cleanType = room_type ? String(room_type).trim() : 'Deluxe King Suite';
  const cleanTitle = title ? String(title).trim() : cleanType;
  const cleanDesc = description ? String(description).trim() : `${cleanNum} featuring air conditioning, ensuite bath, and luxury bedding.`;
  const cleanImage = image_url || '/images/room_suite_king.jpg';
  const cleanStatus = ['Available', 'Occupied', 'Reserved', 'Maintenance'].includes(status) ? status : 'Available';
  const isAvail = cleanStatus === 'Available' ? 1 : 0;
  const cleanOrder = display_order ? Number(display_order) : 99;
  const cleanPublished = is_published !== false && is_published !== 0 ? 1 : 0;
  const galleryStr = Array.isArray(gallery) ? JSON.stringify(gallery) : JSON.stringify([cleanImage]);
  const now = new Date().toISOString();
  const ext = extractRoomExtFields(req.body || {});
  const slug = await ensureUniqueRoomSlug(slugify(cleanTitle || cleanNum));

  await runQuery(`
    INSERT INTO rooms (id, room_number, is_available, status, image_url, room_type, title, description, display_order, is_published, gallery,
      slug, short_description, price_per_night, currency, max_guests, bed_type, room_size, amenities, publish_status, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
  `, [id, cleanNum, isAvail, cleanStatus, cleanImage, cleanType, cleanTitle, cleanDesc, cleanOrder, cleanPublished, galleryStr,
      slug, ext.short_description, ext.price_per_night, ext.currency, ext.max_guests, ext.bed_type, ext.room_size, ext.amenities, ext.publish_status, now, now]);

  const created = await getOne('SELECT * FROM rooms WHERE id = $1', [id]);
  res.json({ success: true, room: roomToDto(created) });
}));

app.put('/api/admin/rooms/:id', requireAdminAuth, wrap(async (req, res) => {
  const { id } = req.params;
  const existing = await getOne<any>('SELECT * FROM rooms WHERE id = $1', [id]);
  if (!existing) {
    res.status(404).json({ success: false, message: 'Room not found' });
    return;
  }

  const { room_number, room_type, title, description, image_url, status, display_order, is_published, gallery } = req.body || {};
  const cleanNum = room_number !== undefined ? String(room_number).trim() : existing.room_number;

  if (cleanNum !== existing.room_number) {
    const dup = await getOne('SELECT id FROM rooms WHERE room_number = $1 AND id != $2', [cleanNum, id]);
    if (dup) {
      res.status(400).json({ success: false, message: `Room number "${cleanNum}" is already in use by another room.` });
      return;
    }
  }
  const roomErr = validateRoomFields(req.body || {});
  if (roomErr) {
    res.status(400).json({ success: false, message: roomErr });
    return;
  }

  const cleanType = room_type !== undefined ? String(room_type).trim() : existing.room_type;
  const cleanTitle = title !== undefined ? String(title).trim() : existing.title;
  const cleanDesc = description !== undefined ? String(description).trim() : existing.description;
  const cleanImage = image_url !== undefined ? String(image_url).trim() : existing.image_url;
  const cleanStatus = status !== undefined && ['Available', 'Occupied', 'Reserved', 'Maintenance'].includes(status)
    ? status
    : existing.status || 'Available';
  const isAvail = cleanStatus === 'Available' ? 1 : 0;
  const cleanOrder = display_order !== undefined ? Number(display_order) : existing.display_order;
  const cleanPublished = is_published !== undefined ? (is_published ? 1 : 0) : existing.is_published;
  const cleanGallery = gallery !== undefined ? (Array.isArray(gallery) ? JSON.stringify(gallery) : String(gallery)) : existing.gallery;
  const now = new Date().toISOString();

  // Extended catalogue fields (all optional — untouched columns keep their values).
  const ext = extractRoomExtFields(req.body || {});
  const b = req.body || {};
  const shortDesc = b.shortDescription !== undefined ? String(b.shortDescription).trim().slice(0, 300) : existing.short_description;
  const price = b.pricePerNight !== undefined ? ext.price_per_night : Number(existing.price_per_night || 0);
  const currency = b.currency !== undefined ? (String(b.currency).trim().toUpperCase().slice(0, 3) || existing.currency) : (existing.currency || 'PKR');
  const maxGuests = b.maxGuests !== undefined ? ext.max_guests : Number(existing.max_guests || 0);
  const bedType = b.bedType !== undefined ? String(b.bedType).trim().slice(0, 80) : existing.bed_type;
  const roomSize = b.roomSize !== undefined ? String(b.roomSize).trim().slice(0, 60) : existing.room_size;
  const amenities = b.amenities !== undefined ? JSON.stringify(ext.amenities) : (existing.amenities || '[]');
  // publish_status is the listing state; keep the legacy flag in sync.
  let publishStatus = b.publishStatus && ['draft', 'published', 'maintenance', 'unavailable'].includes(String(b.publishStatus))
    ? String(b.publishStatus)
    : (existing.publish_status || 'published');
  if (b.publishStatus === undefined && b.is_published !== undefined) {
    publishStatus = cleanPublished ? 'published' : 'draft';
  }
  const finalPublished = publishStatus === 'published' ? 1 : cleanPublished;

  let slug = existing.slug || '';
  if (b.slug !== undefined && String(b.slug).trim()) {
    slug = await ensureUniqueRoomSlug(slugify(b.slug), id);
  } else if (cleanTitle !== existing.title) {
    slug = await ensureUniqueRoomSlug(slugify(cleanTitle), id);
  }

  await runQuery(`
    UPDATE rooms
    SET room_number = $1, room_type = $2, title = $3, description = $4, image_url = $5, status = $6, is_available = $7, display_order = $8, is_published = $9, gallery = $10,
      slug = $11, short_description = $12, price_per_night = $13, currency = $14, max_guests = $15, bed_type = $16, room_size = $17, amenities = $18, publish_status = $19, updated_at = $20
    WHERE id = $21
  `, [cleanNum, cleanType, cleanTitle, cleanDesc, cleanImage, cleanStatus, isAvail, cleanOrder, finalPublished, cleanGallery,
      slug, shortDesc, price, currency, maxGuests, bedType, roomSize, amenities, publishStatus, now, id]);

  const updated = await getOne('SELECT * FROM rooms WHERE id = $1', [id]);
  res.json({ success: true, room: roomToDto(updated) });
}));

// Update individual room availability status (Available, Occupied, Reserved, Maintenance)
app.put('/api/admin/rooms/:id/availability', requireAdminAuth, wrap(async (req, res) => {
  const { id } = req.params;
  const { status, is_available } = req.body || {};

  const current = await getOne<any>('SELECT id, is_available, status FROM rooms WHERE id = $1', [id]);
  if (!current) {
    res.status(404).json({ success: false, message: 'Room not found' });
    return;
  }

  let nextStatus = current.status || 'Available';
  let nextAvail = current.is_available === 1 ? 1 : 0;

  if (status && ['Available', 'Occupied', 'Reserved', 'Maintenance'].includes(status)) {
    nextStatus = status;
    nextAvail = status === 'Available' ? 1 : 0;
  } else if (typeof is_available === 'boolean') {
    nextAvail = is_available ? 1 : 0;
    nextStatus = is_available ? 'Available' : 'Occupied';
  } else {
    nextAvail = current.is_available === 1 ? 0 : 1;
    nextStatus = nextAvail === 1 ? 'Available' : 'Occupied';
  }

  const now = new Date().toISOString();
  await runQuery('UPDATE rooms SET is_available = $1, status = $2, updated_at = $3 WHERE id = $4', [nextAvail, nextStatus, now, id]);

  const updated = await getOne('SELECT * FROM rooms WHERE id = $1', [id]);
  res.json({ success: true, room: updated });
}));

// Bulk room availability update
app.post('/api/admin/rooms/bulk-availability', requireAdminAuth, wrap(async (req, res) => {
  const { status } = req.body || {};
  let targetStatus = 'Available';
  let targetFlag = 1;

  if (typeof status === 'string' && ['Available', 'Occupied', 'Reserved', 'Maintenance'].includes(status)) {
    targetStatus = status;
    targetFlag = status === 'Available' ? 1 : 0;
  } else {
    targetFlag = status ? 1 : 0;
    targetStatus = status ? 'Available' : 'Occupied';
  }

  const now = new Date().toISOString();
  await runQuery('UPDATE rooms SET is_available = $1, status = $2, updated_at = $3', [targetFlag, targetStatus, now]);

  const rooms = await getAll('SELECT * FROM rooms ORDER BY display_order ASC, room_number ASC');
  res.json({ success: true, rooms });
}));

app.delete('/api/admin/rooms/:id', requireAdminAuth, wrap(async (req, res) => {
  const { id } = req.params;
  const totalCount = await getOne<{ count: string | number }>('SELECT COUNT(*)::int AS count FROM rooms');
  if (!totalCount || Number(totalCount.count) <= 1) {
    res.status(400).json({ success: false, message: 'Cannot delete the only remaining room.' });
    return;
  }

  const result = await runQuery('DELETE FROM rooms WHERE id = $1', [id]);
  if (result.rowCount === 0) {
    res.status(404).json({ success: false, message: 'Room not found' });
    return;
  }

  res.json({ success: true, message: 'Room removed successfully.' });
}));

// ------------------------------------------
// ROOM CATALOGUE (Red Rock Hotel — public, filterable, slug-based)
// ------------------------------------------

// Server-side facets power the room filters (distinct published values).
app.get('/api/rooms/facets', wrap(async (_req, res) => {
  const where = `is_published = 1 AND publish_status = 'published'`;
  const categories = await getAll<{ room_type: string }>(
    `SELECT DISTINCT room_type FROM rooms WHERE ${where} AND room_type <> '' ORDER BY room_type ASC`
  );
  const bounds = await getOne<{ min: string | number | null; max: string | number | null }>(
    `SELECT MIN(NULLIF(price_per_night, 0)) AS min, MAX(price_per_night) AS max FROM rooms WHERE ${where}`
  );
  const guests = await getOne<{ mx: string | number | null }>(
    `SELECT MAX(max_guests) AS mx FROM rooms WHERE ${where}`
  );
  res.json({
    success: true,
    categories: categories.map((c) => c.room_type),
    priceBounds: bounds ? { min: Number(bounds.min || 0), max: Number(bounds.max || 0) } : { min: 0, max: 0 },
    maxGuests: Number(guests?.mx || 0),
  });
}));

// Public: single published room detail (accepts slug or legacy room number).
app.get('/api/rooms/:slug', wrap(async (req, res) => {
  const key = String(req.params.slug || '');
  const room = await getOne<any>(
    `SELECT * FROM rooms WHERE (slug = $1 OR room_number = $1) AND is_published = 1 AND publish_status = 'published'`,
    [key]
  );
  if (!room) {
    res.status(404).json({ success: false, message: 'Room not found or not published.' });
    return;
  }
  const images = await getAll<{ id: string; role: string; content_type: string; display_order: number }>(
    `SELECT id, role, content_type, display_order FROM room_images WHERE room_id = $1
     ORDER BY (role = 'cover') DESC, display_order ASC`,
    [room.id]
  );
  res.json({ success: true, room: roomToDto(room), images });
}));

// Admin: one room (any status) plus its Blob image metadata.
app.get('/api/admin/rooms/:id', requireAdminAuth, wrap(async (req, res) => {
  const room = await getOne<any>('SELECT * FROM rooms WHERE id = $1', [req.params.id]);
  if (!room) {
    res.status(404).json({ success: false, message: 'Room not found' });
    return;
  }
  const images = await getAll(
    `SELECT id, room_id, blob_pathname, content_type, size_bytes, role, display_order, created_at
     FROM room_images WHERE room_id = $1 ORDER BY (role = 'cover') DESC, display_order ASC`,
    [room.id]
  );
  res.json({ success: true, room: roomToDto(room), images });
}));

// Admin: upload a room image to the private Blob store and record metadata.
app.post('/api/admin/rooms/:roomId/images', requireAdminAuth, wrap(async (req, res) => {
  const room = await getOne<any>('SELECT id, gallery, image_url FROM rooms WHERE id = $1', [req.params.roomId]);
  if (!room) {
    res.status(404).json({ success: false, message: 'Room not found' });
    return;
  }
  const decoded = decodeImagePayload(req.body?.fileData);
  if (!decoded) {
    res.status(400).json({ success: false, message: 'Invalid image payload. Only base64-encoded images are accepted.' });
    return;
  }

  let upload;
  try {
    upload = await uploadPrivateImage(decoded, 'room');
  } catch (err: any) {
    res.status(err?.status || 502).json({ success: false, message: err?.message || 'Image upload failed.' });
    return;
  }

  const imageId = `rimg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const orderRow = await getOne<{ mx: string | number | null }>('SELECT MAX(display_order) AS mx FROM room_images WHERE room_id = $1', [room.id]);
  const nextOrder = Number(orderRow?.mx || 0) + 1;
  const now = new Date().toISOString();

  try {
    await runQuery(`
      INSERT INTO room_images (id, room_id, blob_url, blob_pathname, content_type, size_bytes, role, display_order, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [imageId, room.id, upload.url, upload.pathname, upload.contentType, upload.size, 'gallery', nextOrder, now]);
  } catch (dbErr) {
    // Roll back storage so a failed insert does not leave an orphan blob.
    await deleteBlobByUrl(upload.url);
    console.error('[RoomImage] DB insert failed:', dbErr);
    res.status(500).json({ success: false, message: 'Failed to record the uploaded image.' });
    return;
  }

  res.json({ success: true, image: { id: imageId, role: 'gallery', content_type: upload.contentType, size_bytes: upload.size, display_order: nextOrder } });
}));

// Admin: reorder gallery images and/or set the primary (cover) image.
app.put('/api/admin/rooms/:roomId/images', requireAdminAuth, wrap(async (req, res) => {
  const room = await getOne<any>('SELECT id, gallery FROM rooms WHERE id = $1', [req.params.roomId]);
  if (!room) {
    res.status(404).json({ success: false, message: 'Room not found' });
    return;
  }
  const ids = Array.isArray(req.body?.ids) ? req.body.ids.map((x: unknown) => String(x)) : null;
  const primaryId = req.body?.primaryId ? String(req.body.primaryId) : undefined;
  if (!ids && !primaryId) {
    res.status(400).json({ success: false, message: 'Provide an ordered list of image ids and/or a primaryId.' });
    return;
  }

  if (ids) {
    for (let i = 0; i < ids.length; i++) {
      await runQuery(`UPDATE room_images SET display_order = $1 WHERE room_id = $2 AND id = $3 AND role <> 'cover'`, [i + 1, room.id, ids[i]]);
    }
  }
  if (primaryId) {
    const target = await getOne<{ id: string }>(`SELECT id FROM room_images WHERE id = $1 AND room_id = $2`, [primaryId, room.id]);
    if (!target) {
      res.status(400).json({ success: false, message: 'Primary image does not belong to this room.' });
      return;
    }
    await runQuery(`UPDATE room_images SET role = 'gallery' WHERE room_id = $1 AND role = 'cover'`, [room.id]);
    await runQuery(`UPDATE room_images SET role = 'cover' WHERE id = $1`, [primaryId]);
    // Keep the legacy single-image column in sync for the sections that used it.
    await runQuery(`UPDATE rooms SET image_url = $1, updated_at = $2 WHERE id = $3`, [`/api/room-image/${primaryId}`, new Date().toISOString(), room.id]);
    await syncRoomGalleryWithPrimary(room, `/api/room-image/${primaryId}`);
  }

  const images = await getAll(
    `SELECT id, role, content_type, size_bytes, display_order FROM room_images WHERE room_id = $1 ORDER BY (role = 'cover') DESC, display_order ASC`,
    [room.id]
  );
  res.json({ success: true, images });
}));

// Admin: delete one room image (blob removed only when no record still references it).
app.delete('/api/admin/room-images/:imageId', requireAdminAuth, wrap(async (req, res) => {
  const image = await getOne<any>('SELECT id, room_id, blob_url FROM room_images WHERE id = $1', [req.params.imageId]);
  if (!image) {
    res.status(404).json({ success: false, message: 'Image not found' });
    return;
  }
  await runQuery('DELETE FROM room_images WHERE id = $1', [image.id]);
  const remaining = await getOne<{ count: string | number }>('SELECT COUNT(*)::int AS count FROM room_images WHERE blob_url = $1', [image.blob_url]);
  if (Number(remaining?.count || 0) === 0) {
    await deleteBlobByUrl(image.blob_url);
  }
  res.json({ success: true, message: 'Image removed.' });
}));

// Authorization-aware private room image delivery.
// Images of published rooms are public; anything else requires an admin session.
// Bundled catalogue thumbnails (/images/rooms/*) are repo assets and always public.
app.get('/api/room-image/:imageId', wrap(async (req, res) => {
  const image = await getOne<any>(
    `SELECT ri.blob_url, ri.blob_pathname, ri.content_type, ri.room_id, r.publish_status, r.is_published
     FROM room_images ri LEFT JOIN rooms r ON r.id = ri.room_id
     WHERE ri.id = $1`,
    [req.params.imageId]
  );
  if (!image) {
    res.status(404).setHeader('Cache-Control', 'no-store').json({ success: false, message: 'Image not found' });
    return;
  }

  const isBundled = !image.room_id && String(image.blob_pathname || '').startsWith('/images/rooms/');
  let isPublic = isBundled || (image.publish_status === 'published' && Number(image.is_published) === 1);
  // Walkthrough images are stored without a room. They become public only once
  // a published walkthrough actually references them; otherwise admin-only.
  if (!isPublic && !image.room_id) {
    const used = await getOne<{ x: number }>(
      `SELECT 1 AS x FROM walkthrough_sections ws
       JOIN walkthroughs w ON w.id = ws.walkthrough_id
       WHERE ws.image_ref = $1 AND w.status = 'published' LIMIT 1`,
      [`/api/room-image/${req.params.imageId}`]
    );
    if (used) isPublic = true;
  }
  if (!isPublic) {
    const token = extractToken(req);
    const session = token ? await validateSession(token) : { valid: false };
    if (!session.valid) {
      res.status(403).setHeader('Cache-Control', 'no-store').json({ success: false, message: 'Not authorized to view this image.' });
      return;
    }
  }

  if (isBundled) {
    // Local repo asset: stream straight from the bundled images folder.
    const rel = String(image.blob_pathname).replace('/images/rooms/', '');
    const filePath = path.join(imagesRoot, 'rooms', path.basename(rel));
    if (!fs.existsSync(filePath)) {
      res.status(404).setHeader('Cache-Control', 'no-store').json({ success: false, message: 'Bundled image missing.' });
      return;
    }
    res.setHeader('Content-Type', image.content_type || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    fs.createReadStream(filePath).pipe(res);
    return;
  }

  await streamPrivateBlob(res, image.blob_url, image.content_type, isPublic);
}));

// Safe room-catalogue setup: creates the 20 rooms backed by the bundled
// Luxury_Hotel_Room_Thumbnails assets. Insert-only and ON CONFLICT DO NOTHING:
// existing rooms (records, prices, availability) are never modified.
app.post('/api/admin/rooms/setup-catalog', requireAdminAuth, wrap(async (req, res) => {
  const total = await getOne<{ count: string | number }>('SELECT COUNT(*)::int AS count FROM rooms');
  if (Number(total?.count || 0) > 0) {
    res.json({ success: true, created: 0, skipped: Number(total?.count || 0), message: 'Rooms already exist — nothing was inserted.' });
    return;
  }
  const now = new Date().toISOString();
  let created = 0;
  for (let i = 1; i <= 20; i++) {
    const num = String(i).padStart(2, '0');
    const id = `room-catalog-${num}`;
    const result = await runQuery(`
      INSERT INTO rooms (id, room_number, slug, title, room_type, description, short_description, image_url, gallery,
        is_available, status, display_order, is_published, publish_status, price_per_night, currency, max_guests,
        bed_type, room_size, amenities, created_at, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,0,'Maintenance',$10,0,'draft',0,'PKR',0,'','','[]',$11,$11)
      ON CONFLICT DO NOTHING
    `, [
      id, `Room ${num}`, `room-${num}`,
      `Room ${num}`, '',
      'Details for this room have not been configured yet. The administrator can complete the category, price, capacity and description before publishing.',
      '', `/images/rooms/hotel_room_${num}.jpg`, JSON.stringify([`/images/rooms/hotel_room_${num}.jpg`]),
      i, now,
    ]);
    created += result.rowCount;
  }
  res.json({ success: true, created, message: created ? `Created ${created} draft rooms from the bundled thumbnails.` : 'Nothing inserted.' });
}));

// Associate a bundled thumbnail with an existing room WITHOUT touching prices,
// availability or publication. Only ever fills a still-placeholder image.
app.post('/api/admin/rooms/:roomId/attach-bundled-image', requireAdminAuth, wrap(async (req, res) => {
  const num = String(req.body?.imageNum || '').padStart(2, '0');
  if (!/^\d{2}$/.test(num)) {
    res.status(400).json({ success: false, message: 'imageNum must be between 01 and 20.' });
    return;
  }
  const room = await getOne<any>('SELECT id, image_url, gallery FROM rooms WHERE id = $1', [req.params.roomId]);
  if (!room) {
    res.status(404).json({ success: false, message: 'Room not found' });
    return;
  }
  const filePath = path.join(imagesRoot, 'rooms', `hotel_room_${num}.jpg`);
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ success: false, message: `Bundled thumbnail hotel_room_${num}.jpg is missing.` });
    return;
  }
  const nextImage = `/images/rooms/hotel_room_${num}.jpg`;
  const wasPlaceholder = !room.image_url || room.image_url === '/images/room_suite_king.jpg';
  if (wasPlaceholder) {
    await runQuery('UPDATE rooms SET image_url = $1, updated_at = $2 WHERE id = $3', [nextImage, new Date().toISOString(), room.id]);
  }
  await syncRoomGalleryWithPrimary(room, nextImage);
  const updated = await getOne('SELECT * FROM rooms WHERE id = $1', [room.id]);
  res.json({ success: true, room: roomToDto(updated), image: nextImage });
}));

// ------------------------------------------
// ADMIN DYNAMIC GALLERY MANAGEMENT
// ------------------------------------------

app.get('/api/admin/gallery', requireAdminAuth, wrap(async (_req, res) => {
  const items = await getAll('SELECT * FROM gallery_items ORDER BY display_order ASC');
  res.json({ success: true, items });
}));

app.post('/api/admin/gallery', requireAdminAuth, wrap(async (req, res) => {
  const { category, title, room_number, description, image_url, display_order, is_published } = req.body || {};
  if (!title || !image_url) {
    res.status(400).json({ success: false, message: 'Title and Image URL are required' });
    return;
  }

  const id = `gal-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const cleanCat = category || 'rooms';
  const cleanTitle = String(title).trim();
  const cleanRoomNum = room_number ? String(room_number).trim() : null;
  const cleanDesc = description ? String(description).trim() : '';
  const cleanImage = String(image_url).trim();
  const cleanOrder = display_order ? Number(display_order) : 99;
  const cleanPublished = is_published !== false && is_published !== 0 ? 1 : 0;
  const now = new Date().toISOString();

  await runQuery(`
    INSERT INTO gallery_items (id, category, title, room_number, description, image_url, display_order, is_published, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
  `, [id, cleanCat, cleanTitle, cleanRoomNum, cleanDesc, cleanImage, cleanOrder, cleanPublished, now, now]);

  const created = await getOne('SELECT * FROM gallery_items WHERE id = $1', [id]);
  res.json({ success: true, item: created });
}));

app.put('/api/admin/gallery/:id', requireAdminAuth, wrap(async (req, res) => {
  const { id } = req.params;
  const existing = await getOne<any>('SELECT * FROM gallery_items WHERE id = $1', [id]);
  if (!existing) {
    res.status(404).json({ success: false, message: 'Gallery item not found' });
    return;
  }

  const { category, title, room_number, description, image_url, display_order, is_published } = req.body || {};
  const cleanCat = category !== undefined ? String(category).trim() : existing.category;
  const cleanTitle = title !== undefined ? String(title).trim() : existing.title;
  const cleanRoomNum = room_number !== undefined ? (room_number ? String(room_number).trim() : null) : existing.room_number;
  const cleanDesc = description !== undefined ? String(description).trim() : existing.description;
  const cleanImage = image_url !== undefined ? String(image_url).trim() : existing.image_url;
  const cleanOrder = display_order !== undefined ? Number(display_order) : existing.display_order;
  const cleanPublished = is_published !== undefined ? (is_published ? 1 : 0) : existing.is_published;
  const now = new Date().toISOString();

  await runQuery(`
    UPDATE gallery_items
    SET category = $1, title = $2, room_number = $3, description = $4, image_url = $5, display_order = $6, is_published = $7, updated_at = $8
    WHERE id = $9
  `, [cleanCat, cleanTitle, cleanRoomNum, cleanDesc, cleanImage, cleanOrder, cleanPublished, now, id]);

  const updated = await getOne('SELECT * FROM gallery_items WHERE id = $1', [id]);
  res.json({ success: true, item: updated });
}));

app.delete('/api/admin/gallery/:id', requireAdminAuth, wrap(async (req, res) => {
  const { id } = req.params;
  const result = await runQuery('DELETE FROM gallery_items WHERE id = $1', [id]);
  if (result.rowCount === 0) {
    res.status(404).json({ success: false, message: 'Gallery item not found' });
    return;
  }
  res.json({ success: true, message: 'Gallery item removed successfully.' });
}));

// ------------------------------------------
// ADMIN FOOD MANAGEMENT (NO PRICING FIELD!)
// ------------------------------------------

app.get('/api/admin/food', requireAdminAuth, wrap(async (_req, res) => {
  const food = await getAll(`
    SELECT id, name, thumbnail, available_from, available_until, is_available, created_at, updated_at
    FROM food
    ORDER BY created_at DESC
  `);
  res.json({ success: true, food });
}));

app.post('/api/admin/food', requireAdminAuth, wrap(async (req, res) => {
  const { name, thumbnail, available_from, available_until, is_available } = req.body || {};

  if (!name || !String(name).trim()) {
    res.status(400).json({ success: false, message: 'Food item name is required.' });
    return;
  }

  const id = `food-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();
  const cleanName = String(name).trim();
  const cleanThumb = thumbnail || '/uploads/img_1791024997069_val5a6.jpeg';
  const cleanFrom = available_from || '12:00 PM';
  const cleanUntil = available_until || '10:00 PM';
  const availableFlag = is_available === false || is_available === 0 ? 0 : 1;

  await runQuery(`
    INSERT INTO food (id, name, thumbnail, available_from, available_until, is_available, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
  `, [id, cleanName, cleanThumb, cleanFrom, cleanUntil, availableFlag, now, now]);

  const created = await getOne('SELECT * FROM food WHERE id = $1', [id]);
  res.json({ success: true, food: created });
}));

app.put('/api/admin/food/:id', requireAdminAuth, wrap(async (req, res) => {
  const { id } = req.params;
  const existing = await getOne<any>('SELECT * FROM food WHERE id = $1', [id]);
  if (!existing) {
    res.status(404).json({ success: false, message: 'Food item not found.' });
    return;
  }

  const { name, thumbnail, available_from, available_until, is_available } = req.body || {};
  const now = new Date().toISOString();

  const cleanName = name !== undefined ? String(name).trim() : existing.name;
  const cleanThumb = thumbnail !== undefined ? thumbnail : existing.thumbnail;
  const cleanFrom = available_from !== undefined ? available_from : existing.available_from;
  const cleanUntil = available_until !== undefined ? available_until : existing.available_until;
  const availableFlag = is_available !== undefined ? (is_available ? 1 : 0) : existing.is_available;

  await runQuery(`
    UPDATE food
    SET name = $1, thumbnail = $2, available_from = $3, available_until = $4, is_available = $5, updated_at = $6
    WHERE id = $7
  `, [cleanName, cleanThumb, cleanFrom, cleanUntil, availableFlag, now, id]);

  const updated = await getOne('SELECT * FROM food WHERE id = $1', [id]);
  res.json({ success: true, food: updated });
}));

app.delete('/api/admin/food/:id', requireAdminAuth, wrap(async (req, res) => {
  const { id } = req.params;
  const result = await runQuery('DELETE FROM food WHERE id = $1', [id]);
  if (result.rowCount === 0) {
    res.status(404).json({ success: false, message: 'Food item not found.' });
    return;
  }
  res.json({ success: true, message: 'Food item removed successfully.' });
}));

// ------------------------------------------
// ADMIN IMAGE UPLOAD (stored in Neon, not on disk)
// ------------------------------------------

app.post('/api/admin/upload', requireAdminAuth, wrap(async (req, res) => {
  const { fileName, fileData } = req.body || {};
  if (!fileData) {
    res.status(400).json({ success: false, message: 'No file data received' });
    return;
  }

  // Validate Base64 payload
  const matches = String(fileData).match(/^data:image\/([A-Za-z-+]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    res.status(400).json({ success: false, message: 'Invalid image payload format. Only images are permitted.' });
    return;
  }

  const mimeSubType = matches[1].toLowerCase();
  const allowedExtensions = ['jpeg', 'jpg', 'png', 'webp', 'gif'];
  const ext = mimeSubType === 'jpeg' ? '.jpg' : `.${mimeSubType}`;

  if (!allowedExtensions.includes(mimeSubType)) {
    res.status(400).json({ success: false, message: 'Unsupported image format. Allowed: JPG, PNG, WEBP.' });
    return;
  }

  const buffer = Buffer.from(matches[2], 'base64');
  // 10MB limit
  if (buffer.length > 10 * 1024 * 1024) {
    res.status(400).json({ success: false, message: 'File size exceeds maximum 10MB limit.' });
    return;
  }

  const safeName = `food_${Date.now()}_${crypto.randomBytes(4).toString('hex')}${ext}`;
  const mimeType = mimeSubType === 'jpg' ? 'image/jpeg' : `image/${mimeSubType}`;
  await saveUploadedFile(safeName, mimeType, buffer);

  // Best-effort local mirror for offline browsing during development. Never required.
  try {
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
    fs.writeFileSync(path.join(uploadsDir, safeName), buffer);
  } catch {
    /* ignore — the file is safely stored in Neon */
  }

  res.json({ success: true, url: `/uploads/${safeName}`, fileName: safeName });
}));

// Serve uploaded images from Neon (works on Vercel where the disk is read-only).
// Registered after the static middleware so locally present files resolve first.
app.get('/uploads/:name', wrap(async (req, res) => {
  const name = path.basename(req.params.name); // prevent path traversal
  const file = await getUploadedFile(name);
  if (!file) {
    res.status(404).json({ success: false, message: 'File not found' });
    return;
  }
  const buffer = Buffer.from((file.data as Uint8Array).slice());
  res.setHeader('Content-Type', file.mime_type);
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  res.send(buffer);
}));

// ------------------------------------------
// ADMIN SETTINGS (WhatsApp Number)
// ------------------------------------------

app.get('/api/admin/settings', requireAdminAuth, wrap(async (_req, res) => {
  const settings = await getOne(`SELECT id, whatsapp_number, updated_at FROM settings WHERE id = $1`, ['general']);
  res.json({ success: true, settings });
}));

app.put('/api/admin/settings', requireAdminAuth, wrap(async (req, res) => {
  const { whatsapp_number } = req.body || {};
  const cleanNumber = String(whatsapp_number || '').trim();
  const now = new Date().toISOString();

  const updated = await getOne(
    `UPDATE settings SET whatsapp_number = $1, updated_at = $2 WHERE id = 'general' RETURNING *`,
    [cleanNumber, now]
  );
  res.json({ success: true, settings: updated });
}));

// ------------------------------------------
// HOTEL LISTINGS (public directory + admin management + private images)
// ------------------------------------------

function slugify(input: string): string {
  return String(input || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

async function ensureUniqueSlug(base: string, excludeId?: string): Promise<string> {
  const root = base || 'hotel';
  let candidate = root;
  let n = 1;
  // Loop bounded: try root, then root-2, root-3, ...
  while (n < 200) {
    const q = excludeId
      ? `SELECT id FROM hotels WHERE slug = $1 AND id <> $2`
      : `SELECT id FROM hotels WHERE slug = $1`;
    const existing = await getOne<{ id: string }>(q, excludeId ? [candidate, excludeId] : [candidate]);
    if (!existing) return candidate;
    n += 1;
    candidate = `${root}-${n}`;
  }
  return `${root}-${Date.now()}`;
}

function parseMoney(value: unknown, { allowNegative = false, optional = false } = {}): number | null {
  if (value === undefined || value === null || value === '') return optional ? null : NaN;
  const num = typeof value === 'number' ? value : Number(String(value).trim());
  if (!Number.isFinite(num)) return NaN;
  if (!allowNegative && num < 0) return NaN;
  return num;
}

function normalizeFacilities(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  for (const raw of input) {
    const v = String(raw).trim();
    if (v) seen.add(v);
  }
  return Array.from(seen).slice(0, 60);
}

function hotelRowToDto(row: any): any {
  if (!row) return row;
  let facilities: string[] = [];
  try { facilities = typeof row.facilities === 'string' ? JSON.parse(row.facilities) : (row.facilities || []); } catch { facilities = []; }
  return {
    ...row,
    star_rating: Number(row.star_rating || 0),
    price_per_night: Number(row.price_per_night || 0),
    discount_price: row.discount_price === null || row.discount_price === undefined ? null : Number(row.discount_price),
    latitude: row.latitude === null || row.latitude === undefined ? null : Number(row.latitude),
    longitude: row.longitude === null || row.longitude === undefined ? null : Number(row.longitude),
    facilities,
  };
}

const COVER_SUBQUERY =
  `(SELECT hi.id FROM hotel_images hi WHERE hi.hotel_id = h.id ORDER BY (hi.role = 'cover') DESC, hi.display_order ASC LIMIT 1) AS cover_image_id`;

// Public facets to power the filter UI (server-side distinct values).
app.get('/api/hotels/facets', wrap(async (_req, res) => {
  const cities = await getAll<{ city: string }>(
    `SELECT DISTINCT city FROM hotels WHERE status = 'published' AND city <> '' ORDER BY city ASC`
  );
  const categories = await getAll<{ category: string }>(
    `SELECT DISTINCT category FROM hotels WHERE status = 'published' AND category <> '' ORDER BY category ASC`
  );
  const bounds = await getOne<{ min: string | number | null; max: string | number | null }>(
    `SELECT MIN(price_per_night) AS min, MAX(price_per_night) AS max FROM hotels WHERE status = 'published'`
  );
  res.json({
    success: true,
    cities: cities.map((c) => c.city),
    categories: categories.map((c) => c.category),
    priceBounds: bounds ? { min: Number(bounds.min || 0), max: Number(bounds.max || 0) } : { min: 0, max: 0 },
  });
}));

// Public: paginated, filtered list of published hotels.
app.get('/api/hotels', wrap(async (req, res) => {
  const {
    q, city, minPrice, maxPrice, category, facility,
    sort = 'newest', page = '1', pageSize = '12',
  } = req.query as Record<string, string>;

  const where: string[] = [`h.status = 'published'`];
  const params: unknown[] = [];
  const addParam = (v: unknown) => { params.push(v); return `$${params.length}`; };

  if (q && q.trim()) {
    const like = addParam(`%${q.trim()}%`);
    where.push(`(h.name ILIKE ${like} OR h.city ILIKE ${like} OR h.area ILIKE ${like})`);
  }
  if (city && city.trim()) where.push(`h.city = ${addParam(city.trim())}`);
  if (category && category.trim()) where.push(`h.category = ${addParam(category.trim())}`);
  if (minPrice && Number.isFinite(Number(minPrice))) where.push(`h.price_per_night >= ${addParam(Number(minPrice))}`);
  if (maxPrice && Number.isFinite(Number(maxPrice))) where.push(`h.price_per_night <= ${addParam(Number(maxPrice))}`);
  if (facility && facility.trim()) where.push(`h.facilities ILIKE ${addParam(`%"${facility.trim()}"%`)}`);

  const whereSql = where.join(' AND ');

  const orderMap: Record<string, string> = {
    price_asc: 'h.price_per_night ASC',
    price_desc: 'h.price_per_night DESC',
    name_asc: 'h.name ASC',
    newest: 'h.created_at DESC',
  };
  const orderSql = orderMap[sort] || orderMap.newest;

  const size = Math.min(Math.max(parseInt(pageSize, 10) || 12, 1), 24);
  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const offset = (pageNum - 1) * size;

  const countRow = await getOne<{ count: string | number }>(
    `SELECT COUNT(*)::int AS count FROM hotels h WHERE ${whereSql}`,
    [...params]
  );
  const total = Number(countRow?.count || 0);

  const rows = await getAll(
    `SELECT h.*, ${COVER_SUBQUERY} FROM hotels h WHERE ${whereSql} ORDER BY ${orderSql} LIMIT ${size} OFFSET ${offset}`,
    [...params]
  );

  res.json({
    success: true,
    hotels: rows.map(hotelRowToDto),
    pagination: { page: pageNum, pageSize: size, total, totalPages: Math.max(Math.ceil(total / size), 1) },
  });
}));

// Public: single published hotel detail (with images).
app.get('/api/hotels/:slug', wrap(async (req, res) => {
  const hotel = await getOne<any>(
    `SELECT h.*, ${COVER_SUBQUERY} FROM hotels h WHERE h.slug = $1 AND h.status = 'published'`,
    [req.params.slug]
  );
  if (!hotel) {
    res.status(404).json({ success: false, message: 'Hotel not found or not published.' });
    return;
  }
  const images = await getAll<{ id: string; role: string; content_type: string; display_order: number }>(
    `SELECT id, role, content_type, display_order FROM hotel_images
     WHERE hotel_id = $1 ORDER BY (role = 'cover') DESC, display_order ASC`,
    [hotel.id]
  );
  res.json({ success: true, hotel: hotelRowToDto(hotel), images });
}));

// Public: related published hotels (same city or category), excluding current.
app.get('/api/hotels/:slug/related', wrap(async (req, res) => {
  const current = await getOne<any>(
    `SELECT id, city, category FROM hotels WHERE slug = $1 AND status = 'published'`,
    [req.params.slug]
  );
  if (!current) {
    res.status(404).json({ success: false, message: 'Hotel not found or not published.' });
    return;
  }
  const rows = await getAll(
    `SELECT h.*, ${COVER_SUBQUERY} FROM hotels h
     WHERE h.status = 'published' AND h.id <> $1
       AND (h.city = $2 OR h.category = $3)
     ORDER BY (h.city = $2) DESC, h.created_at DESC
     LIMIT 3`,
    [current.id, current.city, current.category]
  );
  res.json({ success: true, hotels: rows.map(hotelRowToDto) });
}));

// Admin: list all hotels (any status) with filters, sort and pagination.
app.get('/api/admin/hotels', requireAdminAuth, wrap(async (req, res) => {
  const { q, status, city, sort = 'newest', page = '1', pageSize = '20' } = req.query as Record<string, string>;
  const where: string[] = [];
  const params: unknown[] = [];
  const addParam = (v: unknown) => { params.push(v); return `$${params.length}`; };

  if (q && q.trim()) {
    const like = addParam(`%${q.trim()}%`);
    where.push(`(h.name ILIKE ${like} OR h.city ILIKE ${like} OR h.slug ILIKE ${like})`);
  }
  if (status && ['draft', 'published', 'archived'].includes(status)) where.push(`h.status = ${addParam(status)}`);
  if (city && city.trim()) where.push(`h.city = ${addParam(city.trim())}`);

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const orderMap: Record<string, string> = {
    name_asc: 'h.name ASC', price_asc: 'h.price_per_night ASC',
    updated: 'h.updated_at DESC', newest: 'h.created_at DESC',
  };
  const orderSql = orderMap[sort] || orderMap.newest;

  const size = Math.min(Math.max(parseInt(pageSize, 10) || 20, 1), 100);
  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const offset = (pageNum - 1) * size;

  const countRow = await getOne<{ count: string | number }>(
    `SELECT COUNT(*)::int AS count FROM hotels h ${whereSql}`, [...params]
  );
  const total = Number(countRow?.count || 0);
  const rows = await getAll(
    `SELECT h.*, ${COVER_SUBQUERY},
       (SELECT COUNT(*)::int FROM hotel_images hi WHERE hi.hotel_id = h.id) AS image_count
     FROM hotels h ${whereSql} ORDER BY ${orderSql} LIMIT ${size} OFFSET ${offset}`,
    [...params]
  );
  res.json({
    success: true,
    hotels: rows.map(hotelRowToDto),
    pagination: { page: pageNum, pageSize: size, total, totalPages: Math.max(Math.ceil(total / size), 1) },
  });
}));

// Admin: single hotel (any status) + its images.
app.get('/api/admin/hotels/:id', requireAdminAuth, wrap(async (req, res) => {
  const hotel = await getOne<any>(`SELECT * FROM hotels WHERE id = $1`, [req.params.id]);
  if (!hotel) {
    res.status(404).json({ success: false, message: 'Hotel not found' });
    return;
  }
  const images = await getAll(
    `SELECT id, role, content_type, size_bytes, display_order, blob_pathname, created_at
     FROM hotel_images WHERE hotel_id = $1 ORDER BY (role = 'cover') DESC, display_order ASC`,
    [hotel.id]
  );
  res.json({ success: true, hotel: hotelRowToDto(hotel), images });
}));

// A listing is publishable only when required fields + a cover image exist.
async function canPublish(hotel: any): Promise<{ ok: boolean; reason?: string }> {
  if (!hotel.name || !String(hotel.name).trim()) return { ok: false, reason: 'Hotel name is required.' };
  if (!hotel.city || !String(hotel.city).trim()) return { ok: false, reason: 'City is required.' };
  if (!hotel.country || !String(hotel.country).trim()) return { ok: false, reason: 'Country is required.' };
  if (hotel.price_per_night === null || hotel.price_per_night === undefined) return { ok: false, reason: 'A starting nightly price is required.' };
  const cover = await getOne<{ id: string }>(`SELECT id FROM hotel_images WHERE hotel_id = $1 AND role = 'cover' LIMIT 1`, [hotel.id]);
  if (!cover) return { ok: false, reason: 'A primary cover image is required before publishing.' };
  return { ok: true };
}

// Admin: create a hotel listing.
app.post('/api/admin/hotels', requireAdminAuth, wrap(async (req, res) => {
  const b = req.body || {};
  const name = String(b.name || '').trim();
  if (!name) {
    res.status(400).json({ success: false, message: 'Hotel name is required.' });
    return;
  }
  const price = parseMoney(b.pricePerNight, {});
  if (Number.isNaN(price)) {
    res.status(400).json({ success: false, message: 'A valid, non-negative starting price per night is required.' });
    return;
  }
  const discount = parseMoney(b.discountPrice, { optional: true });
  if (discount === undefined || Number.isNaN(discount)) {
    res.status(400).json({ success: false, message: 'Discount price must be a valid non-negative number (or empty).' });
    return;
  }
  let lat: number | null = null;
  let lng: number | null = null;
  if (b.latitude !== undefined && b.latitude !== null && String(b.latitude).trim() !== '') {
    lat = Number(b.latitude);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) { res.status(400).json({ success: false, message: 'Latitude must be between -90 and 90.' }); return; }
  }
  if (b.longitude !== undefined && b.longitude !== null && String(b.longitude).trim() !== '') {
    lng = Number(b.longitude);
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) { res.status(400).json({ success: false, message: 'Longitude must be between -180 and 180.' }); return; }
  }

  const currency = String(b.currency || 'PKR').trim().toUpperCase().slice(0, 3) || 'PKR';
  const starRating = Math.min(Math.max(parseInt(b.starRating, 10) || 0, 0), 5);
  const slug = await ensureUniqueSlug(slugify(name));
  const id = `hotel-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  await runQuery(`
    INSERT INTO hotels (id, name, slug, short_description, description, category, star_rating,
      country, city, area, address, latitude, longitude, price_per_night, currency, discount_price,
      facilities, contact_phone, contact_email, website, status, created_at, updated_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)
  `, [
    id, name, slug,
    String(b.shortDescription || '').trim(),
    String(b.description || '').trim(),
    String(b.category || '').trim(),
    starRating,
    String(b.country || '').trim(),
    String(b.city || '').trim(),
    String(b.area || '').trim(),
    String(b.address || '').trim(),
    lat, lng, price, currency, discount,
    JSON.stringify(normalizeFacilities(b.facilities)),
    String(b.contactPhone || '').trim(),
    String(b.contactEmail || '').trim(),
    String(b.website || '').trim(),
    'draft', // new listings always start as draft; publishing requires a cover image (see publish route)
    now, now,
  ]);

  const created = await getOne<any>(`SELECT * FROM hotels WHERE id = $1`, [id]);
  res.json({ success: true, hotel: hotelRowToDto(created) });
}));

// Admin: update a hotel listing (partial).
app.put('/api/admin/hotels/:id', requireAdminAuth, wrap(async (req, res) => {
  const existing = await getOne<any>(`SELECT * FROM hotels WHERE id = $1`, [req.params.id]);
  if (!existing) {
    res.status(404).json({ success: false, message: 'Hotel not found' });
    return;
  }
  const b = req.body || {};

  const name = b.name !== undefined ? String(b.name).trim() : existing.name;
  if (!name) { res.status(400).json({ success: false, message: 'Hotel name is required.' }); return; }

  const price = b.pricePerNight !== undefined ? parseMoney(b.pricePerNight, {}) : Number(existing.price_per_night);
  if (Number.isNaN(price)) { res.status(400).json({ success: false, message: 'Price per night must be a valid non-negative number.' }); return; }

  const discount = b.discountPrice !== undefined ? parseMoney(b.discountPrice, { optional: true })
    : (existing.discount_price === null ? null : Number(existing.discount_price));
  if (discount === undefined || Number.isNaN(discount)) { res.status(400).json({ success: false, message: 'Discount price must be a valid non-negative number (or empty).' }); return; }

  let lat = existing.latitude === null ? null : Number(existing.latitude);
  let lng = existing.longitude === null ? null : Number(existing.longitude);
  if (b.latitude !== undefined) {
    if (b.latitude === null || String(b.latitude).trim() === '') lat = null;
    else { lat = Number(b.latitude); if (!Number.isFinite(lat) || lat < -90 || lat > 90) { res.status(400).json({ success: false, message: 'Latitude must be between -90 and 90.' }); return; } }
  }
  if (b.longitude !== undefined) {
    if (b.longitude === null || String(b.longitude).trim() === '') lng = null;
    else { lng = Number(b.longitude); if (!Number.isFinite(lng) || lng < -180 || lng > 180) { res.status(400).json({ success: false, message: 'Longitude must be between -180 and 180.' }); return; } }
  }

  // Re-generate slug only when the name changed and no explicit slug was sent.
  let slug = existing.slug;
  if (b.slug !== undefined && String(b.slug).trim()) {
    slug = await ensureUniqueSlug(slugify(b.slug), existing.id);
  } else if (name !== existing.name) {
    slug = await ensureUniqueSlug(slugify(name), existing.id);
  }

  const currency = b.currency !== undefined ? (String(b.currency).trim().toUpperCase().slice(0, 3) || existing.currency) : existing.currency;
  const starRating = b.starRating !== undefined ? Math.min(Math.max(parseInt(b.starRating, 10) || 0, 0), 5) : Number(existing.star_rating);
  const facilities = b.facilities !== undefined ? JSON.stringify(normalizeFacilities(b.facilities)) : existing.facilities;
  const now = new Date().toISOString();

  await runQuery(`
    UPDATE hotels SET name=$1, slug=$2, short_description=$3, description=$4, category=$5, star_rating=$6,
      country=$7, city=$8, area=$9, address=$10, latitude=$11, longitude=$12, price_per_night=$13, currency=$14,
      discount_price=$15, facilities=$16, contact_phone=$17, contact_email=$18, website=$19, updated_at=$20
    WHERE id=$21
  `, [
    name, slug,
    b.shortDescription !== undefined ? String(b.shortDescription).trim() : existing.short_description,
    b.description !== undefined ? String(b.description).trim() : existing.description,
    b.category !== undefined ? String(b.category).trim() : existing.category,
    starRating,
    b.country !== undefined ? String(b.country).trim() : existing.country,
    b.city !== undefined ? String(b.city).trim() : existing.city,
    b.area !== undefined ? String(b.area).trim() : existing.area,
    b.address !== undefined ? String(b.address).trim() : existing.address,
    lat, lng, price, currency, discount, facilities,
    b.contactPhone !== undefined ? String(b.contactPhone).trim() : existing.contact_phone,
    b.contactEmail !== undefined ? String(b.contactEmail).trim() : existing.contact_email,
    b.website !== undefined ? String(b.website).trim() : existing.website,
    now, existing.id,
  ]);

  const updated = await getOne<any>(`SELECT * FROM hotels WHERE id = $1`, [existing.id]);
  res.json({ success: true, hotel: hotelRowToDto(updated) });
}));

// Admin: publish / unpublish / archive.
app.post('/api/admin/hotels/:id/publish', requireAdminAuth, wrap(async (req, res) => {
  const hotel = await getOne<any>(`SELECT * FROM hotels WHERE id = $1`, [req.params.id]);
  if (!hotel) { res.status(404).json({ success: false, message: 'Hotel not found' }); return; }
  const check = await canPublish(hotel);
  if (!check.ok) { res.status(400).json({ success: false, message: check.reason }); return; }
  await runQuery(`UPDATE hotels SET status = 'published', updated_at = $1 WHERE id = $2`, [new Date().toISOString(), hotel.id]);
  const updated = await getOne<any>(`SELECT * FROM hotels WHERE id = $1`, [hotel.id]);
  res.json({ success: true, hotel: hotelRowToDto(updated) });
}));

app.post('/api/admin/hotels/:id/unpublish', requireAdminAuth, wrap(async (req, res) => {
  const hotel = await getOne<any>(`SELECT id FROM hotels WHERE id = $1`, [req.params.id]);
  if (!hotel) { res.status(404).json({ success: false, message: 'Hotel not found' }); return; }
  await runQuery(`UPDATE hotels SET status = 'draft', updated_at = $1 WHERE id = $2`, [new Date().toISOString(), hotel.id]);
  const updated = await getOne<any>(`SELECT * FROM hotels WHERE id = $1`, [hotel.id]);
  res.json({ success: true, hotel: hotelRowToDto(updated) });
}));

app.post('/api/admin/hotels/:id/archive', requireAdminAuth, wrap(async (req, res) => {
  const hotel = await getOne<any>(`SELECT id FROM hotels WHERE id = $1`, [req.params.id]);
  if (!hotel) { res.status(404).json({ success: false, message: 'Hotel not found' }); return; }
  await runQuery(`UPDATE hotels SET status = 'archived', updated_at = $1 WHERE id = $2`, [new Date().toISOString(), hotel.id]);
  const updated = await getOne<any>(`SELECT * FROM hotels WHERE id = $1`, [hotel.id]);
  res.json({ success: true, hotel: hotelRowToDto(updated) });
}));

// Admin: delete a hotel and clean up only images not shared with other listings.
app.delete('/api/admin/hotels/:id', requireAdminAuth, wrap(async (req, res) => {
  const hotel = await getOne<any>(`SELECT id FROM hotels WHERE id = $1`, [req.params.id]);
  if (!hotel) { res.status(404).json({ success: false, message: 'Hotel not found' }); return; }

  // Blobs referenced ONLY by this listing (safe to delete from storage).
  const exclusive = await getAll<{ blob_url: string }>(
    `SELECT blob_url FROM hotel_images WHERE hotel_id = $1
     GROUP BY blob_url
     HAVING COUNT(DISTINCT hotel_id) = 1`,
    [hotel.id]
  );

  // Cascade removes the hotel_images rows for this listing.
  await runQuery(`DELETE FROM hotels WHERE id = $1`, [hotel.id]);

  // Best-effort storage cleanup for exclusively-owned blobs.
  for (const row of exclusive) {
    await deleteBlobByUrl(row.blob_url);
  }

  res.json({ success: true, message: 'Hotel listing deleted.', cleanedImages: exclusive.length });
}));

// Admin: upload a hotel image to private Blob + record metadata.
app.post('/api/admin/hotels/:hotelId/images', requireAdminAuth, wrap(async (req, res) => {
  const hotel = await getOne<any>(`SELECT id, status FROM hotels WHERE id = $1`, [req.params.hotelId]);
  if (!hotel) { res.status(404).json({ success: false, message: 'Hotel not found' }); return; }

  const { fileData, role } = req.body || {};
  if (!fileData) { res.status(400).json({ success: false, message: 'No file data received' }); return; }
  const matches = String(fileData).match(/^data:image\/([A-Za-z-+]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    res.status(400).json({ success: false, message: 'Invalid image payload. Only base64-encoded images are accepted.' });
    return;
  }
  const buffer = Buffer.from(matches[2], 'base64');

  const requestedRole = role === 'cover' ? 'cover' : undefined;
  let upload;
  try {
    upload = await uploadHotelImage(buffer, `image/${matches[1]}`);
  } catch (err: any) {
    res.status(err?.status || 502).json({ success: false, message: err?.message || 'Image upload failed.' });
    return;
  }

  // Decide role: explicit cover, else first image becomes cover, else gallery.
  const existingCount = await getOne<{ count: string | number }>(`SELECT COUNT(*)::int AS count FROM hotel_images WHERE hotel_id = $1`, [hotel.id]);
  let finalRole = requestedRole || 'gallery';
  if (!requestedRole && Number(existingCount?.count || 0) === 0) finalRole = 'cover';

  // Only one cover at a time: demote any current cover to gallery.
  if (finalRole === 'cover') {
    await runQuery(`UPDATE hotel_images SET role = 'gallery' WHERE hotel_id = $1 AND role = 'cover'`, [hotel.id]);
  }

  const orderRow = await getOne<{ mx: string | number | null }>(`SELECT MAX(display_order) AS mx FROM hotel_images WHERE hotel_id = $1`, [hotel.id]);
  const nextOrder = Number(orderRow?.mx || 0) + 1;
  const imageId = `himg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  try {
    await runQuery(`
      INSERT INTO hotel_images (id, hotel_id, blob_url, blob_pathname, content_type, size_bytes, role, display_order, created_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    `, [imageId, hotel.id, upload.url, upload.pathname, upload.contentType, upload.size, finalRole, nextOrder, now]);
  } catch (dbErr) {
    // Roll back storage so the failed insert does not leave an orphan blob.
    await deleteBlobByUrl(upload.url);
    console.error('[HotelImage] DB insert failed:', dbErr);
    res.status(500).json({ success: false, message: 'Failed to record the uploaded image.' });
    return;
  }

  res.json({ success: true, image: { id: imageId, role: finalRole, content_type: upload.contentType, size_bytes: upload.size, display_order: nextOrder } });
}));

// Admin: reorder gallery images.
app.put('/api/admin/hotels/:hotelId/images/reorder', requireAdminAuth, wrap(async (req, res) => {
  const hotel = await getOne<{ id: string }>(`SELECT id FROM hotels WHERE id = $1`, [req.params.hotelId]);
  if (!hotel) { res.status(404).json({ success: false, message: 'Hotel not found' }); return; }
  const ids = Array.isArray(req.body?.ids) ? req.body.ids.map((x: unknown) => String(x)) : [];
  if (!ids.length) { res.status(400).json({ success: false, message: 'An ordered list of image ids is required.' }); return; }

  for (let i = 0; i < ids.length; i++) {
    await runQuery(`UPDATE hotel_images SET display_order = $1 WHERE hotel_id = $2 AND id = $3`, [i + 1, hotel.id, ids[i]]);
  }
  const images = await getAll(
    `SELECT id, role, content_type, size_bytes, display_order FROM hotel_images WHERE hotel_id = $1 ORDER BY (role = 'cover') DESC, display_order ASC`,
    [hotel.id]
  );
  res.json({ success: true, images });
}));

// Admin: delete a single image (and its blob if no longer referenced).
app.delete('/api/admin/hotels/images/:imageId', requireAdminAuth, wrap(async (req, res) => {
  const image = await getOne<any>(`SELECT id, hotel_id, blob_url FROM hotel_images WHERE id = $1`, [req.params.imageId]);
  if (!image) { res.status(404).json({ success: false, message: 'Image not found' }); return; }

  await runQuery(`DELETE FROM hotel_images WHERE id = $1`, [image.id]);

  // Only delete the blob if no remaining row references the same url.
  const remaining = await getOne<{ count: string | number }>(`SELECT COUNT(*)::int AS count FROM hotel_images WHERE blob_url = $1`, [image.blob_url]);
  if (Number(remaining?.count || 0) === 0) {
    await deleteBlobByUrl(image.blob_url);
  }

  res.json({ success: true, message: 'Image removed.' });
}));

// Authorization-aware private image delivery.
// Public visitors can view images of PUBLISHED listings only; draft/archived
// listing images require a valid admin session. Original blob URLs stay private.
app.get('/api/hotel-image/:imageId', wrap(async (req, res) => {
  const image = await getOne<any>(
    `SELECT hi.blob_url, hi.content_type, h.status
     FROM hotel_images hi JOIN hotels h ON h.id = hi.hotel_id
     WHERE hi.id = $1`,
    [req.params.imageId]
  );
  if (!image) {
    res.status(404).setHeader('Cache-Control', 'no-store').json({ success: false, message: 'Image not found' });
    return;
  }

  if (image.status !== 'published') {
    const token = extractToken(req);
    const session = token ? await validateSession(token) : { valid: false };
    if (!session.valid) {
      res.status(403).setHeader('Cache-Control', 'no-store').json({ success: false, message: 'Not authorized to view this image.' });
      return;
    }
  }

  let blob;
  try {
    blob = await fetchPrivateBlob(image.blob_url);
  } catch (err) {
    console.error('[HotelImage] blob fetch failed:', (err as Error)?.message || err);
    res.status(502).setHeader('Cache-Control', 'no-store').json({ success: false, message: 'Image temporarily unavailable.' });
    return;
  }

  await streamPrivateBlob(res, image.blob_url, image.content_type || '', image.status === 'published');
}));

// ------------------------------------------
// WEBSITE WALKTHROUGH (admin-written, Neon-backed)
// ------------------------------------------

// Public: the latest PUBLISHED walkthrough only. Drafts never leave the admin
// API; when nothing is published the frontend hides the section entirely.
app.get('/api/walkthrough', wrap(async (_req, res) => {
  const walk = await getOne<any>(`SELECT * FROM walkthroughs WHERE status = 'published' ORDER BY updated_at DESC LIMIT 1`);
  if (!walk) {
    res.json({ success: true, walkthrough: null, sections: [] });
    return;
  }
  const sections = await getAll(
    'SELECT id, heading, body, image_ref, caption, video_url, display_order FROM walkthrough_sections WHERE walkthrough_id = $1 ORDER BY display_order ASC',
    [walk.id]
  );
  res.json({ success: true, walkthrough: walk, sections });
}));

app.get('/api/admin/walkthroughs', requireAdminAuth, wrap(async (_req, res) => {
  const walks = await getAll(
    `SELECT w.*, (SELECT COUNT(*)::int FROM walkthrough_sections ws WHERE ws.walkthrough_id = w.id) AS section_count
     FROM walkthroughs w ORDER BY w.updated_at DESC`
  );
  res.json({ success: true, walkthroughs: walks });
}));

app.get('/api/admin/walkthroughs/:id', requireAdminAuth, wrap(async (req, res) => {
  const walk = await getOne('SELECT * FROM walkthroughs WHERE id = $1', [req.params.id]);
  if (!walk) {
    res.status(404).json({ success: false, message: 'Walkthrough not found' });
    return;
  }
  const sections = await getAll(
    'SELECT * FROM walkthrough_sections WHERE walkthrough_id = $1 ORDER BY display_order ASC',
    [walk.id]
  );
  res.json({ success: true, walkthrough: walk, sections });
}));

app.post('/api/admin/walkthroughs', requireAdminAuth, wrap(async (req, res) => {
  const title = sanitizeLite(req.body?.title, 120);
  if (!title) {
    res.status(400).json({ success: false, message: 'Walkthrough title is required.' });
    return;
  }
  const id = `walk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();
  await runQuery(
    `INSERT INTO walkthroughs (id, title, intro, status, created_at, updated_at) VALUES ($1, $2, $3, 'draft', $4, $5)`,
    [id, title, sanitizeLite(req.body?.intro, 1000), now, now]
  );
  const walk = await getOne('SELECT * FROM walkthroughs WHERE id = $1', [id]);
  res.json({ success: true, walkthrough: walk });
}));

app.put('/api/admin/walkthroughs/:id', requireAdminAuth, wrap(async (req, res) => {
  const existing = await getOne<any>('SELECT * FROM walkthroughs WHERE id = $1', [req.params.id]);
  if (!existing) {
    res.status(404).json({ success: false, message: 'Walkthrough not found' });
    return;
  }
  const title = req.body?.title !== undefined ? sanitizeLite(req.body.title, 120) : existing.title;
  if (!title) {
    res.status(400).json({ success: false, message: 'Walkthrough title is required.' });
    return;
  }
  const intro = req.body?.intro !== undefined ? sanitizeLite(req.body.intro, 1000) : existing.intro;
  await runQuery('UPDATE walkthroughs SET title = $1, intro = $2, updated_at = $3 WHERE id = $4', [title, intro, new Date().toISOString(), existing.id]);
  const walk = await getOne('SELECT * FROM walkthroughs WHERE id = $1', [existing.id]);
  res.json({ success: true, walkthrough: walk });
}));

// Publish / unpublish. Publishing requires at least one section with a heading,
// so an empty walkthrough can never go live.
app.post('/api/admin/walkthroughs/:id/publish', requireAdminAuth, wrap(async (req, res) => {
  const walk = await getOne<any>('SELECT * FROM walkthroughs WHERE id = $1', [req.params.id]);
  if (!walk) {
    res.status(404).json({ success: false, message: 'Walkthrough not found' });
    return;
  }
  const sections = await getOne<{ count: string | number }>(
    `SELECT COUNT(*)::int AS count FROM walkthrough_sections WHERE walkthrough_id = $1 AND heading <> ''`,
    [walk.id]
  );
  if (Number(sections?.count || 0) === 0) {
    res.status(400).json({ success: false, message: 'Add at least one section with a heading before publishing.' });
    return;
  }
  // Only one walkthrough may be live at a time.
  await runQuery(`UPDATE walkthroughs SET status = 'draft' WHERE status = 'published' AND id <> $1`, [walk.id]);
  await runQuery(`UPDATE walkthroughs SET status = 'published', updated_at = $1 WHERE id = $2`, [new Date().toISOString(), walk.id]);
  const updated = await getOne('SELECT * FROM walkthroughs WHERE id = $1', [walk.id]);
  res.json({ success: true, walkthrough: updated });
}));

app.post('/api/admin/walkthroughs/:id/unpublish', requireAdminAuth, wrap(async (req, res) => {
  const walk = await getOne<any>('SELECT id FROM walkthroughs WHERE id = $1', [req.params.id]);
  if (!walk) {
    res.status(404).json({ success: false, message: 'Walkthrough not found' });
    return;
  }
  await runQuery(`UPDATE walkthroughs SET status = 'draft', updated_at = $1 WHERE id = $2`, [new Date().toISOString(), walk.id]);
  const updated = await getOne('SELECT * FROM walkthroughs WHERE id = $1', [walk.id]);
  res.json({ success: true, walkthrough: updated });
}));

app.delete('/api/admin/walkthroughs/:id', requireAdminAuth, wrap(async (req, res) => {
  const result = await runQuery('DELETE FROM walkthroughs WHERE id = $1', [req.params.id]);
  if (result.rowCount === 0) {
    res.status(404).json({ success: false, message: 'Walkthrough not found' });
    return;
  }
  res.json({ success: true, message: 'Walkthrough deleted.' });
}));

// Sections: create / update / delete / reorder.
app.post('/api/admin/walkthroughs/:id/sections', requireAdminAuth, wrap(async (req, res) => {
  const walk = await getOne<any>('SELECT id FROM walkthroughs WHERE id = $1', [req.params.id]);
  if (!walk) {
    res.status(404).json({ success: false, message: 'Walkthrough not found' });
    return;
  }
  const heading = sanitizeLite(req.body?.heading, 160);
  if (!heading) {
    res.status(400).json({ success: false, message: 'Section heading is required.' });
    return;
  }
  const orderRow = await getOne<{ mx: string | number | null }>('SELECT MAX(display_order) AS mx FROM walkthrough_sections WHERE walkthrough_id = $1', [walk.id]);
  const id = `wsec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();
  await runQuery(
    `INSERT INTO walkthrough_sections (id, walkthrough_id, heading, body, image_ref, caption, video_url, display_order, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$9)`,
    [id, walk.id, heading, sanitizeLite(req.body?.body), sanitizeLite(req.body?.imageRef, 500), sanitizeLite(req.body?.caption, 300), sanitizeLite(req.body?.videoUrl, 300), Number(orderRow?.mx || 0) + 1, now]
  );
  const section = await getOne('SELECT * FROM walkthrough_sections WHERE id = $1', [id]);
  res.json({ success: true, section });
}));

app.put('/api/admin/sections/:sectionId', requireAdminAuth, wrap(async (req, res) => {
  const existing = await getOne<any>('SELECT * FROM walkthrough_sections WHERE id = $1', [req.params.sectionId]);
  if (!existing) {
    res.status(404).json({ success: false, message: 'Section not found' });
    return;
  }
  const b = req.body || {};
  const heading = b.heading !== undefined ? sanitizeLite(b.heading, 160) : existing.heading;
  if (!heading) {
    res.status(400).json({ success: false, message: 'Section heading is required.' });
    return;
  }
  // Only http(s) video links are accepted (no javascript:/data: URIs).
  let videoUrl = existing.video_url;
  if (b.videoUrl !== undefined) {
    const v = sanitizeLite(b.videoUrl, 300);
    videoUrl = v === '' || /^https?:\/\//i.test(v) ? v : existing.video_url;
    if (v && videoUrl === existing.video_url && existing.video_url !== v) {
      res.status(400).json({ success: false, message: 'Video links must start with http:// or https://.' });
      return;
    }
  }
  await runQuery(
    'UPDATE walkthrough_sections SET heading = $1, body = $2, image_ref = $3, caption = $4, video_url = $5, display_order = $6, updated_at = $7 WHERE id = $8',
    [
      heading,
      b.body !== undefined ? sanitizeLite(b.body) : existing.body,
      b.imageRef !== undefined ? sanitizeLite(b.imageRef, 500) : existing.image_ref,
      b.caption !== undefined ? sanitizeLite(b.caption, 300) : existing.caption,
      videoUrl,
      b.displayOrder !== undefined ? Number(b.displayOrder) || 1 : existing.display_order,
      new Date().toISOString(),
      existing.id,
    ]
  );
  const section = await getOne('SELECT * FROM walkthrough_sections WHERE id = $1', [existing.id]);
  res.json({ success: true, section });
}));

app.delete('/api/admin/sections/:sectionId', requireAdminAuth, wrap(async (req, res) => {
  const result = await runQuery('DELETE FROM walkthrough_sections WHERE id = $1', [req.params.sectionId]);
  if (result.rowCount === 0) {
    res.status(404).json({ success: false, message: 'Section not found' });
    return;
  }
  res.json({ success: true, message: 'Section removed.' });
}));

app.put('/api/admin/walkthroughs/:id/sections/reorder', requireAdminAuth, wrap(async (req, res) => {
  const walk = await getOne<any>('SELECT id FROM walkthroughs WHERE id = $1', [req.params.id]);
  if (!walk) {
    res.status(404).json({ success: false, message: 'Walkthrough not found' });
    return;
  }
  const ids = Array.isArray(req.body?.ids) ? req.body.ids.map((x: unknown) => String(x)) : [];
  if (!ids.length) {
    res.status(400).json({ success: false, message: 'An ordered list of section ids is required.' });
    return;
  }
  for (let i = 0; i < ids.length; i++) {
    await runQuery('UPDATE walkthrough_sections SET display_order = $1 WHERE walkthrough_id = $2 AND id = $3', [i + 1, walk.id, ids[i]]);
  }
  const sections = await getAll(
    'SELECT * FROM walkthrough_sections WHERE walkthrough_id = $1 ORDER BY display_order ASC',
    [walk.id]
  );
  res.json({ success: true, sections });
}));

// Upload a walkthrough image into the private Blob store. The browser receives
// only the delivery-route id, never the raw blob URL.
app.post('/api/admin/walkthrough-images', requireAdminAuth, wrap(async (req, res) => {
  const decoded = decodeImagePayload(req.body?.fileData);
  if (!decoded) {
    res.status(400).json({ success: false, message: 'Invalid image payload. Only base64-encoded images are accepted.' });
    return;
  }
  const imageId = `wimg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  let upload;
  try {
    upload = await uploadPrivateImage(decoded, 'walkthrough');
  } catch (err: any) {
    res.status(err?.status || 502).json({ success: false, message: err?.message || 'Image upload failed.' });
    return;
  }
  try {
    await runQuery(
      `INSERT INTO room_images (id, room_id, blob_url, blob_pathname, content_type, size_bytes, role, display_order, created_at)
       VALUES ($1, NULL, $2, $3, $4, $5, 'gallery', 1, $6)`,
      [imageId, upload.url, upload.pathname, upload.contentType, upload.size, new Date().toISOString()]
    );
  } catch (dbErr) {
    await deleteBlobByUrl(upload.url);
    console.error('[WalkthroughImage] DB insert failed:', dbErr);
    res.status(500).json({ success: false, message: 'Failed to record the uploaded image.' });
    return;
  }
  res.json({ success: true, image: { id: imageId, ref: `/api/room-image/${imageId}` } });
}));

// ------------------------------------------
// VITE SPA & STATIC ROUTING (local dev / local prod only)
// ------------------------------------------

async function startServer() {
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get(/^\/(?!api\/).*/, (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Red Rock Hotel] Server running at http://0.0.0.0:${PORT}`);
  });
}

// Vercel re-exports `app` from api/index.ts; only start a real listener locally.
if (!process.env.VERCEL) {
  startServer();
}

export default app;
