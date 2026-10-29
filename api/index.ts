/**
 * Vercel Serverless Function entry point.
 *
 * Vercel's Node runtime wraps the exported Express app and forwards every
 * request matched by vercel.json (`/api/*` and `/uploads/*`) to it.
 * The same Express codebase runs locally via `npm run dev` / `npm run start`.
 */
import app from '../server.js';

export default app;
