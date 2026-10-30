export interface HotelRoom {
  id: string;
  room_number: string;
  is_available: number | boolean;
  status?: 'Available' | 'Occupied' | 'Reserved' | 'Maintenance' | string;
  image_url: string;
  room_type: string;
  title?: string;
  description?: string;
  display_order?: number;
  is_published?: number | boolean;
  gallery?: string[] | string;
  created_at?: string;
  updated_at?: string;
}

export interface FacilitySection {
  id: string;
  type: 'entrance' | 'reception' | 'facility' | string;
  title: string;
  description: string;
  image_url: string;
  display_order: number;
  is_published: number | boolean;
  created_at?: string;
  updated_at?: string;
}

export interface DynamicGalleryItem {
  id: string;
  category: 'entrance' | 'reception' | 'availability' | 'rooms' | 'facilities' | string;
  title: string;
  room_number?: string | null;
  description: string;
  image_url: string;
  display_order: number;
  is_published: number | boolean;
  created_at?: string;
  updated_at?: string;
}

export interface FoodItem {
  id: string;
  name: string;
  thumbnail: string;
  available_from: string;
  available_until: string;
  is_available: number | boolean;
  created_at?: string;
  updated_at?: string;
}

export interface HotelSettings {
  id?: string;
  whatsapp_number: string;
  updated_at?: string;
}

const TOKEN_KEY = 'grand_travela_admin_token';
const USER_KEY = 'grand_travela_admin_user';

export function getAdminToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function isAdminAuthenticated(): boolean {
  return !!localStorage.getItem(TOKEN_KEY);
}

export function getAdminUser(): { username: string; role: string } | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getAuthHeaders(): HeadersInit {
  const token = getAdminToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    headers['x-admin-token'] = token;
  }
  return headers;
}

// -------------------------------------------------------------
// PUBLIC API CALLS
// -------------------------------------------------------------

export async function fetchFacilities(): Promise<FacilitySection[]> {
  try {
    const res = await fetch('/api/facility');
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.facilities)) {
        return data.facilities;
      }
    }
  } catch (err) {
    console.error('Failed to fetch facility sections:', err);
  }
  return [];
}

export async function fetchGallery(): Promise<DynamicGalleryItem[]> {
  try {
    const res = await fetch('/api/gallery');
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.items)) {
        return data.items;
      }
    }
  } catch (err) {
    console.error('Failed to fetch gallery items:', err);
  }
  return [];
}

export async function fetchRooms(): Promise<HotelRoom[]> {
  try {
    const res = await fetch('/api/rooms');
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.rooms)) {
        return data.rooms;
      }
    }
  } catch (err) {
    console.error('Failed to fetch rooms:', err);
  }
  return [];
}

export async function fetchFood(): Promise<FoodItem[]> {
  try {
    const res = await fetch('/api/food');
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.food)) {
        return data.food;
      }
    }
  } catch (err) {
    console.error('Failed to fetch food:', err);
  }
  return [];
}

export async function fetchSettings(): Promise<HotelSettings> {
  try {
    const res = await fetch('/api/settings');
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.settings) {
        return data.settings;
      }
    }
  } catch (err) {
    console.error('Failed to fetch settings:', err);
  }
  return { whatsapp_number: '' };
}

// -------------------------------------------------------------
// ADMIN AUTHENTICATION
// -------------------------------------------------------------

export async function adminLogin(username: string, password: string): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (res.ok && data.success && data.token) {
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.admin));
      return { success: true };
    }
    return { success: false, message: data.message || 'Invalid credentials' };
  } catch (err: any) {
    return { success: false, message: 'Could not connect to authentication server' };
  }
}

export async function adminLogout(): Promise<void> {
  try {
    await fetch('/api/admin/logout', {
      method: 'POST',
      headers: getAuthHeaders()
    });
  } catch (err) {
    // Ignore error
  } finally {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }
}

export async function changeAdminPassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch('/api/admin/password', {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ currentPassword, newPassword })
    });
    const data = await res.json();
    return { success: res.ok && data.success, message: data.message || (data.success ? 'Password updated' : 'Failed to update') };
  } catch (err: any) {
    return { success: false, message: err.message || 'Network error' };
  }
}

// -------------------------------------------------------------
// ADMIN FACILITY MANAGEMENT (Entrance & Reception)
// -------------------------------------------------------------

