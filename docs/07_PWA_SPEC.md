# PWA Spec: iOS-First

## Goal
Installs to the iOS home screen, opens standalone, works offline for logging,
camera works.

## Manifest (`app/manifest.ts`, Next.js built-in)
```ts
import type { MetadataRoute } from 'next';
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'IRONHEART',
    short_name: 'IRONHEART',
    start_url: '/home',
    display: 'standalone',
    background_color: '#0A0A0A',
    theme_color: '#D4AF37',
    orientation: 'portrait',
    icons: [
      { src: '/icons/192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
```

## Service Worker (`@serwist/next`)
`next-pwa` is unmaintained and doesn't work with the App Router.
```ts
// next.config.ts
import withSerwistInit from '@serwist/next';
const withSerwist = withSerwistInit({
  swSrc: 'app/sw.ts',
  swDest: 'public/sw.js',
  disable: process.env.NODE_ENV === 'development',
});
export default withSerwist({ /* next config */ });
```

## iOS Head Tags (via Next `metadata` / `viewport` exports)
- `appleWebApp: { capable: true, title: 'IRONHEART', statusBarStyle: 'black-translucent' }`
- `apple-touch-icon` → `/icons/180.png`
- `viewport: { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#D4AF37' }`

## Install Prompt
iOS never fires `beforeinstallprompt`. Custom banner on the 2nd visit when not
standalone: "Install IRONHEART: tap Share → Add to Home Screen". Dismissal is
stored in localStorage.

## Camera Permission in Standalone
Detect standalone with `matchMedia('(display-mode: standalone)')`. If the camera
is denied or the prompt never shows, display the instructions screen and the
file-input fallback (see 06).

## Caching Strategy
| Resource | Strategy |
|---|---|
| App shell, fonts, icons | Precache |
| Pages (navigations) | NetworkFirst, 3s timeout, offline fallback page |
| Supabase REST GETs | NetworkFirst, 5s timeout, 24h max age |
| Images | CacheFirst, 30 days, 100 entries |
| Mutations | Not cached; workout/nutrition writes go to the Dexie queue |

## Offline Sync
- Dexie queue flushed on the `online` event, on `visibilitychange` → visible,
  and on app start
- No Background Sync API (unsupported on iOS Safari)
- UI: "Syncing" badge per pending item; global "Offline" pill in the header

## Splash Screens
Generate with `pwa-asset-generator`: black background, gold mark.

## Native-Feel Checklist
- [ ] `overscroll-behavior: none` on body
- [ ] `user-select: none` on nav and buttons
- [ ] `-webkit-tap-highlight-color: transparent`
- [ ] Safe-area padding `env(safe-area-inset-*)` on header and bottom nav
- [ ] `navigator.vibrate(10)` where supported (iOS ignores it, which is fine)
- [ ] `playsinline` on all videos

## Keepalive (`vercel.json`)
```json
{ "crons": [{ "path": "/api/health", "schedule": "0 9 * * *" }] }
```
`/api/health` checks `Authorization: Bearer ${CRON_SECRET}` and runs a real
query so Supabase registers activity.
