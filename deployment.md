# Grand Travela Hotel & Resort — Production Deployment Guide

This guide is specific to **this repository**: a Vite + React 19 SPA served by an
Express API (`server.ts`) that stores all data in **Neon PostgreSQL**
(`server/db.ts`, `@neondatabase/serverless`) and deploys to **Vercel** via a
single serverless function (`api/index.ts` + `vercel.json`).

It covers migrating the legacy local SQLite database (`data/hotel.db`) to Neon,
upload storage in the database, environment variables, and go-live verification.

---

## A. Prerequisites

| Requirement | Details |
|---|---|
| Node.js | **v22.5 or newer** (the legacy-data migration script reads `data/hotel.db` with the built-in `node:sqlite`; the server itself only needs an async PG driver and runs on Vercel's Node 22 runtime) |
| Package manager | npm (lockfile: `package-lock.json`) |
| Accounts | GitHub, [Neon](https://console.neon.tech) (Free tier works), [Vercel](https://vercel.com) (Hobby plan works) |
| Services | Neon (required) and **Vercel Blob** (required only for the *Hotel Listings* feature). Legacy images — rooms, food, gallery — remain stored as `BYTEA` rows in Neon (`uploaded_files`). New hotel cover/gallery images are stored in a **private** Vercel Blob store and delivered through an authorization proxy; nothing else on the site needs Blob, so the rest of the app runs fine without it |
| Blob runtime | The `@vercel/blob` SDK only talks to Blob when `BLOB_READ_WRITE_TOKEN` (or Vercel OIDC + `BLOB_STORE_ID`) is present. Hotel image routes return a clear `503` when it is unset — the token is server-only and never reaches the browser |

Plan limits worth knowing (documented, not required to buy your way around):

- **Vercel Hobby**: serverless functions limited to ~10s runtime and 4.5 MB
  request/response body. The admin upload route accepts images up to 10 MB —
  over Vercel, keep single uploads under ~3 MB (base64 JSON inflates payloads
  ~33%). Everything else on the site fits comfortably.
- **Neon Free**: 512 MB storage total. Stored uploads count toward it; watch usage
  in the Neon dashboard if you upload many large images.

## B. Local Setup

```bash
# 1. Install dependencies
npm install

# 2. Create your environment file (never commit it — .gitignore already excludes .env*)
copy .env.example .env        # Windows
# cp .env.example .env        # macOS/Linux

# 3. Put your Neon pooled connection string into .env:
#    DATABASE_URL=postgres://...ep-xxx-pooler.neon.tech/neondb?sslmode=require
#    (Only needed for Hotel Listings image upload/delivery) add your private
#    Blob token — see section C2. It is server-only; never a NEXT_PUBLIC_/client var:
#    BLOB_READ_WRITE_TOKEN=blob_rw_...

# 4. Apply the schema (idempotent, non-destructive — CREATE TABLE IF NOT EXISTS)
npm run db:migrate

# 5. (Development database only) seed baseline content:
#    20 rooms, entrance/reception sections, gallery, default admin, settings.
#    Additive only — it never overwrites existing rows.
npm run db:seed

# 6. Run the dev server (Express + Vite middleware, http://localhost:3000)
npm run dev

# 7. Type-check and production build
npm run lint
npm run build
npm run start        # serves dist/ + API at http://localhost:3000
```

Default admin after `db:seed`: username `admin`, password `admin123`
(override with `ADMIN_DEFAULT_PASSWORD=... npm run db:seed`). **Change it from
the dashboard immediately** — the password is stored with bcrypt.

## C. Neon Database Setup

1. **Create a project**: Neon console → *New Project* → name `grand-travela`,
   pick a region close to your users (Vercel functions connect over TLS, region
   mainly affects latency).
2. Neon creates a `neondb` database with a `default` branch. Use the
   **production** branch for live data; feel free to create separate branches
   for staging.
3. **Pooled connection string** (Connection Details → *Pooled* tab, endpoint
   contains `-pooler`): this is what the app uses for all queries — it is
   designed for serverless functions that open and close connections per
   invocation. Set it as `DATABASE_URL`.
4. **Direct connection string** (*Non-pooled*): optional here; set as
   `DIRECT_URL` only if you later add a real migration tool (Prisma/Drizzle)
   that must run DDL outside the pooler.
5. Configure variables:
   - Local: `.env` (gitignored).
   - Vercel: Project → Settings → Environment Variables → `DATABASE_URL`
     (Production, Preview, Development). **Never** commit real strings here.
6. **Apply schema**: run `npm run db:migrate` locally with `DATABASE_URL`
   pointed at the target database. It is safe to re-run: only
   `CREATE TABLE/INDEX IF NOT EXISTS` statements are issued. It never drops,
   truncates, or updates anything.
7. **Migrate the old SQLite data** (one-time, additive):
   ```bash
   npm run db:migrate
   ```
   The script detects `data/hotel.db`, opens it read-only, and copies
   `admin, rooms, facility_sections, gallery_items, food, settings, sessions`
   and `public/uploads/*` files into Neon using
   `INSERT ... ON CONFLICT DO NOTHING` — existing Neon rows always win.
   It prints how many rows were inserted per table.
8. **Verify connectivity** (any SQL client, or the Neon SQL Editor):
   ```sql
   SELECT COUNT(*) FROM rooms;            -- expect 20 on a fresh seeded DB
   SELECT username FROM admin;            -- expect 'admin'
   SELECT id, whatsapp_number FROM settings WHERE id = 'general';
   ```
9. **Troubleshooting connections**:
   - `database "neondb" does not exist` → you created a custom database name;
     use the exact string from the Connection Details page.
   - `timeout expired` → wrong endpoint or offline; pooled endpoint must end
     in `.pooler-xxx.neon-secure.com` / contain `-pooler`.
   - Auth failure after rotating a password → update `DATABASE_URL` **and
     redeploy** (see E8).

## C2. Vercel Blob (Hotel Listing Images — private store)

The *Hotel Listings* feature stores cover/gallery images in a **private** Vercel
Blob store. This is optional for the rest of the site but required before any
hotel image upload or delivery can be tested. The design keeps the raw blob
URLs private: the browser only ever requests `/api/hotel-image/:id`, an
authorization proxy that fetches the private blob server-side.

1. **Create a private Blob store**: Vercel Dashboard → your Project →
   *Storage* → *Blob* → *Create a Blob store*. Choose **Private** access
   (never Public for this feature). Connect it to the same project you deploy.
2. **Get the read/write token**: the store page shows a `BLOB_READ_WRITE_TOKEN`
   that begins with `blob_rw_`. This value grants upload + private-read + delete,
   so treat it like a password.
3. **Local environment** — either paste the token into `.env` as
   `BLOB_READ_WRITE_TOKEN=` (gitignored), or, once the store is linked to the
   project, pull all Vercel env automatically:
   ```bash
   npm i -g vercel      # once
   vercel login
   vercel env pull .env # writes real values into a local .env
   ```
   The repo ships only a `BLOB_READ_WRITE_TOKEN=` placeholder in `.env.example`.
4. **Vercel environment**: adding the store via *Storage → Blob* usually links
   the token automatically for deployed functions (via OIDC). If you manage it
   manually, add `BLOB_READ_WRITE_TOKEN` under *Settings → Environment
   Variables* for Production, Preview and Development, then **redeploy** (E8).
5. **No schema/DDL is needed for Blob** — Postgres only stores the stable
   `blob_url` / `blob_pathname` (in `hotel_images`), never binary and never a
   temporary signed URL. The `hotels` / `hotel_images` tables are created by the
   same idempotent `ensureSchema()` / `npm run db:migrate` as everything else.

Upload validation enforced server-side: content type is detected from the file's
magic bytes (JPEG/PNG/WebP/AVIF), max 10 MB per image, and storage paths are
random (`hotel-images/<year>/<uuid>.<ext>`) — the client filename is never
trusted. On Vercel Hobby keep single uploads under ~3 MB (base64 JSON + the
4.5 MB function body limit; see G).

## D. GitHub Setup

This project directory may or may not already be a Git repository:

```bash
git status                # if it errors, initialize:
git init
git add .
git commit -m "Migrate to Neon PostgreSQL, prepare for Vercel, add GSAP/Lenis motion"
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```

Safety rules already enforced by this repo's `.gitignore`:
`node_modules/`, `dist/`, `.env*` (except `.env.example`), `data/` stays out if
you choose (SQLite file contains live data — it is gitignored by
`*.db`-capable patterns only if you add one; consider adding `data/` before
your first commit if it holds real records). **Do not force-push and do not
rewrite history you have already shared.**

## E. Vercel Deployment

1. Push to GitHub, then vercel.com → *Add New… → Project* → import the repo.
2. Framework preset: **Vite**. The included `vercel.json` already sets
   `buildCommand: npm run build` and `outputDirectory: dist` — accept the
   defaults it detects.
3. Build settings: no overrides needed. Root directory = repo root
   (where `package.json` and `api/` live).
4. Environment Variables: add `DATABASE_URL` (Neon **pooled** string) for
   Production and Preview. For the Hotel Listings feature also make the private
   Blob store's `BLOB_READ_WRITE_TOKEN` available (auto-linked via *Storage →
   Blob* (OIDC), or add it explicitly — see C2). `PORT`/`DIRECT_URL` are not
   needed on Vercel.
5. Click **Deploy**. One serverless function is created (`api/index`) — all
   `/api/*` and `/uploads/*` requests route to it; everything else is served
   as static files from `dist/` with an SPA fallback (deep links like
   `/admin/login` work).
6. Verify the build log shows: Vite build success + "Building functions: api/index".
7. Test the deployed app (see F).
8. **After changing any environment variable, redeploy** — values are baked
   into function instances at deploy time:
   Vercel Dashboard → Projects → Grand Travela → *Deployments* → latest →
   **⋯ → Redeploy**.

Re-deploys after each `git push` happen automatically once the repo is linked.

## F. Production Verification Checklist

Only the features that exist in this project:

- [ ] Homepage loads: hero carousel rotates, sections render, smooth scrolling works.
- [ ] Navbar links scroll to the right sections (`#entrance` … `#contact`); active indicator follows scroll position.
- [ ] `GET /api/rooms` returns JSON with published rooms; `GET /api/facility`, `/api/gallery`, `/api/food`, `/api/settings` return data.
- [ ] Admin login at `/admin/login` works; wrong credentials are rejected; session survives reload; logout invalidates the token (re-use of the old token must fail).
- [ ] Admin dashboard: create / edit / delete a test room; toggle availability; bulk availability; changes persist after redeploy (proves Neon, not memory).
- [ ] Gallery + facility CRUD in the dashboard persists.
- [ ] Dining CRUD persists; image upload stores the file in Neon and `/uploads/<name>` serves it (works in production where disk is read-only).
- [ ] WhatsApp number setting updates and is reflected on the public site booking buttons.
- [ ] Password change works and re-login with the new password succeeds (bcrypt).
- [ ] **Hotel Listings (public)**: `/hotels` loads only `published` listings; server-side search / city / price / category / facility filters, sort and pagination change the results; unknown `/hotels/:slug` shows the not-found state; cover images render via `/api/hotel-image/:id`.
- [ ] **Hotel Listings (admin)**: create a draft, upload a cover + gallery images (progress + preview shown), reorder, remove; Publish is blocked until required fields + a cover exist; publishing then makes it appear publicly, unpublishing hides it again. Confirm-before-delete works.
- [ ] **Private delivery / authz**: a draft or archived listing's image returns **403** to an anonymous visitor and renders for a logged-in admin; a published listing's image is public. The raw `blobs.vercel-storage.com` URL is never present in page HTML or client JS. Deleting a listing removes only image blobs not referenced elsewhere.
- [ ] Responsive: 1440px, 768px, 390px widths; side-menu panel opens/closes; modals fit.
- [ ] Browser console: no errors on any public page.
- [ ] Vercel → Observability → Logs: no unhandled function errors.
- [ ] Enable OS "reduce motion" setting: page still fully usable, no animations, native scrolling.

## G. Troubleshooting

| Symptom | Cause / Fix |
|---|---|
| Build fails: `Type error ...` | Run `npm run lint` locally and fix before pushing. |
| Deployed site shows `{"message":"Database unavailable..."}` | `DATABASE_URL` missing in Vercel env or not redeployed after adding it (E8). |
| `function_invocation_error` + `fetch failed` in logs | Neon project asleep (Free tier auto-suspend) or wrong endpoint; open Neon console, wake the branch, verify the pooled string. |
| Upload fails with 413 on Vercel | Request body over Vercel's 4.5 MB function limit — compress the image before uploading (Hobby plan cannot raise this). |
| `npm run db:migrate` says nothing about SQLite rows | `data/hotel.db` not found at repo root — run it from the machine that still has the legacy file, or point `--` no flags exist; copy the folder over first. |
| Legacy admin login fails after migration | The old scrypt hash is migrated as-is and still works; if you reset the DB, reseed (`db:seed`) or create a new admin row via the app's password-change flow. |
| Migrations/DDL blocked through the pooler | Use the **direct** connection: `DIRECT_URL=... npm run db:migrate` (the script prefers `DIRECT_URL`). |
| 500 on `/api/*` only in production, fine locally | Usually a stale environment variable — redeploy. Then check Vercel logs for the exact Postgres error. |
| SPA deep link (`/admin/login`) shows 404 | Confirm `vercel.json` rewrites were deployed (they're required for this non-Next.js setup). |
| Animations not visible | Expected with `prefers-reduced-motion`; content is intentionally visible without motion. |
| Hotel image upload returns `503` / "Blob is not configured" | `BLOB_READ_WRITE_TOKEN` (or OIDC + `BLOB_STORE_ID`) is missing in that environment. Link the private Blob store to the project or add the env var, then redeploy (E8). Non-hotel features are unaffected. |
| Hotel upload fails with `400` "Unsupported image format" | The file's magic bytes are not JPEG/PNG/WebP/AVIF (the declared type is ignored on purpose). Re-export a supported image. |
| Uploaded hotel image shows a broken `<img>` | The proxy fetches the private blob server-side; a `404` means the blob is gone, a `403` means the listing is draft/archived and you are not admin-authenticated, a `502` means Blob was briefly unreachable. Check Vercel logs for the `[HotelImage]` line. |
| Draft/archived hotel image is (or is not) visible to the public | Expected: published listings serve images publicly; draft/archived require an admin session. If a non-published image loads for an anonymous user, verify the store is **Private** and you did not point `<img>` at the raw blob URL — it must use `/api/hotel-image/:id`. |

## Commands Reference

| Purpose | Command |
|---|---|
| Dev server (Express + Vite) | `npm run dev` |
| Type check | `npm run lint` |
| Production build | `npm run build` |
| Serve built app locally | `npm run start` |
| Apply schema + copy legacy SQLite data (additive) | `npm run db:migrate` |
| Seed baseline content (dev/staging only, additive) | `npm run db:seed` |
| Vercel deploy (once `vercel` CLI is installed & logged in) | `vercel --prod` |