export async function fetchAdminFacilities(): Promise<FacilitySection[]> {
  try {
    const res = await fetch('/api/admin/facility', {
      headers: getAuthHeaders()
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.facilities)) {
        return data.facilities;
      }
    }
  } catch (err) {
    console.error('Error fetching admin facilities:', err);
  }
  return [];
}

export async function updateFacility(id: string, updates: Partial<FacilitySection>): Promise<FacilitySection | null> {
  try {
    const res = await fetch(`/api/admin/facility/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(updates)
    });
    const data = await res.json();
    if (res.ok && data.success) {
      return data.facility;
    }
  } catch (err) {
    console.error('Error updating facility section:', err);
  }
  return null;
}

// -------------------------------------------------------------
// ADMIN ROOM MANAGEMENT (Full Dynamic Control & Live Availability)
// -------------------------------------------------------------

export async function fetchAdminRooms(): Promise<HotelRoom[]> {
  try {
    const res = await fetch('/api/admin/rooms', {
      headers: getAuthHeaders()
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.rooms)) {
        return data.rooms;
      }
    }
  } catch (err) {
    console.error('Error fetching admin rooms:', err);
  }
  return [];
}

export async function addRoom(room: Partial<HotelRoom>): Promise<HotelRoom | null> {
  try {
    const res = await fetch('/api/admin/rooms', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(room)
    });
    const data = await res.json();
    if (res.ok && data.success) {
      return data.room;
    }
    throw new Error(data.message || 'Failed to create room');
  } catch (err: any) {
    console.error('Error adding room:', err);
    throw err;
  }
}

export async function updateRoom(id: string, updates: Partial<HotelRoom>): Promise<HotelRoom | null> {
  try {
    const res = await fetch(`/api/admin/rooms/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(updates)
    });
    const data = await res.json();
    if (res.ok && data.success) {
      return data.room;
    }
    throw new Error(data.message || 'Failed to update room');
  } catch (err: any) {
    console.error('Error updating room:', err);
    throw err;
  }
}

export async function deleteRoom(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/admin/rooms/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    const data = await res.json();
    return res.ok && data.success;
  } catch (err) {
    console.error('Error deleting room:', err);
    return false;
  }
}

export async function updateRoomAvailabilityStatus(id: string, status: string): Promise<HotelRoom | null> {
  try {
    const res = await fetch(`/api/admin/rooms/${id}/availability`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      return data.room;
    }
  } catch (err) {
    console.error('Error updating room availability status:', err);
  }
  return null;
}

export async function toggleRoomAvailability(id: string, is_available?: boolean): Promise<HotelRoom | null> {
  try {
    const res = await fetch(`/api/admin/rooms/${id}/availability`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ is_available })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      return data.room;
    }
  } catch (err) {
    console.error('Error toggling room availability:', err);
  }
  return null;
}

export async function setBulkRoomAvailability(status: boolean | string): Promise<HotelRoom[]> {
  try {
    const res = await fetch('/api/admin/rooms/bulk-availability', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      return data.rooms;
    }
  } catch (err) {
    console.error('Error updating bulk room availability:', err);
  }
  return [];
}

// -------------------------------------------------------------
// ADMIN DYNAMIC GALLERY MANAGEMENT
// -------------------------------------------------------------

export async function fetchAdminGallery(): Promise<DynamicGalleryItem[]> {
  try {
    const res = await fetch('/api/admin/gallery', {
      headers: getAuthHeaders()
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.items)) {
        return data.items;
      }
    }
  } catch (err) {
    console.error('Error fetching admin gallery items:', err);
  }
  return [];
}

export async function addGalleryItem(item: Partial<DynamicGalleryItem>): Promise<DynamicGalleryItem | null> {
  try {
    const res = await fetch('/api/admin/gallery', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(item)
    });
    const data = await res.json();
    if (res.ok && data.success) {
      return data.item;
    }
    throw new Error(data.message || 'Failed to add gallery item');
  } catch (err: any) {
    console.error('Error adding gallery item:', err);
    throw err;
  }
}

