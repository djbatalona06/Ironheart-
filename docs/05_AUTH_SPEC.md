# Auth Spec: Supabase Auth

## Why not NextAuth
RLS policies use `auth.uid()`, which reads the Supabase-issued JWT. A NextAuth
session doesn't produce one, so every policy would deny. Supabase Auth covers
all three providers natively.

## Providers (configured in Supabase dashboard)
1. **Email magic link**: custom SMTP via Resend (free tier ~100/day). Built-in
   SMTP is testing-only.
2. **Google OAuth**
3. **GitHub OAuth**

## Rate Limits to Design Around
- Magic link: ~60s between requests per email → Resend button with 60s cooldown
- If the email doesn't arrive, show "Use Google or GitHub instead"

## Implementation (`@supabase/ssr`)
- `lib/supabase/client.ts`: `createBrowserClient`
- `lib/supabase/server.ts`: `createServerClient` with Next `cookies()`
- `middleware.ts`: refreshes the session on every request; redirects
  unauthenticated `/(app)/*` to `/login`
- `app/auth/callback/route.ts`: `exchangeCodeForSession(code)` → redirect to
  `/onboarding` if `profiles.onboarded = false`, else `/home`
- Server components call `supabase.auth.getUser()` (not `getSession()`) for
  trusted checks

```ts
// app/(app)/layout.tsx
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();
if (!user) redirect('/login');
```

## Profile Creation
Postgres trigger on `auth.users` insert → creates `profiles` row
(`onboarded = false`, name/avatar from provider metadata).

## Onboarding (first login)
See `03b_APP_FLOW.md`. Collects name, @handle, goal, body stats (for
Mifflin-St Jeor), nutrition on/off, optional partner invite. Sets `onboarded = true`.

## Environment Variables (`.env.local`, never committed)
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=      # server only: ai_usage writes, signed URLs
OPENAI_API_KEY=
OPENAI_MODEL=
CRON_SECRET=                    # Vercel cron auth for /api/health
```
Google/GitHub client secrets and Resend SMTP credentials live in the Supabase
dashboard, not in the app.

## Sessions
- Cookie-based, refreshed by middleware
- Sign out: `supabase.auth.signOut()` → `/login`
- Delete account: server route with service role → ends active pacts (notify
  partners) → deletes auth user (cascades)
