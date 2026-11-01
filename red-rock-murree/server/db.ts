import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { GALLERY_ITEMS } from '../src/data/hotelData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.resolve(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.resolve(dataDir, 'hotel.db');
export const db = new DatabaseSync(dbPath);

// Enable WAL mode for high performance
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA synchronous = NORMAL;');

// Password hashing helper
export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const activeSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, activeSalt, 64).toString('hex');
  return { hash, salt: activeSalt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const computed = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(hash));
}

// Helper for idempotent column addition
function addColumnIfNotExists(table: string, column: string, definition: string) {
  try {
    const pragma = db.prepare(`PRAGMA table_info(${table})`).all() as any[];
    const exists = pragma.some((col: any) => col.name === column);
    if (!exists) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    }
  } catch (err) {
    console.warn(`[DB] Column migration notice for ${table}.${column}:`, err);
  }
}

// Database initialization
export function initDatabase() {
  // 1. Admin table
  db.exec(`
    CREATE TABLE IF NOT EXISTS admin (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  // 2. Rooms table (Exactly 20 Rooms with full dynamic controls)
  db.exec(`
    CREATE TABLE IF NOT EXISTS rooms (
      id TEXT PRIMARY KEY,
      room_number TEXT UNIQUE NOT NULL,
      is_available INTEGER NOT NULL DEFAULT 1,
      image_url TEXT NOT NULL,
      room_type TEXT NOT NULL DEFAULT 'Deluxe',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // Ensure extended room columns exist
  addColumnIfNotExists('rooms', 'title', "TEXT NOT NULL DEFAULT ''");
  addColumnIfNotExists('rooms', 'description', "TEXT NOT NULL DEFAULT ''");
  addColumnIfNotExists('rooms', 'status', "TEXT NOT NULL DEFAULT 'Available'");
  addColumnIfNotExists('rooms', 'display_order', "INTEGER NOT NULL DEFAULT 1");
  addColumnIfNotExists('rooms', 'is_published', "INTEGER NOT NULL DEFAULT 1");
  addColumnIfNotExists('rooms', 'gallery', "TEXT NOT NULL DEFAULT '[]'");

  // 3. Facility Sections table (Entrance, Reception, etc.)
  db.exec(`
    CREATE TABLE IF NOT EXISTS facility_sections (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      image_url TEXT NOT NULL,
      display_order INTEGER NOT NULL DEFAULT 1,
      is_published INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // 4. Dynamic Gallery Items table
  db.exec(`
    CREATE TABLE IF NOT EXISTS gallery_items (
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
    );
  `);

  // 5. Food table (No pricing anywhere!)
  db.exec(`
    CREATE TABLE IF NOT EXISTS food (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      thumbnail TEXT NOT NULL,
      available_from TEXT NOT NULL,
      available_until TEXT NOT NULL,
      is_available INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // 6. Website Settings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      id TEXT PRIMARY KEY,
      whatsapp_number TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL
    );
  `);

  // 7. Sessions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL
    );
  `);

  // No administrator account is ever created automatically.
  // Create one with: npm run admin:create -- <username> <password>
  const adminCheck = db.prepare('SELECT COUNT(*) as count FROM admin').get() as { count: number };
  if (adminCheck.count === 0) {
    console.log('[DB] No administrator account exists yet. Create one with: npm run admin:create -- <username> <password>');
  }

  // Seed / migrate entrance and reception
  const facilityCheck = db.prepare('SELECT COUNT(*) as count FROM facility_sections').get() as { count: number };
  if (facilityCheck.count === 0) {
    const now = new Date().toISOString();
    const insertFacility = db.prepare(`
      INSERT INTO facility_sections (id, type, title, description, image_url, display_order, is_published, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertFacility.run(
      'entrance',
      'entrance',
      'Entrance',
      'The front entrance of Red Rock Murree.',
      '/images/00-entrance.jpg',
      1,
      1,
      now,
      now
    );

    insertFacility.run(
      'reception',
      'reception',
      'Reception',
      'The reception desk at Red Rock Murree.',
      '/images/01-reception.jpg',
      2,
      1,
      now,
      now
    );
    console.log('[DB] Seeded Entrance and Reception facility sections');
  }

  // Seed exactly 20 rooms if empty
  const roomsCheck = db.prepare('SELECT COUNT(*) as count FROM rooms').get() as { count: number };
  const now = new Date().toISOString();

  if (roomsCheck.count === 0) {
    const insertRoom = db.prepare(`
      INSERT INTO rooms (id, room_number, is_available, image_url, room_type, title, description, status, display_order, is_published, gallery, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (let i = 1; i <= 20; i++) {
      const roomNumStr = `Room ${i.toString().padStart(2, '0')}`;
      const isEven = i % 2 === 0;
      const seqIndex = (i + 1).toString().padStart(2, '0');
      const rmNum = i.toString().padStart(2, '0');
      const imageUrl = `/images/${seqIndex}-room-${rmNum}.jpg`;
      const roomType = isEven ? 'Executive Twin & Double Suite' : 'Deluxe King Suite';
      const title = roomType;
      const description = ''; // Left blank on purpose: only owner-verified text should be shown publicly.

      insertRoom.run(
        `room-${i}`,
        roomNumStr,
        1,
        imageUrl,
        roomType,
        title,
        description,
        'Available',
        i,
        1,
        JSON.stringify([imageUrl]),
        now,
        now
      );
    }
    console.log('[DB] Seeded exactly 20 rooms (Room 01 - Room 20)');
  } else {
    // Non-destructive backfill: only fills values that are genuinely blank.
    // (Earlier versions overwrote title, description, image, order and is_published on EVERY start,
    //  which silently reverted admin edits. That behaviour has been removed.)
    try {
      db.exec(`UPDATE rooms SET status = CASE WHEN is_available = 1 THEN 'Available' ELSE 'Occupied' END WHERE status IS NULL OR status = ''`);
      db.exec(`UPDATE rooms SET title = room_type WHERE title IS NULL OR title = ''`);
    } catch (err) {
      console.warn('[DB] Room backfill note:', err);
    }
  }

  // Gallery: only the supplied gallery photographs are shown (/images/gallery/*).
  // 1) Remove rows seeded by earlier versions (entrance, reception, rooms, lounge photos).
  //    Rows added later through the admin panel (id "gal-<timestamp>-...") are left untouched.
  db.exec(`DELETE FROM gallery_items WHERE id GLOB 'gal-[0-9][0-9]-*'`);

  // 2) Insert the supplied photographs (idempotent: existing rows keep any admin edits).
  const insertGal = db.prepare(`
    INSERT OR IGNORE INTO gallery_items (id, category, title, room_number, description, image_url, display_order, is_published, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const g of GALLERY_ITEMS) {
    insertGal.run(g.id, g.category, g.title, null, g.caption, g.image, g.stepNumber, 1, now, now);
  }

  // Seed default food if empty (Example: Chicken Biryani 12:00 PM – 10:00 PM)
  const foodCheck = db.prepare('SELECT COUNT(*) as count FROM food').get() as { count: number };
  if (foodCheck.count === 0) {
    const insertFood = db.prepare(`
      INSERT INTO food (id, name, thumbnail, available_from, available_until, is_available, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertFood.run(
      'food-chicken-biryani',
      'Chicken Biryani',
      '/uploads/img_1791024997069_val5a6.jpeg',
      '12:00 PM',
      '10:00 PM',
      1,
      now,
      now
    );
    console.log('[DB] Seeded initial food item (Chicken Biryani)');
  }

  // Seed settings if empty
  const settingsCheck = db.prepare('SELECT COUNT(*) as count FROM settings WHERE id = ?').get('general') as { count: number };
  if (settingsCheck.count === 0) {
    const insertSettings = db.prepare(`
      INSERT INTO settings (id, whatsapp_number, updated_at)
      VALUES (?, ?, ?)
    `);
    insertSettings.run('general', '', now);
    console.log('[DB] Seeded website settings (WhatsApp configurable)');
  }

  initRoomCategoryStats();
  cleanSeededClaimsOnce();
}

// Session management
export function createSession(username: string): string {
  const token = 'adm_sess_' + crypto.randomBytes(32).toString('hex');
  const now = new Date();
  const expires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const insert = db.prepare(`
    INSERT INTO sessions (token, username, created_at, expires_at)
    VALUES (?, ?, ?, ?)
  `);
  insert.run(token, username, now.toISOString(), expires.toISOString());
  return token;
}

export function validateSession(token: string): { valid: boolean; username?: string } {
  if (!token) return { valid: false };
  const stmt = db.prepare(`
    SELECT username, expires_at FROM sessions WHERE token = ?
  `);
  const row = stmt.get(token) as { username: string; expires_at: string } | undefined;
  if (!row) return { valid: false };

  if (new Date(row.expires_at) < new Date()) {
    deleteSession(token);
    return { valid: false };
  }

  return { valid: true, username: row.username };
}

export function deleteSession(token: string) {
  const stmt = db.prepare('DELETE FROM sessions WHERE token = ?');
  stmt.run(token);
}

// ---------------------------------------------------------------------------------------------
// One-time content cleanup (Stage 4). The original template seeded marketing claims that the owner never verified
// (marble floors, 24/7 surveillance, climate control, ensuite...). This replaces ONLY text that is still exactly the
// old seeded wording, so anything an admin edited is left alone. A full database backup is taken first.
// ---------------------------------------------------------------------------------------------
function cleanSeededClaimsOnce() {
  db.exec(`CREATE TABLE IF NOT EXISTS migrations (id TEXT PRIMARY KEY, applied_at TEXT NOT NULL)`);
  const done = db.prepare('SELECT id FROM migrations WHERE id = ?').get('2026-10-31-clean-seeded-claims');
  if (done) return;

  const dir = path.join(path.dirname(dbPath), 'backups');
  fs.mkdirSync(dir, { recursive: true });
  const backupFile = path.join(dir, `hotel-before-claims-cleanup-${new Date().toISOString().replace(/[:.]/g, '-')}.db`);
  db.exec(`VACUUM INTO '${backupFile.replace(/'/g, "''")}'`);
  console.log(`[DB] Backup written to ${backupFile}`);

  const OLD = {
    entranceTitle: 'Grand Hotel Entrance & Glass Foyer',
    entranceDesc: 'Authentic front entrance view through modern glass doorways, featuring an entryway foyer, polished marble flooring, 24/7 surveillance, and a welcoming arrival atmosphere.',
    receptionTitle: 'Front Desk Reception & Concierge',
    receptionDesc: 'Authentic 24/7 reception desk featuring Hotel Red Rock handcrafted wood counter, illuminated logo wall, concierge check-in station, and guest waiting lounge.',
  };
  const upFac = db.prepare('UPDATE facility_sections SET title = ?, description = ?, updated_at = ? WHERE type = ? AND title = ? AND description = ?');
  const now = new Date().toISOString();
  const f1 = upFac.run('Entrance', 'The front entrance of Red Rock Murree.', now, 'entrance', OLD.entranceTitle, OLD.entranceDesc);
  const f2 = upFac.run('Reception', 'The reception desk at Red Rock Murree.', now, 'reception', OLD.receptionTitle, OLD.receptionDesc);

  const exec = (n: string) => `${n} is an Executive Suite appointed with double and twin bedding, full-height wardrobe storage, modern slatted TV media accent wall, and climate control.`;
  const king = (n: string) => `${n} is a Deluxe King Suite featuring a plush king-size bed, upholstered velvet wall paneling, gleaming marble flooring, climate control, and ensuite bath.`;
  const rooms = db.prepare('SELECT id, room_number, description FROM rooms').all() as { id: string; room_number: string; description: string }[];
  const upRoom = db.prepare("UPDATE rooms SET description = '', updated_at = ? WHERE id = ?");
  let roomsCleared = 0;
  for (const r of rooms) {
    if (r.description === exec(r.room_number) || r.description === king(r.room_number)) { upRoom.run(now, r.id); roomsCleared++; }
  }
  db.prepare('INSERT INTO migrations (id, applied_at) VALUES (?, ?)').run('2026-10-31-clean-seeded-claims', now);
  console.log(`[DB] Cleaned seeded claim text: ${f1.changes + f2.changes} facility rows, ${roomsCleared} room descriptions.`);
}

// ---------------------------------------------------------------------------------------------
// Room-category availability (public summary). Separate from the per-room `rooms` table.
// Totals are fixed by the owner (42 rooms). The four status counts are editable by the admin and
// must always add up to the category total. Until an admin confirms them, they are flagged as not confirmed
// and the public site shows no live numbers.
// ---------------------------------------------------------------------------------------------
export const ROOM_CATEGORY_DEFS = [
  { key: 'two-seater', name: 'Two-Seater Rooms', total: 20 },
  { key: 'three-seater', name: 'Three-Seater Rooms', total: 5 },
  { key: 'four-seater', name: 'Four-Seater Rooms', total: 12 },
  { key: 'suite', name: 'Suite (2 in 1)', total: 5 },
] as const;
export const HOTEL_TOTAL_ROOMS = ROOM_CATEGORY_DEFS.reduce((n, c) => n + c.total, 0); // 42

export interface RoomCategoryStat {
  key: string; name: string; total: number;
  available: number; occupied: number; reserved: number; maintenance: number;
  confirmed: number; display_order: number; updated_at: string;
}

export function initRoomCategoryStats() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS room_category_stats (
      key TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      total INTEGER NOT NULL,
      available INTEGER NOT NULL DEFAULT 0,
      occupied INTEGER NOT NULL DEFAULT 0,
      reserved INTEGER NOT NULL DEFAULT 0,
      maintenance INTEGER NOT NULL DEFAULT 0,
      confirmed INTEGER NOT NULL DEFAULT 0,
      display_order INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL
    );
  `);
  const now = new Date().toISOString();
  const ins = db.prepare('INSERT OR IGNORE INTO room_category_stats (key, name, total, available, display_order, updated_at) VALUES (?, ?, ?, ?, ?, ?)');
  const sync = db.prepare('UPDATE room_category_stats SET name = ?, total = ? WHERE key = ?');
  ROOM_CATEGORY_DEFS.forEach((c, i) => {
    ins.run(c.key, c.name, c.total, c.total, i, now); // placeholder split (all available) only until the admin confirms real numbers
    sync.run(c.name, c.total, c.key);
  });
  // Safety net: an old row whose four counts no longer add up to the total is reset to unconfirmed.
  db.exec(`UPDATE room_category_stats SET available = total, occupied = 0, reserved = 0, maintenance = 0, confirmed = 0
           WHERE available + occupied + reserved + maintenance <> total`);
}

export function getRoomCategoryStats(): RoomCategoryStat[] {
  return db.prepare('SELECT * FROM room_category_stats ORDER BY display_order').all() as unknown as RoomCategoryStat[];
}

/** Returns an error message, or null on success. The four counts must be whole numbers that add up to the category total. */
export function setRoomCategoryStats(key: string, v: { available: unknown; occupied: unknown; reserved: unknown; maintenance: unknown }): string | null {
  const row = db.prepare('SELECT total FROM room_category_stats WHERE key = ?').get(key) as { total: number } | undefined;
  if (!row) return 'Unknown room category.';
  const nums = [v.available, v.occupied, v.reserved, v.maintenance].map((x) => (typeof x === 'number' ? x : Number(x)));
  if (nums.some((n) => !Number.isInteger(n) || n < 0)) return 'Each count must be a whole number, zero or more.';
  const sum = nums[0] + nums[1] + nums[2] + nums[3];
  if (sum !== row.total) return `The four counts add up to ${sum}, but this category has ${row.total} rooms. They must match exactly.`;
  db.prepare('UPDATE room_category_stats SET available=?, occupied=?, reserved=?, maintenance=?, confirmed=1, updated_at=? WHERE key=?')
    .run(nums[0], nums[1], nums[2], nums[3], new Date().toISOString(), key);
  return null;
}