export async function updateGalleryItem(id: string, updates: Partial<DynamicGalleryItem>): Promise<DynamicGalleryItem | null> {
  try {
    const res = await fetch(`/api/admin/gallery/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(updates)
    });
    const data = await res.json();
    if (res.ok && data.success) {
      return data.item;
    }
    throw new Error(data.message || 'Failed to update gallery item');
  } catch (err: any) {
    console.error('Error updating gallery item:', err);
    throw err;
  }
}

export async function deleteGalleryItem(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/admin/gallery/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    const data = await res.json();
    return res.ok && data.success;
  } catch (err) {
    console.error('Error deleting gallery item:', err);
    return false;
  }
}

// -------------------------------------------------------------
// ADMIN FOOD MANAGEMENT (NO PRICE)
// -------------------------------------------------------------

export async function addFoodItem(food: Omit<FoodItem, 'id'>): Promise<FoodItem | null> {
  try {
    const res = await fetch('/api/admin/food', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(food)
    });
    const data = await res.json();
    if (res.ok && data.success) {
      return data.food;
    }
  } catch (err) {
    console.error('Error adding food:', err);
  }
  return null;
}

export async function updateFoodItem(id: string, updates: Partial<FoodItem>): Promise<FoodItem | null> {
  try {
    const res = await fetch(`/api/admin/food/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(updates)
    });
    const data = await res.json();
    if (res.ok && data.success) {
      return data.food;
    }
  } catch (err) {
    console.error('Error updating food:', err);
  }
  return null;
}

export async function deleteFoodItem(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/admin/food/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    const data = await res.json();
    return res.ok && data.success;
  } catch (err) {
    console.error('Error deleting food:', err);
    return false;
  }
}

export async function uploadThumbnail(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const fileData = reader.result as string;
        const res = await fetch('/api/admin/upload', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            fileName: file.name,
            fileData
          })
        });
        const data = await res.json();
        if (res.ok && data.success && data.url) {
          return resolve(data.url);
        }
        reject(new Error(data.message || 'Image upload failed'));
      } catch (err: any) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Failed reading image file'));
    reader.readAsDataURL(file);
  });
}

// -------------------------------------------------------------
// ADMIN SETTINGS
// -------------------------------------------------------------

export async function updateSettings(settings: { whatsapp_number: string }): Promise<HotelSettings | null> {
  try {
    const res = await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(settings)
    });
    const data = await res.json();
    if (res.ok && data.success) {
      return data.settings;
    }
  } catch (err) {
    console.error('Error updating settings:', err);
  }
  return null;
}

// Helper: Build WhatsApp deep link with room inquiry message
export function buildWhatsAppLink(whatsappNumber: string, roomNumber?: string, isAvailable?: boolean): string {
  const cleanNumber = (whatsappNumber || '').replace(/[^0-9]/g, '');
  
  let message = '';
  if (roomNumber) {
    const statusText = !isAvailable ? 'Not Available' : 'Available';
    message = `Hello, I would like to inquire about booking a room at the hotel.\n\nRoom: ${roomNumber}\nAvailability: ${statusText}\n\nPlease provide me with the booking confirmation details.`;
  } else {
    message = `Hello, I would like to inquire about booking a room at the hotel.\n\nPlease provide me with room availability and booking details.`;
  }

  const encodedMessage = encodeURIComponent(message);
  
  if (!cleanNumber) {
    // If no number configured yet, trigger WhatsApp intent or fallback
    return `https://wa.me/?text=${encodedMessage}`;
  }
  
  return `https://wa.me/${cleanNumber}?text=${encodedMessage}`;
}

export function buildFoodWhatsAppLink(whatsappNumber: string, foodName: string): string {
  const cleanNumber = (whatsappNumber || '').replace(/[^0-9]/g, '');
  const message = `Hello, I would like to inquire about food availability at the hotel.\n\nItem: ${foodName}\n\nPlease let me know if it can be ordered.`;
  const encodedMessage = encodeURIComponent(message);
  if (!cleanNumber) {
    return `https://wa.me/?text=${encodedMessage}`;
  }
  return `https://wa.me/${cleanNumber}?text=${encodedMessage}`;
}

// =============================================================
// ROOM CATALOGUE (Red Rock Hotel — public browsing + admin management)
// =============================================================

