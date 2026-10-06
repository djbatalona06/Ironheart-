# Security

## Trust model
- **The database is the security boundary.** Every table has Row-Level Security. API roles start with
  *no* privileges and get explicit, column-level grants (`supabase/migrations/…_schema.sql`).
- **Anything that moves value is server-only.** Points, pact results, the stake ledger, challenge winners,
  gifts and notifications change only inside `security definer` SQL functions (`close_weeks`, `send_gift`,
  `settle_stake`, …). Clients can't write those columns or tables directly.
- **Service-only functions** (`ai_take`, `close_weeks`, `recompute_challenges`) aren't executable by `anon`
  or `authenticated`. They run from pg_cron or with the service-role key on the server.
- **Auth** is Supabase Auth via `@supabase/ssr` cookies. `proxy.ts` only does optimistic redirects. Pages call
  `requireUser()` (`getUser()`, which verifies with the auth server) and RLS enforces access regardless.
  `/auth/callback` takes no redirect target, so there is no open redirect.
- **Media** lives in a private bucket under `{user_id}/…`. Partners can read check-in photos only, via short-lived
  signed URLs. Files kept on the device (offline/quota fallback) never leave it unless exported.
- **AI**: the system prompt is fixed server-side, input is Zod-validated, and per-user plus global daily caps are
  enforced in SQL before any OpenAI call.

## Secrets
- `.env.local` (git-ignored) locally; Vercel environment variables in production. `SUPABASE_SERVICE_ROLE_KEY`,
  `OPENAI_API_KEY` and `CRON_SECRET` are server-only (never prefixed `NEXT_PUBLIC_`).
- OAuth client secrets and SMTP credentials live in the Supabase dashboard, not in this repo.

## How it's verified
| Check | Where |
|---|---|
| RLS isolation, column grants, server-owned timestamps | `supabase/tests/01_rls.sql` (`npm run test:db`) |
| Weekly close, ledger, settle-by-creditor-only | `supabase/tests/02_pacts.sql` |
| AI quotas + clients can't call `ai_take` | `supabase/tests/03_ai.sql` |
| Gift spending, challenge permissions | `supabase/tests/04_challenges.sql` |
| Callback rejects forged/reused links, no open redirect, signed-out redirects, cross-user 404, privileged RPC/table writes denied | `e2e/security.mjs` (`npm run e2e`) |
| Typecheck, lint, unit tests, **`npm audit --omit=dev --audit-level=high`**, build | `.github/workflows/ci.yml` on every PR |

Known, accepted: `npm audit` reports 2 moderate advisories in `exceljs → uuid` (unused v3/v5/v6 code paths;
exports run client-side on the user's own data) and a high advisory in the dev-only lint toolchain (`braces`).

## Reporting
Open a private security advisory on the GitHub repository (Security → Advisories → New draft).
Please don't file public issues for vulnerabilities.
