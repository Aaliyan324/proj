# Red Rock Hotel

React + Vite + Tailwind front end with a small Express server (items API, image uploads, admin login).

## Run (easiest)

Requires Node.js 18+.

- **Windows:** double-click `start.bat`
- **Mac/Linux:** `./start.sh`

Then open http://localhost:3000

## Run manually

```bash
npm install
npm run dev        # development -> http://localhost:3000
```

Production:

```bash
npm run build
npm start          # serves ./dist -> http://localhost:3000
```

Other port: `PORT=4000 npm run dev` (PowerShell: `$env:PORT=4000; npm run dev`).

## Admin

Login: `admin` / `admin123` (change in `server.ts` before deploying).

## Notes

- Items are stored in `data/items.json`, uploads in `public/uploads/` (auto-created).
- No API key is needed; the Gemini key from the original template is unused.
