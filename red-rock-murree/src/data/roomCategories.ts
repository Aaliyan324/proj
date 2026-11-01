/**
 * Public room categories. This is a SUMMARY layer, separate from the per-room `rooms` table.
 * Owner-confirmed distribution of the hotel's 42 rooms (order is fixed):
 *   Two-Seater 20, Three-Seater 5, Four-Seater 12, Suite (2 in 1) 5.
 * The same totals live on the server (server/db.ts ROOM_CATEGORY_DEFS); the server is the source of truth for
 * availability numbers, this file only supplies names, photographs and the offline fallback.
 *
 * Photographs: the four distinct authentic room photos in /public/images (no stock, no generated images).
 */
export const ROOM_CATEGORIES = [
  { key: 'two-seater', name: 'Two-Seater Rooms', short: 'Two-Seater', total: 20, image: '/images/02-room-01.jpg', alt: 'A Two-Seater room at Red Rock Murree with a double bed' },
  { key: 'three-seater', name: 'Three-Seater Rooms', short: 'Three-Seater', total: 5, image: '/images/room_suite_entry.jpg', alt: 'A Three-Seater room at Red Rock Murree with a large bed and a single bed' },
  { key: 'four-seater', name: 'Four-Seater Rooms', short: 'Four-Seater', total: 12, image: '/images/03-room-02.jpg', alt: 'A Four-Seater room at Red Rock Murree with two beds and a wardrobe' },
  { key: 'suite', name: 'Suite (2 in 1)', short: 'Suite', total: 5, image: '/images/room_suite_lounge.jpg', alt: 'A Suite at Red Rock Murree with twin beds and a seating area' },
] as const;

/** Single source for every place the total is displayed. */
export const TOTAL_ROOMS: number = ROOM_CATEGORIES.reduce((n, c) => n + c.total, 0);
if (TOTAL_ROOMS !== 42) console.error(`Room categories add up to ${TOTAL_ROOMS}, expected 42.`);
