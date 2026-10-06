import { readFileSync } from "node:fs";
import { BASE, browser, check, onboard, signIn, sql } from "./lib.mjs";
import { calls, startMockOpenAI } from "./mock-openai.mjs";

const mock = await startMockOpenAI();
const b = await browser();
const s = Date.now().toString(36);
const page = await signIn(b, `gen_${s}@test.dev`);
await onboard(page, { name: "Gen", handle: `gen_${s}` });

await page.goto(`${BASE}/workouts/generate`);
check((await page.locator("main ul li a").count()) === 10, "10 templates listed");
await page.click("text=Push / Pull / Legs");
await page.click('button[aria-label="Remove Hanging Leg Raise"]');
check(!(await page.isVisible("text=Hanging Leg Raise")), "customize: exercise removed");

const [docx] = await Promise.all([page.waitForEvent("download"), page.click("button:has-text('.docx')")]);
const [xlsx] = await Promise.all([page.waitForEvent("download"), page.click("button:has-text('.xlsx')")]);
const zip = (d) => readFileSync(d).subarray(0, 2).toString() === "PK";
check(docx.suggestedFilename() === "Push  Pull  Legs.docx" && zip(await docx.path()), `docx export (${docx.suggestedFilename()})`);
check(xlsx.suggestedFilename().endsWith(".xlsx") && zip(await xlsx.path()), "xlsx export");

await page.fill('input[type="number"]', "1");
await page.click("text=Schedule it");
await page.waitForURL("**/workouts?planned=1");
const planned = Number(sql(`select count(*) from workouts w join profiles p on p.id = w.user_id where p.handle = 'gen_${s}' and status = 'planned'`));
check(planned === 6, `6 planned workouts for 1 week (got ${planned})`);
const legSets = Number(sql(`select count(*) from workout_sets ws join workouts w on w.id = ws.workout_id join profiles p on p.id = w.user_id
  join exercises e on e.id = ws.exercise_id where p.handle = 'gen_${s}' and e.name = 'Hanging Leg Raise'`));
check(legSets === 0, "customization carried into planned sets");
check((await page.locator("text=UP NEXT").count()) === 1, "Up next section shows");

await page.click("section a >> nth=0");
await page.waitForURL("**/workouts/new?planned=*");
check(await page.isVisible("text=Planned workout") && await page.isVisible("text=Barbell Bench Press"), "planned workout opens in logger with exercises");
check((await page.inputValue('input[aria-label="Set 1 reps"]')) === "6", "reps target prefilled");
await page.fill('input[aria-label="Set 1 weight"] >> nth=0', "90");
await page.click('button[aria-label="Complete set 1"] >> nth=0');
await page.click("text=/Finish workout/");
await page.waitForURL("**/workouts?saved=*");
const left = Number(sql(`select count(*) from workouts w join profiles p on p.id = w.user_id where p.handle = 'gen_${s}' and status = 'planned'`));
check(left === 5, "finishing turns planned → done");

// Bot via mock OpenAI
await page.goto(`${BASE}/workouts/generate/bot`);
await page.click("text=Do I need a deload?");
await page.waitForSelector("text=No deload needed.");
check(true, "bot streams reply");
check(calls[0]?.instructions.includes("Push / Pull / Legs · Push"), "bot got the user's training context");
check(sql(`select calls || '/' || tokens from ai_usage a join profiles p on p.id = a.user_id where p.handle = 'gen_${s}'`) === "1/15", "usage + tokens recorded");
const food = await page.evaluate(() => fetch("/api/ai", { method: "POST", headers: { "content-type": "application/json" },
  body: JSON.stringify({ mode: "food_estimate", message: "2 eggs" }) }).then((r) => r.json()));
check(food.items?.[0]?.calories === 143, "food estimate parsed via JSON schema");
check(calls[1]?.text?.format?.type === "json_schema", "food estimate requested structured output");
await page.screenshot({ path: "e2e/out/bot.png" });
await b.close();
mock.close();
