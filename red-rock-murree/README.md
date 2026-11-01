# Red Rock Murree

React 19 + Vite 8 + Tailwind 4 front end, Express + SQLite back end.
Motion: GSAP (ScrollTrigger) + Lenis smooth scroll + Motion for interface animation.

## Run locally (Node 22.13+ because the server uses `node:sqlite`)

```bash
npm install
npm run dev          # http://localhost:3000
```

Production:

```bash
npm run build
npm start   # serves ./dist
```

Other port: `PORT=4000 npm run dev`.

## Administrator

Administrator accounts are created and managed from the command line only; the website never creates one and never displays login details.

```bash
npm run admin:create   -- <username> <password>   # new administrator (password: 10+ characters)
npm run admin:password -- <username> <new password>
```

Sign in at `/admin/login`.

## Data

- SQLite database: `data/hotel.db` (+ `-wal`/`-shm` files; keep them together when copying).
- Uploads: `public/uploads/`.
- A pre-redesign backup of the database is in `backups/pre-redesign-2026-10-31/data/`.
- Room categories (42 rooms): Two-Seater 20, Three-Seater 5, Four-Seater 12, Suite (2 in 1) 5. The availability numbers shown on the website are edited in Admin > Category availability; the four counts of a category must add up to its total.
- Booking: inquiries go to the WhatsApp number set in the admin dashboard. Payment is cash at the hotel. There is no online payment.

## Pending owner confirmation

See `PENDING_HOTEL_INFORMATION.md`.
