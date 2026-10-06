# IRONHEART

A black-and-gold, iOS-installable fitness PWA built around **weekly partner pacts**.
Pair with someone, each set a weekly workout goal and a stake ("buy dinner"), and
watch a shared color-coded calendar fill in. The week closes every Monday; whoever
missed owes the stake. Workout logging (offline-first), a template program generator
with .docx/.xlsx export, an AI training bot, photo check-ins, nutrition tracking,
challenges, virtual gifts and live notifications all feed the loop.

**Run it:** [`SETUP.md`](SETUP.md) (Supabase + Vercel + iPhone install, about 30 minutes).
**Specs:** [`docs/`](docs). Start with [`00_PROJECT_BRIEF.md`](docs/00_PROJECT_BRIEF.md).
**Build log:** `PHASE_1_NOTES.md` … `PHASE_6_NOTES.md` (what was built, deviations, and a "read this to learn" pointer each).

Stack: Next.js 16 · React 19 · TypeScript · Tailwind v4 · Supabase (Auth, Postgres + RLS,
Storage, Realtime, pg_cron) · Dexie (IndexedDB) · OpenAI Responses API · Vercel.

| Check | Command |
|---|---|
| Types | `npm run typecheck` |
| Lint | `npm run lint` |
| Unit (Vitest) | `npm test` |
| Database (RLS, weekly close, quotas, challenges) | `npm run test:db` |
| End-to-end (Playwright, 111 checks incl. offline cold launch + auth/security) | `npm run e2e`, see [`e2e/README.md`](e2e/README.md) |
| CI on every PR | typecheck, lint, unit, `npm audit` (prod, high+), build: [`.github/workflows/ci.yml`](.github/workflows/ci.yml) |

Security model and how it's tested: [`SECURITY.md`](SECURITY.md).
