# Nutrition Tracking Spec

## Scope
Daily calorie + macro (protein/carbs/fat) logging. No barcode scanning in MVP.
Can be turned off in onboarding or profile (`profiles.nutrition_enabled`).

## Data
- `foods`: ~200 common items seeded (`created_by = null`) + per-user custom foods
- `nutrition_logs`: one row per logged item (values copied, so later edits to
  a food don't rewrite history)

## UX Flow
1. Nutrition tab → selected day: 3 `MacroRing`s + calorie bar
2. "+" → Food Search (seed + mine) → serving multiplier → meal type → Log
3. Swipe an entry → Edit / Delete
4. Date arrows → last 7 days
5. "Describe it" → AI estimate → editable review → Log

## Macro Rings
`MacroRing({ current, goal, color })`, SVG, fills clockwise, animates on change.
Protein `--macro-protein`, carbs `--macro-carbs`, fat `--macro-fat`.

## Goals
- Mifflin-St Jeor BMR from onboarding stats:
  - Male: `10w + 6.25h − 5a + 5`; female: `10w + 6.25h − 5a − 161`
  - × activity factor (1.2 / 1.375 / 1.55 / 1.725 / 1.9)
  - Goal adjust: fat loss −20%, muscle +10%, strength/endurance ±0
- Protein 2.0 g/kg, fat 25% kcal, carbs = remainder
- No stats entered → no goals; rings show totals only with a "Set goals" prompt
- Override in Profile

## AI Food Estimate (gated)
- `/api/ai` with `mode: 'food_estimate'` → JSON `{ items: [{ name, calories, protein_g, carbs_g, fat_g }] }`, Zod-validated
- 5/day per user (counted in `ai_usage`, within the 10/day total)
- Limit hit → manual entry only

## Offline + Caching
- Logging works offline (Dexie queue)
- Today's logs cached locally; page loads fetch only the last 7 days
- No food images in MVP
