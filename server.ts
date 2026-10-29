import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { 
  db, 
  initDatabase, 
  verifyPassword, 
  hashPassword, 
  createSession, 
  validateSession, 
  deleteSession 
} from './server/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === 'production' || process.argv.includes('--prod');

// Initialize Database & Tables
initDatabase();

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Directories
const uploadsDir = path.resolve(__dirname, 'public/uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve public static files
app.use('/uploads', express.static(uploadsDir));
app.use('/images', express.static(path.resolve(__dirname, 'public/images'), {
  setHeaders: (res, filePath) => {
    // Some Node/Express setups do not know the AVIF MIME type.
    if (filePath.toLowerCase().endsWith('.avif')) res.setHeader('Content-Type', 'image/avif');
  },
}));

// Authentication Middleware
interface AuthenticatedRequest extends Request {
  adminUser?: string;
}

function requireAdminAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const customHeader = req.headers['x-admin-token'] as string;
  let token = customHeader;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication required. Access denied.' });
  }

  const session = validateSession(token);
  if (!session.valid || !session.username) {
    return res.status(401).json({ success: false, message: 'Session expired or invalid. Please sign in again.' });
  }

  req.adminUser = session.username;
  next();
}

// ==========================================
// PUBLIC API ROUTES
// ==========================================

// 1. Get published facility sections (Entrance, Reception, etc.)
app.get('/api/facility', (_req, res) => {
  try {
    const facilities = db.prepare(`
      SELECT id, type, title, description, image_url, display_order, is_published, created_at, updated_at 
      FROM facility_sections 
      WHERE is_published = 1 
      ORDER BY display_order ASC
    `).all();
    return res.json({ success: true, facilities });
  } catch (err: any) {
    console.error('Error fetching facility sections:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve facility sections' });
  }
});

// 2. Get published dynamic gallery items in exact sequence
app.get('/api/gallery', (_req, res) => {
  try {
    const items = db.prepare(`
      SELECT id, category, title, room_number, description, image_url, display_order, is_published, created_at, updated_at 
      FROM gallery_items 
      WHERE is_published = 1 
      ORDER BY display_order ASC
    `).all();
    return res.json({ success: true, items });
  } catch (err: any) {
    console.error('Error fetching gallery items:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve gallery items' });
  }
});

// 3. Get all published rooms (with live availability status, no pricing)
app.get('/api/rooms', (_req, res) => {
  try {
    const rooms = db.prepare(`
      SELECT id, room_number, is_available, status, image_url, room_type, title, description, display_order, is_published, gallery, created_at, updated_at 
      FROM rooms 
      WHERE is_published = 1
      ORDER BY display_order ASC, room_number ASC
    `).all();
    return res.json({ success: true, rooms });
  } catch (err: any) {
    console.error('Error fetching rooms:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve rooms' });
  }
});

// 4. Get public food items (No pricing)
app.get('/api/food', (_req, res) => {
  try {
    const food = db.prepare(`
      SELECT id, name, thumbnail, available_from, available_until, is_available, created_at, updated_at
      FROM food
      ORDER BY created_at DESC
    `).all();
    return res.json({ success: true, food });
  } catch (err: any) {
    console.error('Error fetching food:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve food items' });
  }
});

// 5. Get public hotel settings (WhatsApp number, etc.)
app.get('/api/settings', (_req, res) => {
  try {
    const settings = db.prepare(`
      SELECT id, whatsapp_number, updated_at 
      FROM settings 
      WHERE id = 'general'
    `).get() as { id: string; whatsapp_number: string; updated_at: string } | undefined;

    return res.json({ 
      success: true, 
      settings: settings || { id: 'general', whatsapp_number: '', updated_at: new Date().toISOString() } 
    });
  } catch (err: any) {
    console.error('Error fetching settings:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve settings' });
  }
});

// ==========================================
// ADMIN AUTHENTICATION
// ==========================================

app.post('/api/admin/login', (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password are required' });
    }

    const admin = db.prepare(`
      SELECT id, username, password_hash, salt 
      FROM admin 
      WHERE username = ?
    `).get(String(username).trim()) as { id: number; username: string; password_hash: string; salt: string } | undefined;

    if (!admin) {
      return res.status(401).json({ success: false, message: 'Invalid credentials. Access denied.' });
    }

    const isValid = verifyPassword(String(password), admin.password_hash, admin.salt);
    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Invalid credentials. Access denied.' });
    }

    const token = createSession(admin.username);
    return res.json({
      success: true,
      token,
      admin: {
        username: admin.username,
        role: 'Administrator',
        loginTime: new Date().toISOString()
      }
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error during authentication' });
  }
});

