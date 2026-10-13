# 13 — PWA Enhancements Spec

Build spec for adding installed-app capabilities to IRONHEART's existing PWA.
Written for a builder model (Sonnet or Opus) to execute phase by phase.
Read `CLAUDE.md`, `AGENTS.md`, `docs/11_CLAUDE_INSTRUCTIONS.md`, and `PHASE_6_NOTES.md` first.

---

## 0. Ground rules

- **iOS is the primary install target** (README: "iOS-installable"). Most items below are
  Chromium-only (Chrome/Edge on Android and desktop). iOS Safari ignores them. Every feature
  must degrade to a normal web experience, never break install, sign-in, or offline.
- **Verify support before coding.** Check MDN or caniuse for each member at build time. The
  statuses in this spec reflect general knowledge, not a live check. Record the result in the phase notes.
- **Unknown manifest members are ignored by browsers**, but still validate the JSON in tests.
- **Next.js 16 / this repo's conventions:** AGENTS.md says the framework has breaking changes.
  Read the relevant guide in `node_modules/next/dist/docs/` before touching `app/manifest.ts`
  or adding routes.
- **Do not** add trademarked names, third-party UI, or copied assets. Generated icons come from `scripts/icons.mjs`.
- **Do not** commit secrets. **Do not** change the service worker's "never cache auth/API" rule.
- Write `PHASE_N_NOTES.md` after each phase (next free N per `docs/12_ROADMAP.md`).

## 1. Triage of the requested capabilities

| Capability | Manifest member | Decision | Why |
|---|---|---|---|
| Jump to key pages | `shortcuts` | **Build (Phase A)** | Fits: log workout, log food, open pact. Long-press icon on Android and desktop. |
| Accept shared content | `share_target` | **Build (Phase B)** | Useful for sharing a food photo or label text into Nutrition. Needs a route and a POST handler. |
| Control launch behavior | `launch_handler` (`client_mode: "focus-existing"`) | **Build (Phase A)** | Tiny change. Stops duplicate windows when a user taps the icon again. |
| Deep links for invites | `protocol_handlers` (`web+ironheart:`) | **Defer (Phase C, optional)** | Needs a user prompt and a custom scheme. Useful only if partner invites need links outside the app. |
| Open files | `file_handlers` | **Skip** | No file-based workflow in the product. |
| Home-screen widget | `widgets` | **Skip** | Experimental, Windows-only today. |
| Edge sidebar | `edge_side_panel` | **Skip** | Edge-only. Nothing here belongs in a sidebar. |
| Custom title bar | `display_override: ["window-controls-overlay"]` | **Skip for now** | Desktop-only. The app is mobile-first. Revisit only if desktop installs matter. |
| Multiple tabs in app | `display_override: ["tabbed"]` | **Skip** | Experimental, and the product has no tab-based content. |
| Notes app integration | `note_taking` | **Skip** | No notes product. It would also send user notes into the app, which is a privacy and data-scope question the product has not answered. |

**Recommendation:** ship Phase A (shortcuts + launch_handler), then Phase B (share_target).
Leave the rest out unless the owner asks for them.

---

## 2. Phase A: shortcuts and launch handling

### A1. Shortcuts

Add to `app/manifest.ts`:

```ts
shortcuts: [
  { name: "Log workout", short_name: "Workout", url: "/workouts", icons: [{ src: "/icons/shortcut-workout.png", sizes: "96x96", type: "image/png" }] },
  { name: "Log food", short_name: "Food", url: "/nutrition", icons: [{ src: "/icons/shortcut-food.png", sizes: "96x96", type: "image/png" }] },
  { name: "My pact", short_name: "Pact", url: "/home", icons: [{ src: "/icons/shortcut-pact.png", sizes: "96x96", type: "image/png" }] },
],
```

Steps:
1. Confirm each `url` is a real route under `app/(app)/`. If the pact screen lives somewhere
   else (for example `/pact` or a sub-route of `/home`), use that path. Do not guess.
2. Extend `scripts/icons.mjs` to output three 96×96 PNGs in `public/icons/`. Use the existing
   brand colors (black background, gold mark). Reuse the existing logo source. Do not draw new artwork.
3. Keep `shortcuts` to three entries. Browsers cap the count and show only a few.
4. Shortcut URLs must pass the auth gate in `proxy.ts`. Signed-out users should land on `/login`
   and then return to the shortcut target. Test this.

**Files:** `app/manifest.ts`, `scripts/icons.mjs`, `public/icons/shortcut-*.png`.

### A2. Launch handler

Add to `app/manifest.ts`:

```ts
launch_handler: { client_mode: "focus-existing" },
```

Effect: tapping the app icon focuses the open window instead of opening a second one.
Standalone display only. No code changes needed beyond the manifest.

