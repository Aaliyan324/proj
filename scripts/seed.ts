/**
 * Baseline content seed for a fresh Neon database.
 *
 * SAFETY:
 *  - Idempotent & additive only: INSERT ... ON CONFLICT DO NOTHING.
 *    Existing records (admin edits, live rooms, uploads) are never touched.
 *  - Refuses to run when NODE_ENV=production unless FORCE_SEED=1 is set,
 *    so production can never be seeded accidentally.
 *
 * Usage:
 *   npm run db:seed
 *   ADMIN_DEFAULT_PASSWORD=... npm run db:seed   # override default admin password
 */
import path from 'path';
import { fileURLToPath } from 'url';
import { GALLERY_ITEMS } from '../src/data/hotelData.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

async function main() {
  const dotenv = await import('dotenv');
  dotenv.default.config({ path: path.join(rootDir, '.env') });

  if (process.env.NODE_ENV === 'production' && process.env.FORCE_SEED !== '1') {
    console.error('[seed] Refusing to seed a production database. Set FORCE_SEED=1 only if you really mean it.');
    process.exit(1);
  }

  const uri = process.env.DATABASE_URL || process.env.DIRECT_URL;
  if (!uri) {
    console.error('[seed] Set DATABASE_URL in .env first. See .env.example.');
    process.exit(1);
  }

  process.env.DATABASE_URL = uri;

  const { ensureSchema, hashPassword, runQuery, getOne } = await import('../server/db.js');
  await ensureSchema();

  const now = new Date().toISOString();
  const insertCount = { admin: 0, rooms: 0, facility: 0, gallery: 0, food: 0, settings: 0 };

  // 1. Default admin — password from ADMIN_DEFAULT_PASSWORD, else "admin123" (dev only).
  const { hash, salt } = hashPassword(process.env.ADMIN_DEFAULT_PASSWORD || 'admin123');
  await runQuery(
    `INSERT INTO admin (username, password_hash, salt, created_at) VALUES ($1, $2, $3, $4) ON CONFLICT (username) DO NOTHING`,
    ['admin', hash, salt, now]
  );

  // 2. Exactly 20 rooms (Room 01 - Room 20).
  const roomStmt = `
    INSERT INTO rooms (id, room_number, is_available, image_url, room_type, title, description, status, display_order, is_published, gallery, created_at, updated_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
    ON CONFLICT (id) DO NOTHING`;
  for (let i = 1; i <= 20; i++) {
    const roomNumStr = `Room ${i.toString().padStart(2, '0')}`;
    const isEven = i % 2 === 0;
    const seqIndex = (i + 1).toString().padStart(2, '0');
    const rmNum = i.toString().padStart(2, '0');
    const imageUrl = `/images/${seqIndex}-room-${rmNum}.jpg`;
    const roomType = isEven ? 'Executive Twin & Double Suite' : 'Deluxe King Suite';
    const description = isEven
      ? `${roomNumStr} is an Executive Suite appointed with double and twin bedding, full-height wardrobe storage, modern slatted TV media accent wall, and climate control.`
      : `${roomNumStr} is a Deluxe King Suite featuring a plush king-size bed, upholstered velvet wall paneling, gleaming marble flooring, climate control, and ensuite bath.`;
    await runQuery(roomStmt, [
      `room-${i}`, roomNumStr, 1, imageUrl, roomType, roomType, description,
      'Available', i, 1, JSON.stringify([imageUrl]), now, now
    ]);
    insertStmtCount('rooms');
  }

  // 3. Entrance & Reception facility sections.
  await runQuery(
    `INSERT INTO facility_sections (id, type, title, description, image_url, display_order, is_published, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (id) DO NOTHING`,
    ['entrance', 'entrance', 'Grand Hotel Entrance',
      'Authentic front entrance view through modern glass doorways, featuring an entryway foyer, polished marble flooring, 24/7 surveillance, and a welcoming arrival atmosphere.',
      '/images/00-entrance.jpg', 1, 1, now, now]
  );
  await runQuery(
    `INSERT INTO facility_sections (id, type, title, description, image_url, display_order, is_published, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (id) DO NOTHING`,
    ['reception', 'reception', 'Front Desk Reception & Concierge',
      'Authentic 24/7 reception desk featuring Hotel Red Rock handcrafted wood counter, illuminated logo wall, concierge check-in station, and guest waiting lounge.',
      '/images/01-reception.jpg', 2, 1, now, now]
  );
  insertStmtCount('facility'); insertStmtCount('facility');

  // 4. Gallery baseline (only supplied gallery photographs, /images/gallery/*).
  for (const g of GALLERY_ITEMS) {
    await runQuery(
      `INSERT INTO gallery_items (id, category, title, room_number, description, image_url, display_order, is_published, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (id) DO NOTHING`,
      [g.id, g.category, g.title, null, g.caption, g.image, g.stepNumber, 1, now, now]
    );
    insertStmtCount('gallery');
  }

  // 5. Default food item if the menu is empty.
  const foodCountRow = await getOne<{ count: number }>(`SELECT COUNT(*)::int AS count FROM food`);
  if (foodCountRow && foodCountRow.count === 0) {
    await runQuery(
      `INSERT INTO food (id, name, thumbnail, available_from, available_until, is_available, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO NOTHING`,
      ['food-chicken-biryani', 'Chicken Biryani', '/uploads/img_1791024997069_val5a6.jpeg', '12:00 PM', '10:00 PM', 1, now, now]
    );
    insertStmtCount('food');
  }

  // 6. Settings row.
  await runQuery(
    `INSERT INTO settings (id, whatsapp_number, updated_at) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING`,
    ['general', '', now]
  );
  insertStmtCount('settings');

  console.log('[seed] Completed (existing rows were preserved):', insertCount);
  if (!process.env.ADMIN_DEFAULT_PASSWORD) {
    console.log('[seed] Default admin: username "admin", password "admin123" — change it immediately after first login.');
  }

  function insertStmtCount(key: keyof typeof insertCount) { (insertCount as any)[key]++; }
}

main().catch((err) => {
  console.error('[seed] Failed:', err);
  process.exit(1);
});
