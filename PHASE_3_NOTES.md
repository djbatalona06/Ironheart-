# Phase 3: Generator + AI bot + export

## Built
- **10 generic templates** (`scripts/templates.py` → `supabase/seed_templates.sql`). The script fails if any exercise name isn't in the exercise seed.
- **Template browser + preview** (`/workouts/generate`, `/workouts/generate/[slug]`): adjust sets (±), edit reps, remove exercises, estimated minutes per day
- **Schedule it**: start date + weeks → planned workouts and planned sets (`lib/workout/schedule.ts`: 3-day = Mon/Wed/Fri, 4-day = Mon/Tue/Thu/Fri, …). Planned workouts show under "Up next", open in the Logger with targets prefilled, and only count toward a pact once finished.
- **Export**: `.docx` (docx) and `.xlsx` (exceljs), both lazy-loaded client-side; bot replies export to `.docx`
- **`/api/ai`**: OpenAI Responses API with the locked system prompt plus the last 30 days of training as context (≈4k tokens max), streamed replies, food estimates via strict JSON schema validated with Zod
- **Budget caps in SQL** (`ai_take`, service-role only): 200/day global (advisory lock), 10/user/day, 5 food estimates/day; tokens recorded per user/day
- If no AI key is set (`AI_API_KEY` or `OPENAI_API_KEY`), the bot shows a "not set up" message instead of failing
- **Swappable provider** (`lib/ai/provider.ts`): `AI_API_KEY` / `AI_BASE_URL` / `AI_MODEL` point the same `openai` SDK at OpenAI, DeepSeek, or a local Ollama. `OPENAI_*` still works. A custom `AI_BASE_URL` without `AI_MODEL` is treated as "not set up" so a wrong default model is never sent.
- **`scripts/ai-compare.mjs`**: runs the same prompts through each provider and checks 10 food-estimate JSONs, 5 program JSONs, and 5 streamed chats (text + token usage). Exits 1 on any miss. Run it with your own keys before switching providers; it costs a few cents.

## Tests
- SQL `03_ai.sql`: per-user, food and global caps; clients can't call `ai_take`
- Vitest: schedule patterns, reps parsing
- E2E `e2e/generator.mjs` (runs `/api/ai` against `e2e/mock-openai.mjs`): customize → export both formats (valid zip files) → schedule 1 week = 6 planned → open planned in Logger → finish → bot streams → usage recorded → food JSON parsed

## Deviations
- "Customize" lives on the preview itself (no separate step).
- Model defaults to `gpt-5-mini` when no model var is set and no custom base URL is used. Set it explicitly in production.

## Free-tier / cost notes
- Doc generation is 100% client-side (no function time).
- Worst case is 200 calls/day × ~5k tokens, about 1M tokens/day. Check current pricing for your chosen model.

## Read this to learn
1. `app/api/ai/route.ts`: trust boundary (auth → Zod → quota → model) and how a stream is piped to the browser.
2. `e2e/mock-openai.mjs`: testing third-party APIs without paying for them.
