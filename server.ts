/**
 * Grand Travela — Express API + SPA server.
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

// 3. Get all published rooms (with live availability status, no pricing)
app.get('/api/rooms', wrap(async (_req, res) => {
  const rooms = await getAll(`
    SELECT id, room_number, is_available, status, image_url, room_type, title, description, display_order, is_published, gallery, created_at, updated_at
    FROM rooms
    WHERE is_published = 1
    ORDER BY display_order ASC, room_number ASC
  `);
  res.json({ success: true, rooms });
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
  return req.headers['x-admin-token'] as string | undefined;
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

app.get('/api/admin/rooms', requireAdminAuth, wrap(async (_req, res) => {
  const rooms = await getAll(`
    SELECT id, room_number, is_available, status, image_url, room_type, title, description, display_order, is_published, gallery, created_at, updated_at
    FROM rooms
    ORDER BY display_order ASC, room_number ASC
  `);
  res.json({ success: true, rooms });
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

  await runQuery(`
    INSERT INTO rooms (id, room_number, is_available, status, image_url, room_type, title, description, display_order, is_published, gallery, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
  `, [id, cleanNum, isAvail, cleanStatus, cleanImage, cleanType, cleanTitle, cleanDesc, cleanOrder, cleanPublished, galleryStr, now, now]);

  const created = await getOne('SELECT * FROM rooms WHERE id = $1', [id]);
  res.json({ success: true, room: created });
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

  await runQuery(`
    UPDATE rooms
    SET room_number = $1, room_type = $2, title = $3, description = $4, image_url = $5, status = $6, is_available = $7, display_order = $8, is_published = $9, gallery = $10, updated_at = $11
    WHERE id = $12
  `, [cleanNum, cleanType, cleanTitle, cleanDesc, cleanImage, cleanStatus, isAvail, cleanOrder, cleanPublished, cleanGallery, now, id]);

  const updated = await getOne('SELECT * FROM rooms WHERE id = $1', [id]);
  res.json({ success: true, room: updated });
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
    console.log(`[Grand Travela] Server running at http://0.0.0.0:${PORT}`);
  });
}

// Vercel re-exports `app` from api/index.ts; only start a real listener locally.
if (!process.env.VERCEL) {
  startServer();
}

export default app;
