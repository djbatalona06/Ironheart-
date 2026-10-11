// Compare AI providers on what IRONHEART needs from a model: valid JSON, streaming, and token usage.
// Not shipped in the app. Costs a few cents per provider. Keys come from your shell; nothing is written to disk
// unless you pass --out.
//
//   DEEPSEEK_API_KEY=... OPENAI_API_KEY=... node scripts/ai-compare.mjs
//   node scripts/ai-compare.mjs --only deepseek
//
// Per provider env (defaults in PROVIDERS below):  <NAME>_API_KEY, <NAME>_BASE_URL, <NAME>_MODEL
// Exits 1 if any provider misses the pass bar. Node 22.18+ (imports the app's .ts prompts directly).
import OpenAI from "openai";
import { z } from "zod";
import { FOOD_SYSTEM, FoodEstimate, SYSTEM } from "../lib/ai/prompts.ts";

// USD per 1M tokens, from public pricing pages. Verify before trusting the cost column.
const PROVIDERS = {
  deepseek: { baseURL: "https://api.deepseek.com", model: "deepseek-v4-flash", price: [0.14, 0.28] },
  openai: { baseURL: undefined, model: "gpt-5-mini", price: [0.25, 2.0] },
};

// What a "format my plan for export" reply must look like (docx/xlsx are built client-side from this).
const Program = z.object({
  name: z.string().min(1),
  days: z.array(z.object({
    name: z.string().min(1),
    exercises: z.array(z.object({
      name: z.string().min(1), sets: z.number().int().min(1), reps: z.string().min(1), pct_1rm: z.number().min(0).max(100).nullable(),
    })).min(1),
  })).min(1),
});

const FOODS = [
  "2 eggs and a slice of toast", "a bowl of oatmeal with banana", "chicken breast 200g with rice", "protein shake with milk",
  "a large pepperoni pizza slice", "greek yogurt and a handful of almonds", "salmon fillet with roasted potatoes",
  "a burrito with beans and cheese", "apple and peanut butter", "a cup of cooked pasta with marinara",
];
const PLANS = [
  "Mon: Squat 5x5, Bench 5x5, Row 5x5. Wed: Squat 5x5, OHP 5x5, Deadlift 1x5. Fri: Squat 5x5, Bench 5x5, Row 5x5.",
  "Push: bench 4x8, incline db 3x10, lateral raise 3x15. Pull: row 4x8, pulldown 3x10, curl 3x12. Legs: squat 4x6, rdl 3x8.",
  "Upper A: bench 3x5 at 85%, row 3x8. Lower A: squat 3x5 at 80%, rdl 3x8. Upper B: ohp 3x6, pullups 3x8. Lower B: deadlift 3x3 at 85%.",
  "Full body, 3 days: squat 3x5, bench 3x5, row 3x8, plank 3x60s reps.",
  "Day 1 chest and triceps: bench 4x10, dips 3x12, pushdown 3x15. Day 2 back and biceps: deadlift 3x5, row 4x10, curl 3x12.",
];
const CONTEXT = "2026-09-30 Push A: Bench press 80x5 @8; Bench press 80x5 @8.5; Incline press 60x8 @8\n2026-10-02 Pull A: Row 70x8 @9; Row 70x8 @9.5";
const CHATS = [
  "How is my bench progressing?", "Do I need a deload?", "Summarize my last week of training.",
  "Which lift has my highest RPE?", "Format my last Push A session as a table.",
];

const arg = (n) => { const i = process.argv.indexOf(n); return i > -1 ? process.argv[i + 1] : undefined; };
const only = arg("--only");
const p50 = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] ?? 0;
const jsonFormat = (name, schema) => ({ format: { type: "json_schema", name, strict: true, schema: z.toJSONSchema(schema, { target: "draft-7" }) } });