**Files:** `app/manifest.ts`.

### A3. Tests for Phase A

Extend `e2e/pwa.mjs` (do not create a parallel test file):
- Manifest contains `shortcuts` with 3 entries. Each `url` returns 200 when signed in.
- Each shortcut icon returns 200 with `image/png` and 96×96 dimensions.
- `launch_handler.client_mode === "focus-existing"`.
- Existing checks still pass: `display === "standalone"`, 3 base icons, service worker controls the page.

Add a unit test (vitest) that calls `manifest()` and checks the schema shape. It should fail if
a shortcut URL is not a string starting with `/`.

**Acceptance:** `npm run e2e` passes, `vitest` passes, and the Phase A notes list the browser support checked.

---

## 3. Phase B: share target

Goal: a user shares a food photo or label text from another app to IRONHEART. It opens Nutrition with the content ready to log.

Manifest:

```ts
share_target: {
  action: "/share-target",
  method: "POST",
  enctype: "multipart/form-data",
  params: { title: "title", text: "text", url: "url", files: [{ name: "image", accept: ["image/*"] }] },
},
```

Implementation:
1. **Route:** `app/share-target/route.ts`, a `POST` handler. It stores the shared image or text
   in IndexedDB (the app already uses Dexie for offline data; reuse the existing store) and
   redirects to `/nutrition?shared=1`. It must not write to Supabase directly. The existing
   sync path handles that.
2. **Auth:** the POST must pass `proxy.ts`. If the user is signed out, redirect to `/login`
   and keep the shared data in IndexedDB until they sign in. Do not drop it.
3. **Service worker:** the current `fetch` handler returns early for non-GET requests
   (`req.method !== "GET"`). Add an explicit branch for `/share-target` so the POST reaches
   the route. Do not cache it. Keep the early return for everything else.
4. **Nutrition screen:** when `?shared=1` is present, read the pending share from IndexedDB,
   show the existing logger prefilled, then clear the pending item once it is saved or dismissed.
5. **Size limit:** reject files over a set size (pick 5 MB and document it) and show a short
   message. Do not silently truncate.
6. **Privacy:** shared content stays local until the user saves a log entry. Add a line to
   the privacy notes. Do not send shared files to any third-party service.

**Tests:**
- E2E: POST a small image to `/share-target` while signed in, land on `/nutrition?shared=1`, see the prefilled logger.
- E2E: same POST while signed out lands on `/login`, and after sign-in the shared item is still there.
- Unit: the size limit rejects a file over the limit.

**Acceptance:** works on Android Chrome (manual check, record in notes). iOS: the feature is absent. Confirm the app still works normally there.

---

## 4. Phase C (optional, defer unless asked): protocol handler

Only if partner invites need a link that opens the app directly.

- Scheme: `web+ironheart` (must start with `web+`).
- Manifest: `protocol_handlers: [{ protocol: "web+ironheart", url: "/invite?code=%s" }]`.
- Build a `/invite` route that validates the code server-side. Reject malformed codes.
- Chromium asks the user for permission. Write the copy so an elementary-school reader can
  understand it, and do not auto-accept anything.

Do not start this phase without an owner decision. It touches the pact-joining flow, which
is security-sensitive.

---

## 5. Handoff prompt for the builder model

Paste this into a fresh session on branch `gng/compassionate-albattani-i604ah`:

> Read `docs/13_PWA_ENHANCEMENTS_SPEC.md`, `CLAUDE.md`, `AGENTS.md`, and `PHASE_6_NOTES.md`.
> Build **Phase A only** (section 2). Verify every route and icon you reference exists. Check
> browser support for each manifest member in MDN and write the results into `PHASE_7_NOTES.md`
> (use the next free phase number per `docs/12_ROADMAP.md`). Extend `e2e/pwa.mjs` and add the
> vitest manifest test. Run `npm run lint`, `vitest`, and `npm run e2e` (or the PWA test if the
> full suite is too slow). Report pass or fail with real output. Do not claim a check passed
> unless you ran it. Do not commit until everything passes, then commit with a clear message and push.
> Stop after Phase A and wait for approval before Phase B.

## 6. Verification checklist (for the reviewer)

- [ ] Every shortcut URL is a real route and works when signed in
- [ ] Shortcut icons are 96×96 PNG and generated by `scripts/icons.mjs`
- [ ] `launch_handler` present, `focus-existing`
- [ ] iOS: manifest still validates, install still works, no console errors on load
- [ ] `e2e/pwa.mjs` covers the new fields
- [ ] Phase notes record browser support checked and what was not tested
- [ ] No secrets, no new third-party scripts, service worker still never caches auth/API routes