app.post('/api/admin/logout', (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const customHeader = req.headers['x-admin-token'] as string;
    let token = customHeader;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
    if (token) {
      deleteSession(token);
    }
    return res.json({ success: true, message: 'Signed out successfully' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Error signing out' });
  }
});

app.get('/api/admin/me', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
  return res.json({
    success: true,
    admin: {
      username: req.adminUser,
      role: 'Administrator'
    }
  });
});

app.put('/api/admin/password', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword || newPassword.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'Current password and a new password with at least 6 characters are required.' 
      });
    }

    if (!req.adminUser) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const admin = db.prepare(`
      SELECT id, username, password_hash, salt FROM admin WHERE username = ?
    `).get(req.adminUser as string) as { id: number; username: string; password_hash: string; salt: string } | undefined;

    if (!admin || !verifyPassword(currentPassword, admin.password_hash, admin.salt)) {
      return res.status(401).json({ success: false, message: 'Current password incorrect.' });
    }

    const { hash, salt } = hashPassword(newPassword);
    db.prepare(`
      UPDATE admin SET password_hash = ?, salt = ? WHERE username = ?
    `).run(hash, salt, req.adminUser as string);

    return res.json({ success: true, message: 'Password updated successfully.' });
  } catch (err: any) {
    console.error('Password update error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update password' });
  }
});

// ==========================================
// ADMIN FACILITY MANAGEMENT (Entrance & Reception)
// ==========================================