async function run(name, cfg) {
  const key = process.env[`${name.toUpperCase()}_API_KEY`];
  if (!key) return { name, skipped: `set ${name.toUpperCase()}_API_KEY` };
  const model = process.env[`${name.toUpperCase()}_MODEL`] || cfg.model;
  const client = new OpenAI({ apiKey: key, baseURL: process.env[`${name.toUpperCase()}_BASE_URL`] || cfg.baseURL });
  const r = { name, model, food: { ok: 0, n: FOODS.length }, program: { ok: 0, n: PLANS.length }, stream: { ok: 0, n: CHATS.length }, ms: [], tokens: { in: 0, out: 0 }, errors: [] };
  const track = async (fn) => {
    const t = Date.now();
    try { return await fn(); } catch (e) { r.errors.push(String(e?.message ?? e).slice(0, 160)); return null; } finally { r.ms.push(Date.now() - t); }
  };
  const count = (u) => { r.tokens.in += u?.input_tokens ?? 0; r.tokens.out += u?.output_tokens ?? 0; };

  for (const f of FOODS) {
    const res = await track(() => client.responses.create({ model, instructions: FOOD_SYSTEM, input: f, text: jsonFormat("food_estimate", FoodEstimate) }));
    if (!res) continue;
    count(res.usage);
    try { if (FoodEstimate.safeParse(JSON.parse(res.output_text)).success) r.food.ok++; } catch { /* invalid JSON counts as a miss */ }
  }
  for (const plan of PLANS) {
    const res = await track(() => client.responses.create({
      model, instructions: `${SYSTEM}\nReturn the user's plan as JSON only. Use null for pct_1rm when no percentage is given.`, input: plan, text: jsonFormat("program", Program),
    }));
    if (!res) continue;
    count(res.usage);
    try { if (Program.safeParse(JSON.parse(res.output_text)).success) r.program.ok++; } catch { /* miss */ }
  }
  for (const q of CHATS) {
    await track(async () => {
      const stream = await client.responses.create({ model, stream: true, instructions: `${SYSTEM}\n\nThe user's logged workouts (last 30 days):\n${CONTEXT}`, input: q });
      let deltas = 0, usage;
      for await (const ev of stream) {
        if (ev.type === "response.output_text.delta") deltas++;
        if (ev.type === "response.completed") usage = ev.response.usage;
      }
      count(usage);
      if (deltas > 0 && usage?.total_tokens) r.stream.ok++; // the app needs both text and a token count to meter quota
    });
  }
  const [pi, po] = cfg.price;
  r.costPerCall = (r.tokens.in * pi + r.tokens.out * po) / 1e6 / (r.ms.length || 1);
  r.pass = r.food.ok === r.food.n && r.program.ok === r.program.n && r.stream.ok === r.stream.n;
  return r;
}

const results = [];
for (const [name, cfg] of Object.entries(PROVIDERS)) if (!only || only === name) results.push(await run(name, cfg));

for (const r of results) {
  if (r.skipped) { console.log(`${r.name}: skipped (${r.skipped})`); continue; }
  console.log(`\n${r.name} (${r.model})  ${r.pass ? "PASS" : "FAIL"}`);
  console.log(`  food JSON valid    ${r.food.ok}/${r.food.n}`);
  console.log(`  program JSON valid ${r.program.ok}/${r.program.n}`);
  console.log(`  stream + usage     ${r.stream.ok}/${r.stream.n}`);
  console.log(`  latency p50 ${p50(r.ms)} ms   cost/call ~$${r.costPerCall.toFixed(5)}   tokens ${r.tokens.in} in / ${r.tokens.out} out`);
  if (r.errors.length) console.log(`  errors (${r.errors.length}): ${[...new Set(r.errors)].slice(0, 3).join(" | ")}`);
}
const out = arg("--out");
if (out) (await import("node:fs")).writeFileSync(out, JSON.stringify(results, null, 2));
process.exit(results.some((r) => r.pass === false) ? 1 : 0);