export interface RoomListing {
  id: string;
  room_number: string;
  slug: string;
  title: string;
  room_type: string;
  short_description: string;
  description: string;
  price_per_night: number;
  currency: string;
  max_guests: number;
  bed_type: string;
  room_size: string;
  amenities: string[];
  status?: string;
  is_available: number | boolean;
  publish_status: 'draft' | 'published' | 'maintenance' | 'unavailable' | string;
  image_url: string;
  gallery: string[];
  display_order: number;
  is_published?: number | boolean;
  primary_image_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface RoomImageMeta {
  id: string;
  role: 'cover' | 'gallery' | string;
  content_type: string;
  size_bytes?: number;
  display_order: number;
  blob_pathname?: string;
  created_at?: string;
}

export interface RoomFacets {
  categories: string[];
  priceBounds: { min: number; max: number };
  maxGuests: number;
}

export interface RoomQuery {
  category?: string;
  guests?: number | string;
  minPrice?: number | string;
  maxPrice?: number | string;
  availableOnly?: boolean;
  sort?: 'featured' | 'price_asc' | 'price_desc' | 'name_asc' | string;
}

// Payload for the admin room form (camelCase; the server validates everything).
export interface RoomPayload {
  room_number?: string;
  title?: string;
  roomType?: string;
  shortDescription?: string;
  description?: string;
  pricePerNight?: number | string;
  currency?: string;
  maxGuests?: number | string;
  bedType?: string;
  roomSize?: string;
  amenities?: string[];
  status?: string;
  publishStatus?: 'draft' | 'published' | 'maintenance' | 'unavailable';
  is_published?: boolean;
  display_order?: number;
  image_url?: string;
  slug?: string;
}

export function roomImageUrl(imageId?: string | null): string {
  if (!imageId) return '';
  // Draft/room images require authorization for non-public rooms; the token is
  // attached as a query parameter because <img> tags cannot send headers.
  const token = getAdminToken();
  return token ? `/api/room-image/${imageId}?token=${encodeURIComponent(token)}` : `/api/room-image/${imageId}`;
}

// Resolve a stored room image reference for an <img src>. Values are either a
// bundled local path (/images/rooms/*), a direct blob/remote URL, or a private
// delivery ref (/api/room-image/<id>). For private refs we attach the admin
// token when present so draft images render in the dashboard; published-room
// visitors have no token and the route serves them publicly.
export function resolveRoomImageSrc(url?: string | null): string {
  if (!url) return '';
  if (url.startsWith('/api/room-image/')) {
    const token = getAdminToken();
    if (token && !url.includes('token=')) {
      return `${url}${url.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`;
    }
  }
  return url;
}

export async function fetchRoomCatalog(query: RoomQuery = {}): Promise<RoomListing[]> {
  try {
    const params: Record<string, unknown> = {};
    if (query.category) params.category = query.category;
    if (query.guests) params.guests = query.guests;
    if (query.minPrice !== undefined && query.minPrice !== '') params.minPrice = query.minPrice;
    if (query.maxPrice !== undefined && query.maxPrice !== '') params.maxPrice = query.maxPrice;
    if (query.availableOnly) params.availableOnly = '1';
    params.sort = query.sort || 'featured';
    const res = await fetch(`/api/rooms${buildQueryString(params)}`);
    const data = await res.json();
    if (res.ok && data.success) return data.rooms || [];
  } catch (err) {
    console.error('Failed to fetch room catalogue:', err);
    throw err;
  }
  return [];
}

export async function fetchRoomFacets(): Promise<RoomFacets> {
  try {
    const res = await fetch('/api/rooms/facets');
    const data = await res.json();
    if (res.ok && data.success) {
      return { categories: data.categories || [], priceBounds: data.priceBounds || { min: 0, max: 0 }, maxGuests: Number(data.maxGuests || 0) };
    }
  } catch (err) {
    console.error('Failed to fetch room facets:', err);
  }
  return { categories: [], priceBounds: { min: 0, max: 0 }, maxGuests: 0 };
}

export async function fetchRoomBySlug(slug: string): Promise<{ room: RoomListing; images: RoomImageMeta[] } | null> {
  try {
    const res = await fetch(`/api/rooms/${encodeURIComponent(slug)}`);
    if (res.status === 404) return null;
    const data = await res.json();
    if (res.ok && data.success) return { room: data.room, images: data.images || [] };
  } catch (err) {
    console.error('Failed to fetch room detail:', err);
  }
  return null;
}

// ---------- ADMIN ----------

export async function fetchAdminRoom(id: string): Promise<{ room: RoomListing; images: RoomImageMeta[] } | null> {
  try {
    const res = await fetch(`/api/admin/rooms/${id}`, { headers: getAuthHeaders() });
    const data = await res.json();
    if (res.ok && data.success) return { room: data.room, images: data.images || [] };
  } catch (err) {
    console.error('Error fetching admin room:', err);
  }
  return null;
}

export async function addRoomCatalog(payload: RoomPayload): Promise<RoomListing> {
  const res = await fetch('/api/admin/rooms', { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(payload) });
  const data = await res.json();
  if (res.ok && data.success) return data.room;
  throw new Error(data.message || 'Failed to create room');
}

export async function updateRoomCatalog(id: string, payload: Partial<RoomPayload>): Promise<RoomListing> {
  const res = await fetch(`/api/admin/rooms/${id}`, { method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(payload) });
  const data = await res.json();
  if (res.ok && data.success) return data.room;
  throw new Error(data.message || 'Failed to update room');
}

// Upload a room image to the private Blob store (XHR for real progress).
export function uploadRoomImage(
  roomId: string,
  file: File,
  onProgress?: (pct: number) => void
): Promise<RoomImageMeta> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed reading image file'));
    reader.onload = () => {
      const fileData = reader.result as string;
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `/api/admin/rooms/${roomId}/images`);
      const token = getAdminToken();
      xhr.setRequestHeader('Content-Type', 'application/json');
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.setRequestHeader('x-admin-token', token);
      }
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () => {
        let data: any = {};
        try { data = JSON.parse(xhr.responseText); } catch { /* ignore */ }
        if (xhr.status >= 200 && xhr.status < 300 && data.success) {
          resolve(data.image as RoomImageMeta);
        } else {
          reject(new Error(data.message || 'Image upload failed'));
        }
      };
      xhr.onerror = () => reject(new Error('Network error during upload'));
      xhr.send(JSON.stringify({ fileData }));
    };
    reader.readAsDataURL(file);
  });
}

