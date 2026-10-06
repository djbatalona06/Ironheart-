# Tech Stack

> Re-verify every free-tier number at supabase.com/pricing and
> vercel.com/pricing before Phase 1. Limits change; this doc may be stale.

## Frontend
- **Next.js** (latest stable, App Router): SSR, route handlers, PWA
- **TypeScript** (strict mode, no `any`)
- **Tailwind CSS v4**: utility styling
- **shadcn/ui** (latest): component primitives
- **CSS transitions**: page and button motion (no Framer Motion; bundle budget)
- **canvas-confetti**: win / goal-hit celebration
- **Lucide React**: icons
- **Zustand**: small client state (active workout, offline queue status)
- **TanStack Query**: server state, caching, optimistic updates
- **React Hook Form + Zod**: forms + validation
- **Recharts**: macro charts, challenge progress (lazy-loaded)

## Backend / Infra
- **Supabase Free**
  - Postgres: 500 MB
  - Auth: 50,000 MAU (magic link, Google, GitHub)
  - Storage: **1 GB total, 50 MB max per file**
  - Realtime: 200 concurrent connections
  - `pg_cron` (weekly pact close, challenge recompute)
  - **Pauses after 7 days of inactivity**: daily Vercel cron hits a route
    that runs a real DB query
- **Supabase Auth via `@supabase/ssr`**: cookie sessions, middleware refresh.
  RLS uses `auth.uid()`, which only works with Supabase-issued sessions.
- **Resend**: custom SMTP for magic links (built-in Supabase SMTP is
  testing-only, ~2 emails/hour)
- **Vercel Hobby**: non-commercial use only. Upgrade before monetizing.
- **OpenAI API**: model set by `OPENAI_MODEL` env var (cheapest current
  "mini" model). No free tier; prepaid billing required. Hard caps in code:
  200 calls/day global, 10/user/day.

## Camera / Media
- `MediaDevices.getUserMedia()`: camera stream
- `MediaRecorder`: 15s clips (mp4 on iOS, webm elsewhere)
- Canvas API: still frames + JPEG output
- `browser-image-compression`: photos to < 500 KB before upload
- Captions: manual text field (auto-captions are post-MVP)

## Document Export (client-side)
- `docx`: .docx programs
- `exceljs`: .xlsx sheets (not npm `xlsx`, which is frozen at a vulnerable version)
- Native `<a download>` with `URL.createObjectURL` (no file-saver)

## PWA
- `@serwist/next`: service worker + precache + runtime caching
- `app/manifest.ts`: Next.js built-in manifest
- `Dexie.js`: IndexedDB for offline workout/nutrition queue + local media fallback

## Dev Tooling
- ESLint + Prettier
- Vitest for unit tests (pact close logic, macro math, queue)
- Vercel deploy

## Free-Tier Mitigation
| Constraint | Mitigation |
|---|---|
| 1 GB storage | Photos < 500 KB; video 15s/720p/1.5 Mbps (~11 MB); IndexedDB fallback with export |
| 50 MB max file | Recorder hard-stops at 15s; reject > 50 MB, offer re-record |
| Egress | Serve local media from IndexedDB when present; lazy-load thumbnails |
| 7-day pause | Daily cron → `/api/health` runs `select 1 from profiles limit 1` |
| OpenAI cost | Global + per-user caps in `ai_usage`; cache exported docs |
| Function timeout | Doc generation runs client-side |
| Realtime 200 conns | One channel per user; fall back to 30s polling on error |
