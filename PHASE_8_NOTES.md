# Phase 8: share target (docs/13 Phase B)

Share a food photo or label text from another app to IRONHEART (Android share sheet). It opens Nutrition with the content ready to log.

## Built
- **Manifest** `share_target`: POST, `multipart/form-data`, `title` / `text` / `url` + one `image/*` file.
- **Service worker** (`public/sw.js`): answers `POST /share-target` on the device. Checks the file, parks the share in IndexedDB, redirects (303) to `/nutrition?shared=1`. Every other non-GET request still passes straight through; nothing about the share is cached.
- **Storage**: `shareDb` in `lib/db/index.ts` (Dexie database `ironheart-share`, one `shares` store). One pending share at a time: a new share replaces the old one.
- **Nutrition** (`/nutrition?shared=1`): `components/nutrition/SharedFood.tsx` shows the photo and text beside the existing `FoodLogger`, prefilled. Text goes into "Describe it" when AI is configured, otherwise into "Create food" as the name. Logging an entry or tapping Dismiss clears the share.
- **Waiting reminder** (`ShareWaiting.tsx`): if a share is still pending (shared offline, or sign-in landed elsewhere), Nutrition shows a link back to it.
- **Size limit: 5 MB.** Larger images are rejected, not truncated: `/nutrition?shared=too-large` shows "That image is over 5 MB. Share a smaller one." Non-image files and empty shares get their own short message.
- **Server route** (`app/share-target/route.ts`): fallback for when no service worker is in control. It reads and stores nothing and redirects to `/nutrition?shared=unavailable`.
- **Auth**: `/share-target` is not public. Signed out, the share is stored first, then `/nutrition?shared=1` bounces to `/login`; after sign-in `/auth/continue` returns there and the share is still waiting.

## Spec deviations (and why)
- **The service worker handles the POST, not the route.** The spec asked the route handler to write IndexedDB, but a server route cannot reach the browser's IndexedDB. Sending the file up and back would also break "stays local", fail offline, and hit Vercel's 4.5 MB request cap below the 5 MB limit. So the worker stores it and the route is only a fallback.
- **Separate IndexedDB database, not a new store in `ironheart`.** The worker is plain JS with no Dexie. Opening the main database from the worker would mean duplicating (and versioning) the offline queue's schema there; a mistake would break offline logging. Same Dexie library on the page side.
- **The photo is a reference, never uploaded.** `nutrition_logs` has no image column, and adding one is out of scope. The log entry syncs through the normal queue; the photo is deleted from the device when the share is cleared.

## Privacy
Shared content stays on the device until the user saves a log entry, and only the entry syncs. The photo never leaves the device. Shared text reaches the AI estimator only if the user taps Estimate. Nothing goes to any other third party. Recorded in `SECURITY.md`.

## Tests
- `lib/pwa/share.test.ts` (vitest): loads the real `public/sw.js` in a sandbox and drives its fetch handler. Over-limit image rejected and not stored; image exactly at the limit accepted; text-only accepted; non-image and empty rejected; other POSTs untouched.
- `e2e/pwa.mjs`: signed-in share → `/nutrition?shared=1` → prefilled logger → log → cleared; signed-out share → `/login` → sign in → still there → dismiss → cleared; no share POST reaches the server.

## What was run (2026-10-12, Windows)
| Check | Result |
|---|---|
| `npm run typecheck`, `npm run lint`, `npm run build` | pass |
| `npm test` | pass: 8 files, 42 tests (5 new for the share target) |
| Chrome against the production build + real service worker + real IndexedDB (scratch harness, canned backend) | pass: share stored, signed-out → `/login` → back with the share, prefilled logger, dismiss clears, log clears and syncs without the photo, 5 MB + 1 byte rejected, waiting reminder, both server fallbacks, 4 of 4 shares answered by the worker and 0 by the server |
| `npm run e2e`, `npm run test:db` | **not run**: no Docker, so no local Supabase. The new `e2e/pwa.mjs` checks are written but unexecuted. |

## Not tested / needs you
- **Android Chrome, real share sheet** (spec acceptance): install the app, share a photo from Gallery and a text selection from Chrome. The browser test submits the same form POST, but not through the OS.
- **iOS**: the feature is absent there. Confirm the app installs and runs as before.
- Sharing with nutrition tracking turned off shows "Nutrition is off"; the share waits until it is turned on.

## Free-tier risks
None for Supabase or Vercel: shares never reach either. On the device, at most one share (≤ 5 MB) is held.