// Reorder gallery images and/or set the primary (cover) image.
export async function manageRoomImages(
  roomId: string,
  opts: { ids?: string[]; primaryId?: string }
): Promise<RoomImageMeta[]> {
  try {
    const res = await fetch(`/api/admin/rooms/${roomId}/images`, {
      method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(opts)
    });
    const data = await res.json();
    if (res.ok && data.success) return data.images || [];
    throw new Error(data.message || 'Failed to update images');
  } catch (err) {
    console.error('Error managing room images:', err);
    throw err;
  }
}

export async function deleteRoomImage(imageId: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/admin/room-images/${imageId}`, { method: 'DELETE', headers: getAuthHeaders() });
    const data = await res.json();
    return res.ok && data.success;
  } catch (err) {
    console.error('Error deleting room image:', err);
    return false;
  }
}

// Safe, insert-only catalogue setup from the bundled thumbnails.
export async function setupRoomCatalog(): Promise<{ created: number; message?: string }> {
  const res = await fetch('/api/admin/rooms/setup-catalog', { method: 'POST', headers: getAuthHeaders() });
  const data = await res.json();
  if (res.ok && data.success) return { created: data.created, message: data.message };
  throw new Error(data.message || 'Catalogue setup failed');
}

// Admin: every room with its catalogue fields (drafts included). The server
// returns the full room DTO, so this shares the RoomListing shape.
export async function fetchAdminRoomCatalog(): Promise<RoomListing[]> {
  try {
    const res = await fetch('/api/admin/rooms', { headers: getAuthHeaders() });
    const data = await res.json();
    if (res.ok && data.success && Array.isArray(data.rooms)) return data.rooms;
  } catch (err) {
    console.error('Error fetching admin room catalogue:', err);
  }
  return [];
}

// Promote one bundled thumbnail (/images/rooms/hotel_room_NN.jpg) into the
// room's gallery. Only fills a placeholder cover; never overwrites a real photo.
export async function attachBundledRoomImage(roomId: string, imageNum: number | string): Promise<RoomListing> {
  const res = await fetch(`/api/admin/rooms/${roomId}/attach-bundled-image`, {
    method: 'POST', headers: getAuthHeaders(), body: JSON.stringify({ imageNum })
  });
  const data = await res.json();
  if (res.ok && data.success) return data.room;
  throw new Error(data.message || 'Failed to attach bundled image');
}

// =============================================================
// WEBSITE WALKTHROUGH (admin-written)
// =============================================================

export interface Walkthrough {
  id: string;
  title: string;
  intro: string;
  status: 'draft' | 'published' | string;
  created_at?: string;
  updated_at?: string;
  section_count?: number;
}

export interface WalkthroughSection {
  id: string;
  walkthrough_id?: string;
  heading: string;
  body: string;
  image_ref: string;
  caption: string;
  video_url: string;
  display_order: number;
}

export interface PublishedWalkthrough {
  walkthrough: Walkthrough;
  sections: WalkthroughSection[];
}

// Public: returns null when no walkthrough has been published. The old
// hardcoded walkthrough content is intentionally NOT used as a fallback.
export async function fetchPublishedWalkthrough(): Promise<PublishedWalkthrough | null> {
  try {
    const res = await fetch('/api/walkthrough');
    const data = await res.json();
    if (res.ok && data.success && data.walkthrough) {
      return { walkthrough: data.walkthrough, sections: data.sections || [] };
    }
  } catch (err) {
    console.error('Failed to fetch walkthrough:', err);
  }
  return null;
}

export async function fetchAdminWalkthroughs(): Promise<Walkthrough[]> {
  try {
    const res = await fetch('/api/admin/walkthroughs', { headers: getAuthHeaders() });
    const data = await res.json();
    if (res.ok && data.success) return data.walkthroughs || [];
  } catch (err) {
    console.error('Error fetching walkthroughs:', err);
  }
  return [];
}

export async function fetchAdminWalkthrough(id: string): Promise<PublishedWalkthrough | null> {
  try {
    const res = await fetch(`/api/admin/walkthroughs/${id}`, { headers: getAuthHeaders() });
    const data = await res.json();
    if (res.ok && data.success && data.walkthrough) return { walkthrough: data.walkthrough, sections: data.sections || [] };
  } catch (err) {
    console.error('Error fetching walkthrough detail:', err);
  }
  return null;
}

export async function createWalkthrough(title: string, intro?: string): Promise<Walkthrough> {
  const res = await fetch('/api/admin/walkthroughs', { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify({ title, intro }) });
  const data = await res.json();
  if (res.ok && data.success) return data.walkthrough;
  throw new Error(data.message || 'Failed to create walkthrough');
}

export async function updateWalkthrough(id: string, payload: { title?: string; intro?: string }): Promise<Walkthrough> {
  const res = await fetch(`/api/admin/walkthroughs/${id}`, { method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(payload) });
  const data = await res.json();
  if (res.ok && data.success) return data.walkthrough;
  throw new Error(data.message || 'Failed to update walkthrough');
}

export async function publishWalkthrough(id: string): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await fetch(`/api/admin/walkthroughs/${id}/publish`, { method: 'POST', headers: getAuthHeaders() });
    const data = await res.json();
    return { success: res.ok && data.success, message: data.message };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Publish failed' };
  }
}

export async function unpublishWalkthrough(id: string): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await fetch(`/api/admin/walkthroughs/${id}/unpublish`, { method: 'POST', headers: getAuthHeaders() });
    const data = await res.json();
    return { success: res.ok && data.success, message: data.message };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Unpublish failed' };
  }
}

export async function deleteWalkthrough(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/admin/walkthroughs/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
    const data = await res.json();
    return res.ok && data.success;
  } catch (err) {
    console.error('Error deleting walkthrough:', err);
    return false;
  }
}

export async function addWalkthroughSection(
  walkthroughId: string,
  section: { heading: string; body?: string; imageRef?: string; caption?: string; videoUrl?: string }
): Promise<WalkthroughSection> {
  const res = await fetch(`/api/admin/walkthroughs/${walkthroughId}/sections`, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(section) });
  const data = await res.json();
  if (res.ok && data.success) return data.section;
  throw new Error(data.message || 'Failed to add section');
}

export async function updateWalkthroughSection(
  sectionId: string,
  updates: { heading?: string; body?: string; imageRef?: string; caption?: string; videoUrl?: string; displayOrder?: number }
): Promise<WalkthroughSection> {
  const res = await fetch(`/api/admin/sections/${sectionId}`, { method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(updates) });
  const data = await res.json();
  if (res.ok && data.success) return data.section;
  throw new Error(data.message || 'Failed to update section');
}

export async function deleteWalkthroughSection(sectionId: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/admin/sections/${sectionId}`, { method: 'DELETE', headers: getAuthHeaders() });
    const data = await res.json();
    return res.ok && data.success;
  } catch (err) {
    console.error('Error deleting walkthrough section:', err);
    return false;
  }
}

