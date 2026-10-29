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
| Services | Only Neon. Object storage (e.g. Vercel Blob) is **not** required — uploaded images are stored as `BYTEA` rows in Neon (`uploaded_files` table) |

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
   Production and Preview. `PORT`/`DIRECT_URL` are not needed on Vercel.
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
