/**
 * Data layer for Grand Travela — Neon PostgreSQL (serverless).
 *
 * Replaces the previous node:sqlite (data/hotel.db) integration so the app can
 * run on Vercel's serverless runtime, where a local file DB cannot persist.
 *
 * - Uses the Neon HTTP/fetch driver (@neondatabase/serverless `neon()`):
 *   stateless, safe for serverless invocations, parameterized ($1, $2, ...) queries.
 * - Pooled connection string (DATABASE_URL) for queries.
 * - Direct connection string (DIRECT_URL) is only needed if you prefer running
 *   schema migrations over a non-pooled connection; this project's DDL is
 *   idempotent so DATABASE_URL works for `npm run db:migrate` too.
 * - Binary uploads are stored in the `uploaded_files` table (ByteA) instead of
 *   the local filesystem, which is ephemeral on Vercel.
 */
import { neon, type NeonQueryFunction } from '@neondatabase/serverless';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

// The Neon HTTP driver is stateless and serverless-safe: each query is one HTTPS
// request, so no pool/connection management is needed inside Vercel functions.

function getConnectionUri(): string {
  const uri = process.env.DATABASE_URL || process.env.DIRECT_URL;
  if (!uri) {
    throw new Error(
      '[DB] DATABASE_URL is not set. Add your Neon connection string to .env (see .env.example).'
    );
  }
  return uri;
}

let _sql: NeonQueryFunction<false, false> | null = null;

/** Lazy-initialized shared query function (one client per warm invocation, never per query). */
export function getClient(): NeonQueryFunction<false, false> {
  if (!_sql) {
    _sql = neon(getConnectionUri());
  }
  return _sql;
}

// ------------------------------------------
// Async query helpers (drop-in replacements
// for the old synchronous db.prepare().all/get/run)
// ------------------------------------------

export async function getAll<T = Record<string, unknown>>(query: string, params: unknown[] = []): Promise<T[]> {
  const rows = await getClient().query(query, params);
  return rows as unknown as T[];
}

export async function getOne<T = Record<string, unknown>>(query: string, params: unknown[] = []): Promise<T | undefined> {
  const rows = await getClient().query(query, params);
  return (rows as unknown as T[])[0];
}

export async function runQuery(query: string, params: unknown[] = []): Promise<{ rowCount: number }> {
  const result = await getClient().query(query, params, { fullResults: true });
  return { rowCount: result.rowCount ?? 0 };
}

// ------------------------------------------
// Password hashing
// New hashes use bcrypt. Legacy scrypt hashes
// ("{salt}${hash}") produced by the SQLite version
// are still accepted on login and upgraded on password change.
// ------------------------------------------

const BCRYPT_PREFIX = '$2a$11$';

export function hashPassword(password: string, _salt?: string): { hash: string; salt: string } {
  const hash = bcrypt.hashSync(password, bcrypt.genSaltSync(11));
  // A single column stores both algorithm tag and digest for legacy compatibility.
  return { hash: `${BCRYPT_PREFIX}${hash}`, salt: '' };
}

export function verifyPassword(password: string, storedHash: string, salt: string): boolean {
  if (storedHash.startsWith(BCRYPT_PREFIX)) {
    return bcrypt.compareSync(password, storedHash.slice(BCRYPT_PREFIX.length));
  }
  if (salt) {
    // Legacy format from the SQLite era: scrypt hex digest with separate salt column.
    const computed = crypto.scryptSync(password, salt, 64).toString('hex');
    try {
      return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(storedHash));
    } catch {
      return false;
    }
  }
  // Legacy format without salt column value (raw "$2a$..." hash).
  return bcrypt.compareSync(password, storedHash);
}

/** True when the stored hash is legacy and should be upgraded after a successful login. */
export function needsRehash(storedHash: string): boolean {
  return !storedHash.startsWith(BCRYPT_PREFIX);
}

// ------------------------------------------
// Schema (idempotent, additive — safe to run repeatedly)
// ------------------------------------------

