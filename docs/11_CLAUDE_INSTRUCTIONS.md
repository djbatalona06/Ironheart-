# Build Instructions (for the AI code generator)

You are building **IRONHEART**, a partner-accountability fitness PWA: weekly
partner pacts with stakes and a color-coded shared calendar at the core, plus
workout logging, a template generator + AI export bot, camera check-ins,
nutrition, challenges, and gifts. Read every file in `/docs` before writing code.
These docs are the source of truth. If code and docs disagree, ask; don't guess.

## Free-Tier Constraints (non-negotiable)
- Supabase Free: 1 GB storage, 50 MB/file, 500 MB DB, 200 realtime
  connections, pauses after 7 idle days
- Vercel Hobby: non-commercial; keep heavy work client-side
- OpenAI: no free tier. 200 calls/day global, 10/user/day.
- **Offline queue (Dexie)** for workouts, sets, nutrition logs, and local media.
  Pacts, challenges, gifts, and AI are online-only.
- **Every media upload compresses first** and falls back to IndexedDB.
- **Every server GET goes through TanStack Query** (`staleTime` ≥ 5 min,
  except the pact calendar: 30s + realtime).

## Order of Operations (matches 12_ROADMAP)
1. Scaffold Next.js (latest) + TS strict + Tailwind v4 + shadcn/ui + tokens from 03
2. Supabase migrations + RLS + seed from 04
3. Supabase Auth + middleware + onboarding (05)
4. App shell: header, 5-tab bottom nav, protected layout
5. Workout logger + offline queue
6. **Partner pacts**: pairing, weekly goals, `WeekCalendar`, `close_weeks()`, ledger
7. Template library + generator + AI bot + export (10)
8. Camera + check-ins (06)
9. Nutrition (09)
10. Challenges + gifts + notifications (08)
11. PWA: Serwist, manifest, install banner, keepalive cron (07)
12. Polish + audits

## Hard Rules
- TypeScript strict. No `any`. Zod at every boundary (forms, route input, AI output).
- No placeholder UI: every screen has loading, empty, and error states.
- Mobile-first at 390px.
- All colors via CSS variables from 03.
- **No trademarked or copied assets**: no gym brand logos or names, no copied
  UI, text, or assets from any other app (including partner-fitness apps the
  loop is inspired by), no trademarked program names (use 10's generic names).
- Accessibility: `aria-label` on icon buttons, `<label>` on inputs, calendar
  cells labeled (03).
- Performance: lazy-load camera, charts, docx/exceljs, confetti. Initial JS < 200 KB.
- Security: points, ledger results, notifications, and gifts change only in
  `security definer` SQL functions. Never trust the client for these.
- Secrets live in `.env.local` only. Never commit them; never log them.
- Camera: implement every confirmed iOS caveat in 06; mark device-unverified
  items with `// TODO: verify on device`.
- Tests (Vitest): pact week math (timezones, DST, Mon–Wed first-week rule,
  late-sync credit date),
  calendar cell state, macro math, offline queue flush.

## Naming
Components `PascalCase.tsx` · hooks `useCamelCase.ts` · utils `camelCase.ts` ·
routes `kebab-case/page.tsx`

## Commits
Conventional: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`

## When Unsure
- Choose the simpler implementation
- Leave a `// TODO:` comment explaining the tradeoff
- Use only documented APIs for Next.js, Supabase (`@supabase/ssr`), Serwist, Dexie
- If a free-tier limit would break a feature, build the fallback and document it

## Deliverable per Phase
Working code + `PHASE_N_NOTES.md`: what was built, what's stubbed, what the
next phase needs, and free-tier risks found.

## Definition of Done (MVP)
- [ ] Sign up with email magic link, Google, or GitHub; onboarding completes
- [ ] Two users pair, set goals + stakes, see each other's days on the calendar live
- [ ] Monday close creates the correct results, ledger rows, and streak
- [ ] Creditor can settle a stake; debtor is notified
- [ ] Photo check-in marks a calendar day as verified
- [ ] Log a workout offline; it syncs when back online
- [ ] Generate a PPL program from a template and export .docx and .xlsx
- [ ] Record a 15s clip and add a caption
- [ ] Log a meal; macro rings update
- [ ] Create a challenge, partner accepts, both see progress
- [ ] Send a gift; recipient is notified; points deduct correctly
- [ ] App installs to the iOS home screen and opens standalone
- [ ] Camera works in the installed PWA, or falls back to file input
- [ ] Passes Chrome installability; Lighthouse Performance + Accessibility ≥ 90
- [ ] Storage quota not exceeded in normal testing; local fallback demonstrated
