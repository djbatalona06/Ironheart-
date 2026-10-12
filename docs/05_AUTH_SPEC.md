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

## Email code
The sign-in email (`supabase/templates/magic_link.html`) carries a 6-digit code
and a same-device link (`/auth/callback?token_hash=…&type=email`). The login
screen accepts the code (`verifyOtp({ email, token, type: 'email' })`), so the
installed iOS app can sign in even though email links open in Safari.

## Two-step verification (TOTP)
- Opt-in from Profile → Security: enroll an authenticator (QR or key), confirm a
  code, optionally add a backup authenticator. Supabase has no recovery codes,
  so a second authenticator is the recovery path.
- After the first factor, a user with a verified authenticator lands on
  `/login/mfa` until the session is `aal2`.
- Enforced in three layers: `requireUser()`/`currentUser()` (pages, server
  actions, `/api/ai`), PostgREST `db_pre_request = public.enforce_mfa` (every
  table and RPC call), and restrictive `mfa_gate` policies on Realtime tables
  and `storage.objects`.

## Return to the page you wanted
`proxy.ts` stores a signed-out visitor's requested path in the `ih_next` cookie
(httpOnly, 15 min). `/auth/callback` takes no redirect target; it always sends
the browser to `/auth/continue`, which routes: second factor → onboarding →
`safeNext(cookie)` → `/home`. `safeNext` (`lib/auth/next.ts`) only allows
same-site app paths.

## Sessions and connected accounts
- Sign out: this device (`scope: 'local'`) or all devices (`scope: 'global'`).
- Connect/disconnect Google and GitHub (`linkIdentity`/`unlinkIdentity`, needs
  manual linking on); the last sign-in method can't be removed.

## Rate Limits
- The server allows at most 5 magic-link send attempts per normalized email
  address in a rolling 10-minute window. The counter stores an HMAC of the
  email, not the address itself, and its Postgres function is service-role only.
- Supabase Auth must be configured with custom SMTP, an email-send limit of at
  least 30/hour, and a 1-second OTP email frequency so provider limits do not
  undercut the app's cap.
- The login form displays a retry message when the app-level cap is reached.
  Google and GitHub remain alternate sign-in methods.

## Implementation (`@supabase/ssr`)
- `lib/supabase/client.ts`: `createBrowserClient`
- `lib/supabase/server.ts`: `createServerClient` with Next `cookies()`
- `middleware.ts`: refreshes the session on every request; redirects
  unauthenticated `/(app)/*` to `/login`
- `app/auth/callback/route.ts`: `exchangeCodeForSession(code)` or
  `verifyOtp(token_hash)` → `/auth/continue` (2FA → onboarding → saved page → `/home`)
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
Hosted Google/GitHub client secrets and SMTP credentials live in the Supabase
dashboard. For local development, Supabase reads the optional
`SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID`, `SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET`,
`SUPABASE_AUTH_EXTERNAL_GITHUB_CLIENT_ID`, and
`SUPABASE_AUTH_EXTERNAL_GITHUB_SECRET` variables before the stack starts. Local
providers default to disabled; the Windows dev script enables each provider
only when both its client ID and secret are present. When starting Supabase
manually, also set the corresponding
`SUPABASE_AUTH_EXTERNAL_GOOGLE_ENABLED=true` or
`SUPABASE_AUTH_EXTERNAL_GITHUB_ENABLED=true` variable.

## Sessions
- Cookie-based, refreshed by middleware
- Sign out: `supabase.auth.signOut({ scope })` → `/login`
- Delete account: server route with service role → ends active pacts (notify
  partners) → deletes auth user (cascades)