// Get all facility sections
app.get('/api/admin/facility', requireAdminAuth, (_req, res) => {
  try {
    const facilities = db.prepare('SELECT * FROM facility_sections ORDER BY display_order ASC').all();
    return res.json({ success: true, facilities });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Update a facility section (Entrance, Reception)
app.put('/api/admin/facility/:id', requireAdminAuth, (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, image_url, display_order, is_published } = req.body;

    const existing = db.prepare('SELECT * FROM facility_sections WHERE id = ?').get(id) as any;
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Facility section not found' });
    }

    const now = new Date().toISOString();
    const cleanTitle = title !== undefined ? String(title).trim() : existing.title;
    const cleanDesc = description !== undefined ? String(description).trim() : existing.description;
    const cleanImage = image_url !== undefined ? String(image_url).trim() : existing.image_url;
    const cleanOrder = display_order !== undefined ? Number(display_order) : existing.display_order;
    const cleanPublished = is_published !== undefined ? (is_published ? 1 : 0) : existing.is_published;

    db.prepare(`
      UPDATE facility_sections 
      SET title = ?, description = ?, image_url = ?, display_order = ?, is_published = ?, updated_at = ? 
      WHERE id = ?
    `).run(cleanTitle, cleanDesc, cleanImage, cleanOrder, cleanPublished, now, id);

    // Also synchronize corresponding gallery item if matching
    const galId = id === 'entrance' ? 'gal-01-entrance' : id === 'reception' ? 'gal-02-reception' : null;
    if (galId) {
      db.prepare(`
        UPDATE gallery_items 
        SET title = ?, description = ?, image_url = ?, is_published = ?, updated_at = ? 
        WHERE id = ?
      `).run(cleanTitle, cleanDesc, cleanImage, cleanPublished, now, galId);
    }

    const updated = db.prepare('SELECT * FROM facility_sections WHERE id = ?').get(id);
    return res.json({ success: true, facility: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Add new facility section
app.post('/api/admin/facility', requireAdminAuth, (req, res) => {
  try {
    const { id, type, title, description, image_url, display_order, is_published } = req.body;
    if (!title) {
      return res.status(400).json({ success: false, message: 'Title is required' });
    }

    const cleanId = id ? String(id).trim() : `facility-${Date.now()}`;
    const cleanType = type || 'facility';
    const cleanTitle = String(title).trim();
    const cleanDesc = description ? String(description).trim() : '';
    const cleanImage = image_url || '/images/00-entrance.jpg';
    const cleanOrder = display_order ? Number(display_order) : 99;
    const cleanPublished = is_published !== false && is_published !== 0 ? 1 : 0;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO facility_sections (id, type, title, description, image_url, display_order, is_published, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(cleanId, cleanType, cleanTitle, cleanDesc, cleanImage, cleanOrder, cleanPublished, now, now);

    const created = db.prepare('SELECT * FROM facility_sections WHERE id = ?').get(cleanId);
    return res.json({ success: true, facility: created });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Delete a facility section
app.delete('/api/admin/facility/:id', requireAdminAuth, (req, res) => {
  try {
    const { id } = req.params;
    if (id === 'entrance' || id === 'reception') {
      return res.status(400).json({ success: false, message: 'Default entrance and reception sections cannot be deleted, but can be edited or unpublished.' });
    }
    const result = db.prepare('DELETE FROM facility_sections WHERE id = ?').run(id);
    if (result.changes === 0) {
      return res.status(404).json({ success: false, message: 'Facility section not found' });
    }
    return res.json({ success: true, message: 'Facility section deleted successfully' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// ADMIN ROOM MANAGEMENT (Full Dynamic Controls & Live Availability)
// ==========================================

// Get all rooms for admin
app.get('/api/admin/rooms', requireAdminAuth, (_req, res) => {
  try {
    const rooms = db.prepare(`
      SELECT id, room_number, is_available, status, image_url, room_type, title, description, display_order, is_published, gallery, created_at, updated_at 
      FROM rooms 
      ORDER BY display_order ASC, room_number ASC
    `).all();
    return res.json({ success: true, rooms });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Add a new room
app.post('/api/admin/rooms', requireAdminAuth, (req, res) => {
  try {
    const { room_number, room_type, title, description, image_url, status, display_order, is_published, gallery } = req.body;
    if (!room_number || !String(room_number).trim()) {
      return res.status(400).json({ success: false, message: 'Room number is required (e.g. Room 21)' });
    }

    const cleanNum = String(room_number).trim();
    // Check duplicate room number
    const existingNum = db.prepare('SELECT id FROM rooms WHERE room_number = ?').get(cleanNum);
    if (existingNum) {
      return res.status(400).json({ success: false, message: `A room with number "${cleanNum}" already exists.` });
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

    db.prepare(`
      INSERT INTO rooms (id, room_number, is_available, status, image_url, room_type, title, description, display_order, is_published, gallery, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, cleanNum, isAvail, cleanStatus, cleanImage, cleanType, cleanTitle, cleanDesc, cleanOrder, cleanPublished, galleryStr, now, now);

    const created = db.prepare('SELECT * FROM rooms WHERE id = ?').get(id);
    return res.json({ success: true, room: created });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Edit room details
app.put('/api/admin/rooms/:id', requireAdminAuth, (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM rooms WHERE id = ?').get(id) as any;
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    const { room_number, room_type, title, description, image_url, status, display_order, is_published, gallery } = req.body;
    const cleanNum = room_number !== undefined ? String(room_number).trim() : existing.room_number;

    // Check duplicate if room_number changed
    if (cleanNum !== existing.room_number) {
      const dup = db.prepare('SELECT id FROM rooms WHERE room_number = ? AND id != ?').get(cleanNum, id);
      if (dup) {
        return res.status(400).json({ success: false, message: `Room number "${cleanNum}" is already in use by another room.` });
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

    db.prepare(`
      UPDATE rooms 
      SET room_number = ?, room_type = ?, title = ?, description = ?, image_url = ?, status = ?, is_available = ?, display_order = ?, is_published = ?, gallery = ?, updated_at = ?
      WHERE id = ?
    `).run(cleanNum, cleanType, cleanTitle, cleanDesc, cleanImage, cleanStatus, isAvail, cleanOrder, cleanPublished, cleanGallery, now, id);

    const updated = db.prepare('SELECT * FROM rooms WHERE id = ?').get(id);
    return res.json({ success: true, room: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Update individual room availability status (Available, Occupied, Reserved, Maintenance)
app.put('/api/admin/rooms/:id/availability', requireAdminAuth, (req, res) => {
  try {
    const { id } = req.params;
    const { status, is_available } = req.body;

    const current = db.prepare('SELECT id, is_available, status FROM rooms WHERE id = ?').get(id) as any;
    if (!current) {
      return res.status(404).json({ success: false, message: 'Room not found' });
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
    db.prepare(`
      UPDATE rooms 
      SET is_available = ?, status = ?, updated_at = ? 
      WHERE id = ?
    `).run(nextAvail, nextStatus, now, id);

    const updated = db.prepare('SELECT * FROM rooms WHERE id = ?').get(id);
    return res.json({ success: true, room: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Bulk room availability update
app.post('/api/admin/rooms/bulk-availability', requireAdminAuth, (req, res) => {
  try {
    const { status } = req.body; // status can be boolean or 'Available', 'Occupied', 'Reserved', 'Maintenance'
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
    db.prepare(`
      UPDATE rooms 
      SET is_available = ?, status = ?, updated_at = ?
    `).run(targetFlag, targetStatus, now);

    const rooms = db.prepare('SELECT * FROM rooms ORDER BY display_order ASC, room_number ASC').all();
    return res.json({ success: true, rooms });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Delete room
app.delete('/api/admin/rooms/:id', requireAdminAuth, (req, res) => {
  try {
    const { id } = req.params;
    const totalCount = db.prepare('SELECT COUNT(*) as count FROM rooms').get() as { count: number };
    if (totalCount.count <= 1) {
      return res.status(400).json({ success: false, message: 'Cannot delete the only remaining room.' });
    }

    const result = db.prepare('DELETE FROM rooms WHERE id = ?').run(id);
    if (result.changes === 0) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    return res.json({ success: true, message: 'Room removed successfully.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// ADMIN DYNAMIC GALLERY MANAGEMENT
// ==========================================

// Get all gallery items for admin
app.get('/api/admin/gallery', requireAdminAuth, (_req, res) => {
  try {
    const items = db.prepare('SELECT * FROM gallery_items ORDER BY display_order ASC').all();
    return res.json({ success: true, items });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Add gallery item
app.post('/api/admin/gallery', requireAdminAuth, (req, res) => {
  try {
    const { category, title, room_number, description, image_url, display_order, is_published } = req.body;
    if (!title || !image_url) {
      return res.status(400).json({ success: false, message: 'Title and Image URL are required' });
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

    db.prepare(`
      INSERT INTO gallery_items (id, category, title, room_number, description, image_url, display_order, is_published, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, cleanCat, cleanTitle, cleanRoomNum, cleanDesc, cleanImage, cleanOrder, cleanPublished, now, now);

    const created = db.prepare('SELECT * FROM gallery_items WHERE id = ?').get(id);
    return res.json({ success: true, item: created });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Edit gallery item
app.put('/api/admin/gallery/:id', requireAdminAuth, (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM gallery_items WHERE id = ?').get(id) as any;
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Gallery item not found' });
    }

    const { category, title, room_number, description, image_url, display_order, is_published } = req.body;
    const cleanCat = category !== undefined ? String(category).trim() : existing.category;
    const cleanTitle = title !== undefined ? String(title).trim() : existing.title;
    const cleanRoomNum = room_number !== undefined ? (room_number ? String(room_number).trim() : null) : existing.room_number;
    const cleanDesc = description !== undefined ? String(description).trim() : existing.description;
    const cleanImage = image_url !== undefined ? String(image_url).trim() : existing.image_url;
    const cleanOrder = display_order !== undefined ? Number(display_order) : existing.display_order;
    const cleanPublished = is_published !== undefined ? (is_published ? 1 : 0) : existing.is_published;
    const now = new Date().toISOString();

    db.prepare(`
      UPDATE gallery_items 
      SET category = ?, title = ?, room_number = ?, description = ?, image_url = ?, display_order = ?, is_published = ?, updated_at = ?
      WHERE id = ?
    `).run(cleanCat, cleanTitle, cleanRoomNum, cleanDesc, cleanImage, cleanOrder, cleanPublished, now, id);

    const updated = db.prepare('SELECT * FROM gallery_items WHERE id = ?').get(id);
    return res.json({ success: true, item: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Delete gallery item
app.delete('/api/admin/gallery/:id', requireAdminAuth, (req, res) => {
  try {
    const { id } = req.params;
    const result = db.prepare('DELETE FROM gallery_items WHERE id = ?').run(id);
    if (result.changes === 0) {
      return res.status(404).json({ success: false, message: 'Gallery item not found' });
    }
    return res.json({ success: true, message: 'Gallery item removed successfully.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// ADMIN FOOD MANAGEMENT (NO PRICING FIELD!)
// ==========================================

// Get all food items
app.get('/api/admin/food', requireAdminAuth, (_req, res) => {
  try {
    const food = db.prepare(`
      SELECT id, name, thumbnail, available_from, available_until, is_available, created_at, updated_at
      FROM food 
      ORDER BY created_at DESC
    `).all();
    return res.json({ success: true, food });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Add food item
app.post('/api/admin/food', requireAdminAuth, (req, res) => {
  try {
    const { name, thumbnail, available_from, available_until, is_available } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Food item name is required.' });
    }

    const id = `food-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const cleanName = String(name).trim();
    const cleanThumb = thumbnail || '/uploads/img_1791024997069_val5a6.jpeg';
    const cleanFrom = available_from || '12:00 PM';
    const cleanUntil = available_until || '10:00 PM';
    const availableFlag = is_available === false || is_available === 0 ? 0 : 1;

    db.prepare(`
      INSERT INTO food (id, name, thumbnail, available_from, available_until, is_available, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, cleanName, cleanThumb, cleanFrom, cleanUntil, availableFlag, now, now);

    const created = db.prepare('SELECT * FROM food WHERE id = ?').get(id);
    return res.json({ success: true, food: created });
  } catch (err: any) {
    console.error('Error adding food:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Edit food item
app.put('/api/admin/food/:id', requireAdminAuth, (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM food WHERE id = ?').get(id) as any;
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Food item not found.' });
    }

    const { name, thumbnail, available_from, available_until, is_available } = req.body;
    const now = new Date().toISOString();

    const cleanName = name !== undefined ? String(name).trim() : existing.name;
    const cleanThumb = thumbnail !== undefined ? thumbnail : existing.thumbnail;
    const cleanFrom = available_from !== undefined ? available_from : existing.available_from;
    const cleanUntil = available_until !== undefined ? available_until : existing.available_until;
    const availableFlag = is_available !== undefined ? (is_available ? 1 : 0) : existing.is_available;

    db.prepare(`
      UPDATE food 
      SET name = ?, thumbnail = ?, available_from = ?, available_until = ?, is_available = ?, updated_at = ?
      WHERE id = ?
    `).run(cleanName, cleanThumb, cleanFrom, cleanUntil, availableFlag, now, id);

    const updated = db.prepare('SELECT * FROM food WHERE id = ?').get(id);
    return res.json({ success: true, food: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Delete food item
app.delete('/api/admin/food/:id', requireAdminAuth, (req, res) => {
  try {
    const { id } = req.params;
    const result = db.prepare('DELETE FROM food WHERE id = ?').run(id);
    if (result.changes === 0) {
      return res.status(404).json({ success: false, message: 'Food item not found.' });
    }
    return res.json({ success: true, message: 'Food item removed successfully.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// ADMIN IMAGE UPLOAD (Thumbnails)
// ==========================================

app.post('/api/admin/upload', requireAdminAuth, (req, res) => {
  try {
    const { fileName, fileData } = req.body;
    if (!fileData) {
      return res.status(400).json({ success: false, message: 'No file data received' });
    }

    // Validate Base64 payload
    const matches = fileData.match(/^data:image\/([A-Za-z-+]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ success: false, message: 'Invalid image payload format. Only images are permitted.' });
    }

    const mimeSubType = matches[1].toLowerCase();
    const allowedExtensions = ['jpeg', 'jpg', 'png', 'webp', 'gif'];
    const ext = mimeSubType === 'jpeg' ? '.jpg' : `.${mimeSubType}`;

    if (!allowedExtensions.includes(mimeSubType)) {
      return res.status(400).json({ success: false, message: 'Unsupported image format. Allowed: JPG, PNG, WEBP.' });
    }

    const buffer = Buffer.from(matches[2], 'base64');
    // 10MB limit
    if (buffer.length > 10 * 1024 * 1024) {
      return res.status(400).json({ success: false, message: 'File size exceeds maximum 10MB limit.' });
    }

    const safeName = `food_${Date.now()}_${crypto.randomBytes(4).toString('hex')}${ext}`;
    const targetPath = path.join(uploadsDir, safeName);
    fs.writeFileSync(targetPath, buffer);

    return res.json({
      success: true,
      url: `/uploads/${safeName}`,
      fileName: safeName
    });
  } catch (err: any) {
    console.error('Upload error:', err);
    return res.status(500).json({ success: false, message: 'File upload failed: ' + err.message });
  }
});

// ==========================================
// ADMIN SETTINGS (WhatsApp Number)
// ==========================================

app.get('/api/admin/settings', requireAdminAuth, (_req, res) => {
  try {
    const settings = db.prepare(`
      SELECT id, whatsapp_number, updated_at 
      FROM settings 
      WHERE id = 'general'
    `).get();
    return res.json({ success: true, settings });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/admin/settings', requireAdminAuth, (req, res) => {
  try {
    const { whatsapp_number } = req.body;
    const cleanNumber = String(whatsapp_number || '').trim();
    const now = new Date().toISOString();

    db.prepare(`
      UPDATE settings 
      SET whatsapp_number = ?, updated_at = ?
      WHERE id = 'general'
    `).run(cleanNumber, now);

    const updated = db.prepare('SELECT * FROM settings WHERE id = \'general\'').get();
    return res.json({ success: true, settings: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// VITE SPA & STATIC ROUTING
// ==========================================

async function startServer() {
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Grand Travela] Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
