# Workout Generator + AI Bot + Document Export

## Part 1: Template Library (no AI)
Seeded `workout_templates`. **Generic names only.** Several well-known program
names are trademarks, but training structures aren't protected. Describe the
structure in our own words and never copy program text.

| Slug | Display name | Days |
|---|---|---|
| `ppl-6` | Push / Pull / Legs | 6 |
| `linear-5x5` | 5×5 Linear Progression | 3 |
| `novice-linear-3` | 3-Day Novice Linear | 3 |
| `power-hyper-ul` | Power-Hypertrophy Upper/Lower | 4 |
| `upper-lower-4` | Upper / Lower | 4 |
| `full-body-3` | Full Body 3× | 3 |
| `classic-bro-6` | Classic Bodybuilding Split | 6 |
| `wave-531-4` | 5/3/1-Style Wave | 4 |
| `tiered-t1t2t3` | Tiered T1/T2/T3 Progression | 3 |
| `high-freq-ppl` | High-Frequency PPL (beginner) | 6 |

Each template: name, days[], exercises per day (sets / reps / optional %1RM),
`source_note` = "Structure based on commonly documented training splits."
Never claim affiliation with any lifter, coach, or brand.

## Part 2: Template Browser
1. Workouts → Generate → grid of template cards (gold hover)
2. Tap → preview: days, exercises, estimated duration
3. "Use this program" → start date + weeks → creates planned workouts
   (`generated_from = 'template:<slug>'`). Planned workouts count toward a
   pact only once logged as done.
4. "Customize" → editable copy before saving
5. "Export .docx / .xlsx"

## Part 3: OpenAI Bot (`/workouts/generate/bot`)
Purpose (not inventing programs):
1. Format a template or the user's plan into a table, then export
2. Answer questions about the user's own logged data ("bench progress?")
3. Suggest a deload when RPE > 9 for 3+ sessions
4. Estimate food macros (nutrition mode)

### System Prompt (locked)
```
You are IRONHEART's training assistant. You ONLY:
1. Format workout programs into structured tables (day, exercise, sets, reps, %)
2. Analyze the user's logged workout data (provided as JSON context)
3. Suggest deloads when RPE > 9 for 3+ sessions
4. Estimate food macros when asked
You NEVER invent new exercises or programs; refer users to the template
library. Be concise and direct, use gym terminology, no emojis.
```

### Limits
- Model: `AI_MODEL` (falls back to `OPENAI_MODEL`); provider via `AI_BASE_URL` (`lib/ai/provider.ts`).
  Choose the cheapest model that passes `node scripts/ai-compare.mjs`.
- No free tier: prepaid billing on the OpenAI account required
- **Global**: 200 calls/day. **Per user**: 10/day (food estimates ≤ 5 of those)
- Counted in `ai_usage` (upsert `calls + 1` before the call; reject if over)
- Over cap → "AI quota reached, try again tomorrow"
- Context sent: last 30 days of the user's workouts, trimmed to ≤ 4k tokens

### Route `/api/ai/route.ts`
1. `getUser()` or 401
2. Zod-validate `{ mode: 'chat' | 'food_estimate', message, contextIds? }`
3. Check + increment caps (service role)
4. Call OpenAI with system prompt + context, stream back as a `ReadableStream`
5. Record token usage in `ai_usage.tokens`

## Part 4: Export (client-side only, so no function timeouts)
```ts
import { Document, Packer, Paragraph, Table, TableRow, TableCell, HeadingLevel } from 'docx';

const doc = new Document({ sections: [{ children: [
  new Paragraph({ text: program.name, heading: HeadingLevel.HEADING_1 }),
  new Table({ rows: program.days.flatMap(day => [
    new TableRow({ children: [new TableCell({ children: [new Paragraph(day.name)] })] }),
    ...day.exercises.map(ex => new TableRow({ children: [
      new TableCell({ children: [new Paragraph(ex.name)] }),
      new TableCell({ children: [new Paragraph(`${ex.sets}x${ex.reps}`)] }),
      new TableCell({ children: [new Paragraph(ex.pct_1rm ? `${ex.pct_1rm}%` : '')] }),
    ]})),
  ])}),
]}]});

const blob = await Packer.toBlob(doc);
const a = Object.assign(document.createElement('a'), {
  href: URL.createObjectURL(blob), download: `${program.name}.docx`,
});
a.click(); URL.revokeObjectURL(a.href);
```
- `.xlsx` via `exceljs` (`workbook.xlsx.writeBuffer()` → Blob → same download helper)
- Lazy-load `docx` / `exceljs` with dynamic `import()` (bundle budget)
- `.pdf`: post-MVP
