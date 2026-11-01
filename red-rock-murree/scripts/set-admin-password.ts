import { db, initDatabase, hashPassword } from '../server/db.js';

const username = process.argv[2];
const password = process.argv[3];
if (!username || !password || password.length < 10) {
  console.error('Usage: npm run admin:password -- <username> <new password (min 10 characters)>');
  process.exit(1);
}
initDatabase();
const { hash, salt } = hashPassword(password);
const res = db.prepare('UPDATE admin SET password_hash = ?, salt = ? WHERE username = ?').run(hash, salt, username);
if (!res.changes) { console.error(`No administrator named "${username}".`); process.exit(1); }
db.prepare('DELETE FROM sessions WHERE username = ?').run(username); // sign out existing sessions
console.log(`Password updated for "${username}". Existing sessions were signed out.`);
