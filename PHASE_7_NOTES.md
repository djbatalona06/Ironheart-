# Phase 7: PWA shortcuts + launch handling (docs/13 Phase A)

## Built
- **Shortcuts** (`app/manifest.ts`): long-press the app icon → Log workout (`/workouts`), Log food (`/nutrition`), My pact (`/home#pact`). Three entries, each with a 96×96 icon.
- **Shortcut icons**: `scripts/icons.mjs` renders the existing mark (black + gold, no new artwork) to `public/icons/shortcut-{workout,food,pact}.png`.
- **Launch handler**: `launch_handler: { client_mode: "focus-existing" }`. Tapping the icon again focuses the open window.
- **`LaunchTarget` consumer** (`components/pwa/Pwa.tsx`): see "Spec deviations".

## Routes checked (spec: "do not guess")
`app/(app)/workouts/page.tsx`, `app/(app)/nutrition/page.tsx`, `app/(app)/home/page.tsx` all exist. There is no `/pact` route: the pact calendar is Home. The unit test fails if a shortcut points at a path with no `page.tsx`.

## Browser support checked (MDN browser-compat-data, 2026-10-12)
| Member | Chrome desktop | Chrome Android | Safari macOS | Safari iOS | Firefox | MDN status |
|---|---|---|---|---|---|---|
| `shortcuts` | 96 | 84 | 17.4 | no | no | limited availability |
| `launch_handler` / `client_mode` | 110 | not listed | no | not listed | no | experimental |
| `share_target` (Phase 8) | 89 | 76 | no | not listed | no | experimental |

iOS ignores all three. Unknown manifest members are skipped by browsers, so install is unaffected.

## Spec deviations (and why)
- **"No code changes needed beyond the manifest" was wrong.** With `focus-existing` the open window is focused but **not navigated** (MDN); the target arrives on `window.launchQueue`. Without a consumer, a shortcut tapped while the app is open does nothing. `Pwa.tsx` now follows shortcut targets with `router.push`. A plain icon tap (target = `start_url`) leaves the user where they are, which is the point of `focus-existing`.
- **"My pact" is `/home#pact`, not `/home`.** Same page, but the hash tells a shortcut apart from a plain icon tap, so the consumer above knows to navigate.

## Bugs found and fixed
- **Return-to-page after sign-in never worked once the service worker was active** (so: every returning user and every installed app). `proxy.ts` only remembered the page when `sec-fetch-dest` wasn't `empty`, but a navigation forwarded by the service worker arrives as `dest: empty, mode: navigate`. It now keys on `sec-fetch-mode: navigate`. `e2e/auth.mjs` missed this because its browser context is brand new (no worker yet). This is what spec step A1.4 ("return to the shortcut target") depends on.

## Tests
- `lib/pwa/manifest.test.ts` (vitest): shape, 3 shortcuts, each URL a same-origin path with a real page, 96×96 PNGs on disk, `focus-existing`, share target.
- `e2e/pwa.mjs`: shortcuts × 3 return 200 signed in, icons are 96×96 `image/png`, `launch_handler`, signed-out shortcut → `/login` → back to the shortcut after sign-in.

## What was run (2026-10-12, Windows)
| Check | Result |
|---|---|
| `npm run typecheck` | pass |
| `npm run lint` | pass |
| `npm test` | pass: 8 files, 42 tests |
| `npm run build` | pass |
| Chrome against the production build + real service worker (scratch harness, canned backend) | pass (21 checks in all; the Phase 7 ones: served manifest, 96×96 icons, signed-out shortcut → `/login`, return-to cookie set through the worker) |
| `npm run e2e`, `npm run test:db` | **not run**: Docker Desktop would not start on this machine, so there was no local Supabase. The new `e2e/pwa.mjs` checks are written but unexecuted. |

## Not tested / needs you
- Long-press shortcuts on a real Android device and on desktop Chrome/Edge.
- `focus-existing` on desktop Chrome with the app already open (launchQueue only exists in an installed window).
- iOS: confirm install and launch are unchanged.

## Free-tier risks
None. Three 1–2 KB icons; no new requests.
