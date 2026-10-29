/**
 * Safe, one-time data migration: legacy SQLite (data/hotel.db) -> Neon PostgreSQL.
 *
 * Rules enforced here:
 *  - Additive only: every row is inserted with ON CONFLICT DO NOTHING, so
 *    existing Neon records are NEVER updated, overwritten, or deleted.
 *  - Nothing is read from or written to production automatically; run it
 *    yourself against the database you intend to seed:
 *        npm run db:migrate          (uses DATABASE_URL, or DIRECT_URL if set)
 *
 * Requires Node.js >= 22.5 for the built-in `node:sqlite` reader (already the
 * version this project runs on locally). If data/hotel.db does not exist,
 * the script migrates nothing and only applies the schema.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

async function main() {
  // Load .env from project root
  const dotenv = await import('dotenv');
  dotenv.default.config({ path: path.join(rootDir, '.env') });

  const uri = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!uri) {
    console.error('[migrate] Set DATABASE_URL (or DIRECT_URL) in .env or the environment first. See .env.example.');
    process.exit(1);
  }

  // 1. Apply idempotent schema via the app's own definition (single source of truth).
  process.env.DATABASE_URL = process.env.DATABASE_URL || uri;
  const { ensureSchema, runQuery } = await import('../server/db.js');
  await ensureSchema();
  console.log('[migrate] Schema applied (CREATE TABLE IF NOT EXISTS — non-destructive).');

  // 2. Copy legacy SQLite data if the old database file exists.
  const dbPath = path.join(rootDir, 'data', 'hotel.db');
  if (!fs.existsSync(dbPath)) {
    console.log('[migrate] data/hotel.db not found — nothing to copy. Schema-only migration complete.');
    console.log('[migrate] To seed baseline content instead, run: npm run db:seed');
    process.exit(0);
  }

  let DatabaseSync: any;
  try {
    ({ DatabaseSync } = await import('node:sqlite'));
  } catch {
    console.error('[migrate] node:sqlite unavailable (needs Node >= 22.5). Reading legacy data skipped.');
    process.exit(1);
  }

  const lite = new DatabaseSync(dbPath, { readOnly: true });
  const tables = [
    'admin',
    'rooms',
    'facility_sections',
    'gallery_items',
    'food',
    'settings',
    'sessions',
  ] as const;

  let totalInserted = 0;
  for (const table of tables) {
    let rows: Record<string, unknown>[] = [];
    try {
      rows = lite.prepare(`SELECT * FROM ${table}`).all() as Record<string, unknown>[];
    } catch {
      console.log(`[migrate] Legacy table "${table}" not present — skipped.`);
      continue;
    }
    if (rows.length === 0) continue;

    let inserted = 0;
    for (const row of rows) {
      const cols = Object.keys(row);
      const values = cols.map((c) => normalizeValue(row[c]));
      const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
      const conflicts = cols.includes('id') ? 'id' : cols.includes('token') ? 'token' : cols[0];
      try {
        await runQuery(
          `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders}) ON CONFLICT (${conflicts}) DO NOTHING`,
          values
        );
        inserted++;
      } catch (err: any) {
        console.warn(`[migrate] skipped ${table} row:`, err?.message || err);
      }
    }
    console.log(`[migrate] ${table}: ${inserted}/${rows.length} rows inserted (existing rows preserved).`);
    totalInserted += inserted;
  }

  // 3. Copy legacy uploaded files into Neon so /uploads URLs keep working.
  const uploadsDir = path.join(rootDir, 'public', 'uploads');
  if (fs.existsSync(uploadsDir)) {
    const files = fs.readdirSync(uploadsDir).filter((f) => /\.(jpe?g|png|webp|gif)$/i.test(f));
    let copied = 0;
    for (const file of files) {
      const buffer = fs.readFileSync(path.join(uploadsDir, file));
      const mime = /png$/i.test(file) ? 'image/png' : /webp$/i.test(file) ? 'image/webp' : /gif$/i.test(file) ? 'image/gif' : 'image/jpeg';
      try {
        await runQuery(
          `INSERT INTO uploaded_files (name, mime_type, data, size_bytes, created_at)
           VALUES ($1, $2, $3, $4, $5) ON CONFLICT (name) DO NOTHING`,
          [file, mime, buffer, buffer.length, new Date().toISOString()]
        );
        copied++;
      } catch (err: any) {
        console.warn(`[migrate] skipped upload ${file}:`, err?.message || err);
      }
    }
    console.log(`[migrate] uploaded files: ${copied}/${files.length} copied into Neon (existing files preserved).`);
  }

  lite.close();
  console.log(`[migrate] Done. ${totalInserted} legacy rows migrated. Verify counts in Neon before cutting over.`);
  console.log('[migrate] NOTE: this script never deletes or updates existing Neon data.');
}

function normalizeValue(value: unknown): unknown {
  if (value === undefined) return null;
  // node:sqlite may return BigInt or Uint8Array; JSON-safe conversion for the HTTP driver.
  if (typeof value === 'bigint') return Number(value);
  return value;
}

main().catch((err) => {
  console.error('[migrate] Failed:', err);
  process.exit(1);
});
