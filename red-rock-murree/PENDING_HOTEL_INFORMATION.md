# Pending hotel information (owner to confirm)

Nothing below is shown on the redesigned public pages until confirmed.
Reply with: **confirmed**, **remove**, or the correct wording.

## Facilities / services that were claimed by the old template but are not supported by any photo or data
- [ ] Free / high-speed Wi-Fi (rooms and public areas)
- [ ] Backup power / generator
- [ ] Climate control / air conditioning / heating
- [ ] Daily housekeeping and fresh linens
- [ ] In-room dining service
- [ ] 24/7 front desk / concierge
- [ ] 24/7 CCTV / surveillance
- [ ] "Complimentary" parking for staying guests
- [ ] Swimming pool, garden, restaurant, outdoor areas (named in your brief; no hotel photos found in the project)

## Room descriptions (all 20 currently contain unverified text)
- [ ] Room type names "Deluxe King Suite" (odd rooms) and "Executive Twin & Double Suite" (even rooms): confirm or give the real names.
- [ ] Descriptions mention: king-size bed, velvet wall paneling, marble flooring, ensuite bath, wardrobe, climate control. Confirm each, or provide the real feature list per room.
- [ ] Only 2 distinct photographs are used for all 20 rooms (odd rooms share one, even rooms share the other). Please supply a photo per room, or tell me which rooms are identical in layout.

## Contact and policy values
- [ ] WhatsApp number stored in the database is `+923001234567` (looks like a placeholder). Set the real number in Admin > Settings.
- [ ] Check-in 2:00 PM and check-out 12:00 PM came from the template.
- [ ] Hotel street address (currently only "Murree, Pakistan" is shown), public email, phone, Google Maps link.

## Data inconsistency (needs a decision, no data was changed)
- [ ] Room 02 and Room 03 have status "Available" but their availability flag is 0 (last changed 2026-10-03). The public site shows "Available". Open Admin > Rooms and set the correct status for both.

## Photography
- [ ] Hero and cinematic layers currently use Murree landscape photos from your existing gallery (`/images/murree.webp`, `/images/featured-image.webp`). Please supply a photo of the hotel exterior, ideally 2400 px wide or larger.
- [ ] Entrance and reception photos are 576x1024 (portrait). Larger originals would look much sharper full-screen.
- [ ] Parking and some scenery images look like stock photos. Confirm they are yours (or that you are fine showing them).

## Logo
- [ ] The logo artwork says "Hotel Red Rock" and is kept unchanged for now. Approve a "Red Rock Murree" version when ready.

---
## Updates in this round

### Room categories and availability (42 rooms)
- [ ] **Suite (2 in 1) count.** You gave Two-Seater 20, Three-Seater 5, Four-Seater 12 and "Suite (2 in 1)" with no number. To reach 42 the Suite count must be **5**, so I used 5. Tell me if it is different (the other numbers and the total would then need adjusting).
- [ ] **Availability numbers (Available / Occupied / Reserved / Under maintenance) have NOT been entered.** I did not invent them. Until you save real numbers in Admin > Category availability, the public section shows the totals and a dash for the four statuses. Each category must add up to its total; the server rejects anything else.
- [ ] The per-room table still has **20 room records** (Room 01-20), because creating 22 more would mean inventing their status. The "Book a specific room" panel therefore lists those 20. Tell me whether to add records for the other 22 rooms (with categories and a status you provide).
- [ ] Category photos (my visual judgment of the four authentic room photos): Two-Seater = double bed, Three-Seater = large bed plus single bed, Four-Seater = two beds with wardrobe, Suite = twin beds with seating area. Please confirm or give the right pairing.

### Reference photos
- [ ] `1.jpg` and `3.jpg` show the same scene (1.jpg is the lower-resolution 1376 px version). Both are in the Viewpoints sequence as you supplied them. Say the word if you want 1.jpg dropped.
- [ ] `reception.jpg` is only 1160 px wide (portrait). Full-screen on a wide monitor it is enlarged about 1.6x and will look softer than the other photos. A wider original would fix it.
- [ ] `entrance.jpg` and `reception.jpg` show the same reception area from two angles, so the Entrance and Reception scenes look alike. Different views would give each its own identity.
- [ ] The church-tower photo is also the opening hero image, so the first and last screens share it. Tell me if you want a different hero.
- [ ] Viewpoint titles (e.g. "Cable Car Over the Valley") only describe what is visible; edit them in `ViewpointsScene.tsx`.

### Earlier open items still pending
- [ ] Real WhatsApp number (the stored one looks like a placeholder).
- [ ] Verified facilities list (Wi-Fi, backup power, climate control, housekeeping, etc.): none are shown on the site.
- [ ] Check-in/check-out times (hidden until confirmed; set `timesConfirmed` in `src/data/hotelData.ts`).
- [ ] Street address, public email, Google Maps link.
- [ ] Rooms 02 and 03 have status "Available" with an availability flag of 0 (Admin > Rooms).
- [ ] The three files in `public/user_images/` are handwritten notebook pages, not hotel photos; they are unused. Delete?
- [ ] Parking photos are small (540 and 597 px wide) and look like stock photos.
