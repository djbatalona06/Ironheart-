# Camera Spec

## Purpose
- **Photo check-ins**: optional photo attached to a workout → marks that day
  "verified" on the pact calendar (`media.is_checkin = true`)
- **Progress photos**: saved to a workout or profile
- **Form clips**: 5–15s video with a **manual caption** (auto-captions are post-MVP)

## iOS PWA Caveats
Confirmed requirements:
1. **`playsinline` + `muted`** on every `<video>`, or iOS goes fullscreen
2. **HTTPS required**: test on Vercel preview URLs, not LAN IPs
3. **getUserMedia can fail or end its track right away**: retry up to 3× with
   500ms delay, then fall back to `<input type="file" accept="image/*,video/*" capture>`
4. **Recorder cleanup between recordings**: `recorder.stop()` → stop every
   track → null the stream/recorder refs → wait ~300ms before starting again.
   Repeated recordings without this are a known source of failures.

To verify on a real device (`// TODO: verify on device`, not hard requirements):
- Front-camera orientation mismatch on some iOS versions. If seen, detect
  `videoWidth > videoHeight` in portrait and rotate the preview with CSS.
- Camera permission in standalone mode. If the prompt never appears, show the
  instructions screen (Settings → Safari → Camera) plus the file-input fallback.

## Storage Limits (Supabase Free: 1 GB total, 50 MB/file)
- Photos: `browser-image-compression` → max 1280px, < 500 KB, JPEG
- Video: 15s hard stop, 720p constraint, 1.5 Mbps → ~11 MB
- Over 50 MB (shouldn't happen) → reject, offer re-record
- **Fallback**: upload fails with a quota/413 error or the device is offline →
  save the blob in Dexie, `storage_path = 'local:{key}'`, show "Stored on this
  device" badge + Export button. Offline items retry upload on reconnect;
  quota failures don't.

## Recorder Config
```ts
const mimeType = MediaRecorder.isTypeSupported('video/mp4') ? 'video/mp4' : 'video/webm';
const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 1_500_000 });
// constraints: { video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: true }
```

## UX Flow
1. Center Camera tab, or "Add photo check-in" from the Logger (check-in mode)
2. Permission → full-screen preview, black bars top/bottom
3. Front/back toggle (top-right), Photo | Video pills
4. Photo: shutter → preview → attach to workout / save to profile / retake
5. Video: record → 15s countdown ring → auto-stop → preview → caption field → save
6. Save: compress → upload → or local fallback → `media` row
7. Check-in mode: save returns to the Logger with a thumbnail

## Privacy
- Paths: `media/{user_id}/...`, private bucket, owner-only RLS
- Partner sees check-in photos only, through short-lived signed URLs
- Local-fallback media never leaves the device unless exported