const SCHEMA_STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS admin (
     id SERIAL PRIMARY KEY,
     username TEXT UNIQUE NOT NULL,
     password_hash TEXT NOT NULL,
     salt TEXT NOT NULL DEFAULT '',
     created_at TEXT NOT NULL
   )`,
  `CREATE TABLE IF NOT EXISTS rooms (
     id TEXT PRIMARY KEY,
     room_number TEXT UNIQUE NOT NULL,
     is_available INTEGER NOT NULL DEFAULT 1,
     image_url TEXT NOT NULL,
     room_type TEXT NOT NULL DEFAULT 'Deluxe',
     created_at TEXT NOT NULL,
     updated_at TEXT NOT NULL,
     title TEXT NOT NULL DEFAULT '',
     description TEXT NOT NULL DEFAULT '',
     status TEXT NOT NULL DEFAULT 'Available',
     display_order INTEGER NOT NULL DEFAULT 1,
     is_published INTEGER NOT NULL DEFAULT 1,
     gallery TEXT NOT NULL DEFAULT '[]'
   )`,
  `CREATE TABLE IF NOT EXISTS facility_sections (
     id TEXT PRIMARY KEY,
     type TEXT NOT NULL,
     title TEXT NOT NULL,
     description TEXT NOT NULL,
     image_url TEXT NOT NULL,
     display_order INTEGER NOT NULL DEFAULT 1,
     is_published INTEGER NOT NULL DEFAULT 1,
     created_at TEXT NOT NULL,
     updated_at TEXT NOT NULL
   )`,
  `CREATE TABLE IF NOT EXISTS gallery_items (
     id TEXT PRIMARY KEY,
     category TEXT NOT NULL,
     title TEXT NOT NULL,
     room_number TEXT,
     description TEXT NOT NULL,
     image_url TEXT NOT NULL,
     display_order INTEGER NOT NULL DEFAULT 1,
     is_published INTEGER NOT NULL DEFAULT 1,
     created_at TEXT NOT NULL,
     updated_at TEXT NOT NULL
   )`,
  `CREATE TABLE IF NOT EXISTS food (
     id TEXT PRIMARY KEY,
     name TEXT NOT NULL,
     thumbnail TEXT NOT NULL,
     available_from TEXT NOT NULL,
     available_until TEXT NOT NULL,
     is_available INTEGER NOT NULL DEFAULT 1,
     created_at TEXT NOT NULL,
     updated_at TEXT NOT NULL
   )`,
  `CREATE TABLE IF NOT EXISTS settings (
     id TEXT PRIMARY KEY,
     whatsapp_number TEXT NOT NULL DEFAULT '',
     updated_at TEXT NOT NULL
   )`,
  `CREATE TABLE IF NOT EXISTS sessions (
     token TEXT PRIMARY KEY,
     username TEXT NOT NULL,
     created_at TEXT NOT NULL,
     expires_at TEXT NOT NULL
   )`,
  // Replaces public/uploads/ filesystem storage (ephemeral on serverless).
  `CREATE TABLE IF NOT EXISTS uploaded_files (
     name TEXT PRIMARY KEY,
     mime_type TEXT NOT NULL,
     data BYTEA NOT NULL,
     size_bytes INTEGER NOT NULL,
     created_at TEXT NOT NULL
   )`,
  // Hotel listings (multi-hotel directory). Additive, non-destructive.
  `CREATE TABLE IF NOT EXISTS hotels (
     id TEXT PRIMARY KEY,
     name TEXT NOT NULL,
     slug TEXT UNIQUE NOT NULL,
     short_description TEXT NOT NULL DEFAULT '',
     description TEXT NOT NULL DEFAULT '',
     category TEXT NOT NULL DEFAULT '',
     star_rating INTEGER NOT NULL DEFAULT 0,
     country TEXT NOT NULL DEFAULT '',
     city TEXT NOT NULL DEFAULT '',
     area TEXT NOT NULL DEFAULT '',
     address TEXT NOT NULL DEFAULT '',
     latitude NUMERIC NULL,
     longitude NUMERIC NULL,
     price_per_night NUMERIC NOT NULL DEFAULT 0,
     currency TEXT NOT NULL DEFAULT 'PKR',
     discount_price NUMERIC NULL,
     facilities TEXT NOT NULL DEFAULT '[]',
     contact_phone TEXT NOT NULL DEFAULT '',
     contact_email TEXT NOT NULL DEFAULT '',
     website TEXT NOT NULL DEFAULT '',
     status TEXT NOT NULL DEFAULT 'draft',
     created_at TEXT NOT NULL,
     updated_at TEXT NOT NULL
   )`,
  // Image metadata only. Binary lives in private Vercel Blob; we store the
  // stable blob pathname + url, never signed/temporary URLs, never bytes.
  `CREATE TABLE IF NOT EXISTS hotel_images (
     id TEXT PRIMARY KEY,
     hotel_id TEXT NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
     blob_url TEXT NOT NULL,
     blob_pathname TEXT NOT NULL,
     content_type TEXT NOT NULL,
     size_bytes INTEGER NOT NULL DEFAULT 0,
     role TEXT NOT NULL DEFAULT 'gallery',
     display_order INTEGER NOT NULL DEFAULT 1,
     created_at TEXT NOT NULL
   )`,
  // Indexes for the hot paths
  `CREATE INDEX IF NOT EXISTS idx_rooms_published_order ON rooms (is_published, display_order)`,
  `CREATE INDEX IF NOT EXISTS idx_gallery_published_order ON gallery_items (is_published, display_order)`,
  `CREATE INDEX IF NOT EXISTS idx_facility_published_order ON facility_sections (is_published, display_order)`,
  `CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions (expires_at)`,
  `CREATE INDEX IF NOT EXISTS idx_hotels_status ON hotels (status)`,
  `CREATE INDEX IF NOT EXISTS idx_hotels_slug ON hotels (slug)`,
  `CREATE INDEX IF NOT EXISTS idx_hotels_city_price ON hotels (city, price_per_night)`,
  `CREATE INDEX IF NOT EXISTS idx_hotel_images_hotel ON hotel_images (hotel_id, role, display_order)`,
];

/**
 * Apply the schema. Idempotent and non-destructive: only CREATE ... IF NOT EXISTS.
 * Call `ensureSchema()` at the start of request handlers; it runs its DDL at most
 * once per warm serverless invocation.
 */
let schemaReady = false;
export async function ensureSchema(): Promise<void> {
  if (schemaReady) return;
  for (const stmt of SCHEMA_STATEMENTS) {
    await getClient().query(stmt);
  }
  schemaReady = true;
}

// ------------------------------------------
// Session management (backed by Neon)
// ------------------------------------------

export async function createSession(username: string): Promise<string> {
  const token = 'adm_sess_' + crypto.randomBytes(32).toString('hex');
  const now = new Date();
  const expires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await runQuery(
    `INSERT INTO sessions (token, username, created_at, expires_at) VALUES ($1, $2, $3, $4)`,
    [token, username, now.toISOString(), expires.toISOString()]
  );
  return token;
}

export async function validateSession(token: string): Promise<{ valid: boolean; username?: string }> {
  if (!token) return { valid: false };
  const row = await getOne<{ username: string; expires_at: string }>(
    `SELECT username, expires_at FROM sessions WHERE token = $1`,
    [token]
  );
  if (!row) return { valid: false };

  if (new Date(row.expires_at) < new Date()) {
    await deleteSession(token);
    return { valid: false };
  }

  return { valid: true, username: row.username };
}

export async function deleteSession(token: string): Promise<void> {
  await runQuery('DELETE FROM sessions WHERE token = $1', [token]);
}

// ------------------------------------------
// Uploaded file storage (ByteA in Neon)
// ------------------------------------------

export interface StoredFile {
  name: string;
  mime_type: string;
  data: Uint8Array | Buffer;
  size_bytes: number;
}

/**
 * Save an uploaded image. Uses ON CONFLICT DO NOTHING so an existing file is
 * never overwritten (file names include a timestamp + random suffix anyway).
 */
export async function saveUploadedFile(name: string, mimeType: string, buffer: Buffer): Promise<void> {
  await runQuery(
    `INSERT INTO uploaded_files (name, mime_type, data, size_bytes, created_at)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (name) DO NOTHING`,
    [name, mimeType, buffer, buffer.length, new Date().toISOString()]
  );
}

export async function getUploadedFile(name: string): Promise<StoredFile | undefined> {
  return getOne<StoredFile>(
    `SELECT name, mime_type, data, size_bytes FROM uploaded_files WHERE name = $1`,
    [name]
  );
}
