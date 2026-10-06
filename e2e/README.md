# End-to-end tests

Real browser (Playwright) against a production build + the local Supabase stack.

```bash
npx supabase start                      # local Postgres/Auth/Realtime/Storage (Docker)
npm run build
OPENAI_API_KEY=test-key OPENAI_BASE_URL=http://localhost:4010/v1 npx next start -p 3000 &
set -a && . ./.env.local && set +a      # local Supabase URL + keys
npm run e2e
```

- The AI bot and food estimates talk to `e2e/mock-openai.mjs` (port 4010), never the real API.
- `pwa.mjs` stops and restarts the server to test true offline behavior.
- Each run signs up fresh users (admin-generated magic links), so runs don't collide.
- Screenshots land in `e2e/out/` (git-ignored).
