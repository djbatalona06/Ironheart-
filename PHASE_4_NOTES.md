# Phase 4: Camera + nutrition

## Built
- **Camera** (`/camera`, `hooks/useCamera.ts`): photo/video pills, front/back switch (mirrored front preview), 15s clip with live counter and auto-stop, 1.5 Mbps; mp4 on iOS, webm elsewhere
  - iOS workarounds: 3× retry with 500ms backoff, rejects already-ended tracks, full track teardown, 300ms encoder release, `playsInline` everywhere
  - Denied / unavailable → instructions + `<input type=file capture>` upload fallback
- **Check-ins**: "Add photo check-in" on a workout → photo is attached with `is_checkin`, marking the day verified on the pact calendar (partners can view it through a signed URL, per storage RLS)
- **Storage fallback** (`lib/camera/save.ts`): photos compressed to ≤1280px / <500 KB; offline or failed uploads go to IndexedDB (`local:{id}`). Offline captures upload automatically on reconnect; quota failures stay local with "Export all" on Profile.
- **Nutrition**: day view with calorie bar + 3 macro rings, meals grouped, tap entry → edit/delete, last 7 days; food search over 201 seeded foods (cached offline), serving multipliers, custom foods, AI "Describe it" estimate with editable review; logs queue offline
- **Profile**: stats/goals (auto Mifflin-St Jeor or manual override), nutrition toggle, gifts received, photos & clips, local-media export, iPhone install tip, sign out, delete account (ends pacts → partners notified → cascade delete)
- Timezone cookie (`tz`), so server pages know the user's "today" (`lib/tz.ts`, DST-tested)
- SQL: +3 points the first time each day the protein goal is reached

## Tests
- Vitest: timezone midnights incl. the 25-hour DST day
- E2E `e2e/camera-nutrition.mjs` (fake camera device): check-in photo → Storage (13.9 KB) → verified; 2s clip + caption; offline photo → local → auto-upload on reconnect; nutrition search/log/AI/offline/custom/points/edit/delete; nutrition toggle

## Deviations
- **Clips record without audio.** Captions are manual, so audio only added a mic prompt and file size. Turn it on in `useCamera` (`audio: true`) when auto-captions arrive.
- Photo attaching defaults to your latest workout (counts as a check-in); choose "No workout" to keep it on your profile.
- Points "day" for macro hits is the UTC date (noted in the migration).

## Free-tier notes
- 1 GB storage ≈ 2,000+ compressed photos or ~90 clips. Clips are the cost; consider a per-user clip cap if storage climbs.

## Read this to learn
1. `hooks/useCamera.ts`: every iOS workaround has a one-line reason next to it.
2. `lib/tz.ts`: why "today" on a server needs the user's timezone, and how DST makes a day 23 or 25 hours long.
