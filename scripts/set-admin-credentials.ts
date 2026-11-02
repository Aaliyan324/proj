/**
 * One-off admin credential updater for the Neon database.
 *
 * Sets the admin login to the given username/password (defaults: Admin / Admin123).
 * - Renames the legacy 'admin' row to the new username when it exists.
 * - Re-hashes the password.
 * - Idempotent: safe to run more than once.
 *
 * Usage:
 *   npm run db:admin            # Admin / Admin123
 *   ADMIN_USER=Foo ADMIN_PASS=Bar123 npm run db:admin
 */
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

async function main() {
  const dotenv = await import('dotenv');
  dotenv.default.config({ path: path.join(rootDir, '.env') });

  const uri = process.env.DATABASE_URL || process.env.DIRECT_URL;
  if (!uri) {
    console.error('[admin] Set DATABASE_URL in .env first. See .env.example.');
    process.exit(1);
  }
  process.env.DATABASE_URL = uri;

  const { ensureSchema, hashPassword, runQuery, getOne } = await import('../server/db.js');
  await ensureSchema();

  const username = process.env.ADMIN_USER || 'Admin';
  const password = process.env.ADMIN_PASS || 'Admin123';

  const existing = await getOne<{ id: number; username: string }>(
    `SELECT id, username FROM admin WHERE username = $1 OR username = 'admin' ORDER BY (username = $1) DESC LIMIT 1`,
    [username]
  );

  const { hash, salt } = hashPassword(password);
  const now = new Date().toISOString();

  if (existing) {
    await runQuery(
      `UPDATE admin SET username = $1, password_hash = $2, salt = $3 WHERE id = $4`,
      [username, hash, salt, existing.id]
    );
    console.log(`[admin] Updated existing account (was "${existing.username}") to "${username}".`);
  } else {
    await runQuery(
      `INSERT INTO admin (username, password_hash, salt, created_at) VALUES ($1, $2, $3, $4)`,
      [username, hash, salt, now]
    );
    console.log(`[admin] Created new account "${username}".`);
  }

  console.log(`[admin] Done — login username is now "${username}".`);
}

main().catch((err) => {
  console.error('[admin] Failed:', err);
  process.exit(1);
});