export async function reorderWalkthroughSections(walkthroughId: string, ids: string[]): Promise<WalkthroughSection[]> {
  try {
    const res = await fetch(`/api/admin/walkthroughs/${walkthroughId}/sections/reorder`, { method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify({ ids }) });
    const data = await res.json();
    if (res.ok && data.success) return data.sections || [];
  } catch (err) {
    console.error('Error reordering walkthrough sections:', err);
  }
  return [];
}

// Upload a walkthrough image to the private Blob store; returns the
// authorized delivery reference (never the raw blob URL).
export async function uploadWalkthroughImage(file: File): Promise<{ id: string; ref: string }> {
  const fileData = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed reading image file'));
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });
  const res = await fetch('/api/admin/walkthrough-images', { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify({ fileData }) });
  const data = await res.json();
  if (res.ok && data.success) return data.image;
  throw new Error(data.message || 'Image upload failed');
}

// =============================================================
// HOTEL LISTINGS (public directory + admin management + images)
// =============================================================

export interface HotelListing {
  id: string;
  name: string;
  slug: string;
  short_description: string;
  description: string;
  category: string;
  star_rating: number;
  country: string;
  city: string;
  area: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  price_per_night: number;
  currency: string;
  discount_price: number | null;
  facilities: string[];
  contact_phone: string;
  contact_email: string;
  website: string;
  status: 'draft' | 'published' | 'archived' | string;
  created_at: string;
  updated_at: string;
  cover_image_id?: string | null;
  image_count?: number;
}

