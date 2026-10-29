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

  // Seed default admin if empty
  const adminCheck = db.prepare('SELECT COUNT(*) as count FROM admin').get() as { count: number };
  if (adminCheck.count === 0) {
    const { hash, salt } = hashPassword('admin123');
    const now = new Date().toISOString();
    const insertAdmin = db.prepare(`
      INSERT INTO admin (username, password_hash, salt, created_at)
      VALUES (?, ?, ?, ?)
    `);
    insertAdmin.run('admin', hash, salt, now);
    console.log('[DB] Created default admin account: username "admin"');
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
      'Grand Hotel Entrance',
      'Authentic front entrance view through modern glass doorways, featuring an entryway foyer, polished marble flooring, 24/7 surveillance, and a welcoming arrival atmosphere.',
      '/images/00-entrance.jpg',
      1,
      1,
      now,
      now
    );

    insertFacility.run(
      'reception',
      'reception',
      'Front Desk Reception & Concierge',
      'Authentic 24/7 reception desk featuring Hotel Red Rock handcrafted wood counter, illuminated logo wall, concierge check-in station, and guest waiting lounge.',
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
      const description = isEven
        ? `${roomNumStr} is an Executive Suite appointed with double and twin bedding, full-height wardrobe storage, modern slatted TV media accent wall, and climate control.`
        : `${roomNumStr} is a Deluxe King Suite featuring a plush king-size bed, upholstered velvet wall paneling, gleaming marble flooring, climate control, and ensuite bath.`;

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
    // Run safe update migration for existing rooms to populate sequential images, status, title & description
    try {
      const existingRooms = db.prepare('SELECT id, room_number, is_available, status, title, display_order, image_url FROM rooms').all() as any[];
      const updateStmt = db.prepare(`
        UPDATE rooms 
        SET status = ?, title = ?, description = ?, display_order = ?, image_url = ?, is_published = 1 
        WHERE id = ?
      `);

      for (const r of existingRooms) {
        const match = r.room_number.match(/(\d+)/);
        const num = match ? parseInt(match[1], 10) : 1;
        const seqIndex = (num + 1).toString().padStart(2, '0');
        const rmNum = num.toString().padStart(2, '0');
        const seqImage = `/images/${seqIndex}-room-${rmNum}.jpg`;
        const isEven = num % 2 === 0;
        const currentStatus = r.status && r.status !== '' ? r.status : (r.is_available === 1 ? 'Available' : 'Occupied');
        const title = r.title && r.title !== '' ? r.title : (isEven ? 'Executive Twin & Double Suite' : 'Deluxe King Suite');
        const desc = isEven
          ? `${r.room_number} is an Executive Suite appointed with double and twin bedding, full-height wardrobe storage, modern slatted TV media accent wall, and climate control.`
          : `${r.room_number} is a Deluxe King Suite featuring a plush king-size bed, upholstered velvet wall paneling, gleaming marble flooring, climate control, and ensuite bath.`;

        updateStmt.run(
          currentStatus,
          title,
          desc,
          num,
          seqImage,
          r.id
        );
      }
      console.log('[DB] Migrated existing 20 rooms with sequential imagery and full metadata');
    } catch (err) {
      console.warn('[DB] Room migration note:', err);
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
