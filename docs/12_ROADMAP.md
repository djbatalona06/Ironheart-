# Build Roadmap

## Phase 1: Foundation (Days 1–2)
- Next.js scaffold, Tailwind v4, shadcn/ui, design tokens (03)
- Supabase project, all migrations + RLS + seeds (04)
- Supabase Auth (magic link via Resend, Google, GitHub), middleware, onboarding
- App shell: header, 5-tab nav, protected layout
- Vercel deploy + `/api/health` keepalive cron

## Phase 2: Core Loop (Days 3–5)
- Workout CRUD, exercise picker (seed ~100 lifts), set logging (reps, weight, RPE)
- Dexie offline queue + sync on `online`/focus
- **Partner pacts**: invite by @handle, accept, weekly goals + stakes
- **`WeekCalendar`** on Home with live partner updates
- **`close_weeks()`** via `pg_cron`, ledger, settle flow, streaks
- Vitest: week math, cell state, close logic

## Phase 3: Generator + AI Bot (Days 6–7)
- 10 generic templates seeded, browser + preview + "Use this program"
- `/api/ai` with caps, bot UI, streaming
- Client-side .docx (docx) + .xlsx (exceljs) export

## Phase 4: Camera + Nutrition (Days 8–9)
- Camera: photo + 15s video, manual captions, check-in mode from the Logger
- Compression + IndexedDB fallback
- Nutrition logging, food seed (200), macro rings, Mifflin-St Jeor goals, AI estimate

## Phase 5: Challenges + Gifts + Notifications (Days 10–11)
- Challenge CRUD, invites, daily recompute, results
- Points ledger, gift catalog, `send_gift()` RPC
- Realtime notifications, toasts, bell badge, notifications page

## Phase 6: PWA + Polish (Days 12–13)
- Service worker (`public/sw.js`), manifest, icons
- iOS install banner, camera permission instructions
- Empty states, haptics, confetti, reduced-motion
- Lighthouse audit; free-tier stress test (fill storage, verify fallback)

## Post-MVP Backlog
- Auto-captions for form clips (Whisper API)
- Group pacts (3+ people)
- Push notifications (Web Push on iOS 16.4+ installed PWAs)
- Barcode scanning for nutrition
- AI program generation from scratch
- Apple Health / Google Fit sync
- PDF export
- Real-money stakes (legal review required)
- Capacitor native wrapper
- Supabase Pro when storage > 800 MB; Vercel Pro before monetizing