export interface HotelImage {
  id: string;
  role: 'cover' | 'gallery' | string;
  content_type: string;
  size_bytes?: number;
  display_order: number;
  blob_pathname?: string;
  created_at?: string;
}

export interface HotelPagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface HotelQuery {
  q?: string;
  city?: string;
  category?: string;
  facility?: string;
  minPrice?: number | string;
  maxPrice?: number | string;
  sort?: 'price_asc' | 'price_desc' | 'name_asc' | 'newest' | string;
  page?: number;
  pageSize?: number;
}

export interface HotelPayload {
  name: string;
  shortDescription?: string;
  description?: string;
  category?: string;
  starRating?: number;
  country?: string;
  city?: string;
  area?: string;
  address?: string;
  latitude?: number | null;
  longitude?: number | null;
  pricePerNight: number | string;
  currency?: string;
  discountPrice?: number | null;
  facilities?: string[];
  contactPhone?: string;
  contactEmail?: string;
  website?: string;
}

function buildQueryString(params: Record<string, unknown>): string {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') usp.set(k, String(v));
  }
  const s = usp.toString();
  return s ? `?${s}` : '';
}

// Private-image delivery endpoint. The browser never sees the raw Blob URL.
export function hotelImageUrl(imageId?: string | null): string {
  return imageId ? `/api/hotel-image/${imageId}` : '';
}

// ---------- PUBLIC ----------

export async function fetchHotels(query: HotelQuery = {}): Promise<{ hotels: HotelListing[]; pagination: HotelPagination }> {
  try {
    const res = await fetch(`/api/hotels${buildQueryString(query as Record<string, unknown>)}`);
    const data = await res.json();
    if (res.ok && data.success) {
      return { hotels: data.hotels || [], pagination: data.pagination || { page: 1, pageSize: 12, total: 0, totalPages: 1 } };
    }
  } catch (err) {
    console.error('Failed to fetch hotels:', err);
    throw err;
  }
  return { hotels: [], pagination: { page: 1, pageSize: 12, total: 0, totalPages: 1 } };
}

export async function fetchHotelFacets(): Promise<{ cities: string[]; categories: string[]; priceBounds: { min: number; max: number } }> {
  try {
    const res = await fetch('/api/hotels/facets');
    const data = await res.json();
    if (res.ok && data.success) {
      return { cities: data.cities || [], categories: data.categories || [], priceBounds: data.priceBounds || { min: 0, max: 0 } };
    }
  } catch (err) {
    console.error('Failed to fetch hotel facets:', err);
  }
  return { cities: [], categories: [], priceBounds: { min: 0, max: 0 } };
}

export async function fetchHotelBySlug(slug: string): Promise<{ hotel: HotelListing; images: HotelImage[] } | null> {
  try {
    const res = await fetch(`/api/hotels/${encodeURIComponent(slug)}`);
    if (res.status === 404) return null;
    const data = await res.json();
    if (res.ok && data.success) return { hotel: data.hotel, images: data.images || [] };
  } catch (err) {
    console.error('Failed to fetch hotel detail:', err);
  }
  return null;
}

export async function fetchRelatedHotels(slug: string): Promise<HotelListing[]> {
  try {
    const res = await fetch(`/api/hotels/${encodeURIComponent(slug)}/related`);
    const data = await res.json();
    if (res.ok && data.success) return data.hotels || [];
  } catch (err) {
    console.error('Failed to fetch related hotels:', err);
  }
  return [];
}

