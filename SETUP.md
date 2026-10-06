# Setup: from this repo to IRONHEART on your phone

You need about 30 minutes. Everything here is on free tiers.

## 1. Supabase (database, auth, storage, realtime)
1. Create a project at supabase.com → **New project** (free). Save the database password.
2. **Database → Extensions** → enable **pg_cron**.
3. Push the schema from your machine (needs Node 20+):
   ```bash
   npx supabase login
   npx supabase link --project-ref <your-project-ref>     # from the project URL
   npx supabase db push                                   # applies supabase/migrations/*
   ```
4. Load the seed data: **SQL Editor** → paste and run, in order:
   `supabase/seed.sql`, `supabase/seed_templates.sql`, `supabase/seed_foods.sql`.
5. **Authentication → URL Configuration**
   - Site URL: `https://<your-vercel-domain>`
   - Redirect URLs: `https://<your-vercel-domain>/auth/callback` (add `http://localhost:3000/auth/callback` for local dev)
6. **Authentication → Providers**
   - Email: on (magic link).
   - Google: create an OAuth client in Google Cloud Console. Authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`.
   - GitHub: GitHub → Settings → Developer settings → OAuth Apps, same callback URL.
7. **Authentication → Emails → SMTP**: use Resend (free, about 100 emails/day). The built-in sender is limited to a few emails per hour.
8. **Project Settings → API**: copy the URL, the anon/publishable key, and the service-role key (keep that one secret).

## 2. Vercel (hosting)
The Vercel connector in the build session didn't have permission to create projects in the `vertex-supply` team, so do this in the dashboard:
1. vercel.com → **Add New → Project** → import `djbatalona06/Ironheart-`. Framework: Next.js (auto-detected).
2. **Environment Variables** (Production + Preview):

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon / publishable key |
   | `SUPABASE_SERVICE_ROLE_KEY` | service-role key (mark **Sensitive**) |
   | `CRON_SECRET` | any long random string (`openssl rand -hex 32`) |
   | `OPENAI_API_KEY` | optional. Without it the bot/estimates say "not set up" |
   | `OPENAI_MODEL` | optional, e.g. a current `-mini` model (default `gpt-5-mini`) |
3. Deploy. Until the env vars exist, every page shows **Setup needed**. Vercel Hobby is non-commercial; upgrade before you charge money.
4. The daily keepalive cron (`vercel.json`) calls `/api/health` with `CRON_SECRET` automatically, which stops the free Supabase project from pausing.

## 3. On your iPhone
1. Open your Vercel URL in **Safari**, sign in, and open the Camera tab once to **allow camera access**.
2. Share → **Add to Home Screen**. IRONHEART now opens full-screen like an app.
3. Invite your partner from Home → **Start a pact**.

## Local development
```bash
npm install
npx supabase start            # Docker; prints local URL + keys
cp .env.example .env.local    # fill NEXT_PUBLIC_SUPABASE_URL / ANON_KEY / SERVICE_ROLE_KEY from `npx supabase status`
npm run dev                   # http://localhost:3000
```
Checks: `npm run typecheck`, `npm run lint`, `npm test` (Vitest), `npm run test:db` (SQL tests against the local stack), `npm run e2e` (see `e2e/README.md`).

## Free-tier watch list
- Storage 1 GB: clips are the big cost (~11 MB each). Photos are compressed to <500 KB.
- OpenAI: hard caps of 200 calls/day globally and 10 per user, so spend is bounded.
- Re-check limits at supabase.com/pricing and vercel.com/pricing. They change.
