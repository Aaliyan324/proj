import { db, initDatabase, hashPassword } from '../server/db.js';

const username = process.argv[2];
const password = process.argv[3];
if (!username || !password || password.length < 10) {
  console.error('Usage: npm run admin:create -- <username> <password (min 10 characters)>');
  process.exit(1);
}
initDatabase();
const { hash, salt } = hashPassword(password);
const exists = db.prepare('SELECT 1 FROM admin WHERE username = ?').get(username);
if (exists) {
  console.error(`An administrator named "${username}" already exists. To change its password use: npm run admin:password -- <new password> ${username}`);
  process.exit(1);
}
db.prepare('INSERT INTO admin (username, password_hash, salt, created_at) VALUES (?, ?, ?, ?)').run(username, hash, salt, new Date().toISOString());
console.log(`Administrator "${username}" created.`);