// ---------- ADMIN ----------

export async function fetchAdminHotels(query: HotelQuery & { status?: string } = {}): Promise<{ hotels: HotelListing[]; pagination: HotelPagination }> {
  try {
    const res = await fetch(`/api/admin/hotels${buildQueryString(query as Record<string, unknown>)}`, { headers: getAuthHeaders() });
    const data = await res.json();
    if (res.ok && data.success) {
      return { hotels: data.hotels || [], pagination: data.pagination || { page: 1, pageSize: 20, total: 0, totalPages: 1 } };
    }
    throw new Error(data.message || 'Failed to load hotels');
  } catch (err) {
    console.error('Error fetching admin hotels:', err);
    throw err;
  }
}

export async function fetchAdminHotel(id: string): Promise<{ hotel: HotelListing; images: HotelImage[] } | null> {
  try {
    const res = await fetch(`/api/admin/hotels/${id}`, { headers: getAuthHeaders() });
    const data = await res.json();
    if (res.ok && data.success) return { hotel: data.hotel, images: data.images || [] };
  } catch (err) {
    console.error('Error fetching admin hotel:', err);
  }
  return null;
}

export async function addHotel(payload: HotelPayload): Promise<HotelListing> {
  const res = await fetch('/api/admin/hotels', { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(payload) });
  const data = await res.json();
  if (res.ok && data.success) return data.hotel;
  throw new Error(data.message || 'Failed to create hotel');
}

export async function updateHotel(id: string, payload: Partial<HotelPayload>): Promise<HotelListing> {
  const res = await fetch(`/api/admin/hotels/${id}`, { method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(payload) });
  const data = await res.json();
  if (res.ok && data.success) return data.hotel;
  throw new Error(data.message || 'Failed to update hotel');
}

async function hotelStatusAction(id: string, action: 'publish' | 'unpublish' | 'archive'): Promise<{ success: boolean; message?: string; hotel?: HotelListing }> {
  try {
    const res = await fetch(`/api/admin/hotels/${id}/${action}`, { method: 'POST', headers: getAuthHeaders() });
    const data = await res.json();
    return { success: res.ok && data.success, message: data.message, hotel: data.hotel };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Action failed' };
  }
}

export const publishHotel = (id: string) => hotelStatusAction(id, 'publish');
export const unpublishHotel = (id: string) => hotelStatusAction(id, 'unpublish');
export const archiveHotel = (id: string) => hotelStatusAction(id, 'archive');

export async function deleteHotel(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/admin/hotels/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
    const data = await res.json();
    return res.ok && data.success;
  } catch (err) {
    console.error('Error deleting hotel:', err);
    return false;
  }
}

// Upload a hotel image via XMLHttpRequest so real upload progress is available.
export function uploadHotelImage(
  hotelId: string,
  file: File,
  role: 'cover' | 'gallery',
  onProgress?: (pct: number) => void
): Promise<HotelImage> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed reading image file'));
    reader.onload = () => {
      const fileData = reader.result as string;
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `/api/admin/hotels/${hotelId}/images`);
      const token = getAdminToken();
      xhr.setRequestHeader('Content-Type', 'application/json');
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.setRequestHeader('x-admin-token', token);
      }
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () => {
        let data: any = {};
        try { data = JSON.parse(xhr.responseText); } catch { /* ignore */ }
        if (xhr.status >= 200 && xhr.status < 300 && data.success) {
          resolve(data.image as HotelImage);
        } else {
          reject(new Error(data.message || 'Image upload failed'));
        }
      };
      xhr.onerror = () => reject(new Error('Network error during upload'));
      xhr.send(JSON.stringify({ fileData, role }));
    };
    reader.readAsDataURL(file);
  });
}

export async function reorderHotelImages(hotelId: string, ids: string[]): Promise<HotelImage[]> {
  try {
    const res = await fetch(`/api/admin/hotels/${hotelId}/images/reorder`, {
      method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify({ ids })
    });
    const data = await res.json();
    if (res.ok && data.success) return data.images || [];
  } catch (err) {
    console.error('Error reordering hotel images:', err);
  }
  return [];
}

export async function deleteHotelImage(imageId: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/admin/hotels/images/${imageId}`, { method: 'DELETE', headers: getAuthHeaders() });
    const data = await res.json();
    return res.ok && data.success;
  } catch (err) {
    console.error('Error deleting hotel image:', err);
    return false;
  }
}
