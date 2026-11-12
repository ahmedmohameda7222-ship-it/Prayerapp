# Web PWA and Android TWA offline mode

Status: PR #136 candidate — software verification and physical-device sign-off remain separate.

## User behavior

1. **First visit must be online.** The production public runtime registers `/sw.js` independently of Push consent. The worker caches the small standalone `/offline.html` and `/offline.js` dashboard and a verified, published public prayer schedule. Android TWA also uses Chrome's Service Worker storage after an online launch.
2. **Network loss while the app is open:** already-rendered pages and prayer times remain visible, with an explicit localized offline banner. Realtime updates, auth actions, online payments, push subscription changes and external pages require internet.
3. **Relaunch without network:** a previously cached eligible public page can open from the existing public page cache. If that page was never cached or is marked private/no-store, the worker returns the self-contained offline dashboard instead. It reads the last verified public prayer-schedule snapshot from its own cache and lists the mosque-local date, six prayer/sunrise times and approved Iqama offsets. Dates can be browsed within the published snapshot.
4. **Android TWA first launch while offline:** there is no installed browser Service Worker yet. The native Launcher shows localized network-required instructions and Retry. This first-launch-only guard is skipped once a launch with validated connectivity has been attempted, so previously installed browser SW caches remain accessible during subsequent network outages.
5. **Reconnect:** service worker update and public snapshot refresh are requested on connectivity return or visible foreground, throttled to 15 minutes per active page. Normal live pages also retain their existing prayer runtime refresh logic.

## Canonical religious data

- GET `/api/offline/prayer-schedule` returns **only** `{schemaVersion, timezone, fetchedAt, iqamaDelays, rows}`. Each published daily row has only its ISO date and six HH:mm values. The endpoint is account-independent and contains no database row identifiers, authentication, subscription, donation, or admin data.
- Published timetable is the source of truth. This feature never calculates replacements client-side, edits the Prayer Engine, saves mock data or invents Iqama times. If the mosque hasn't published a date, the offline screen explicitly shows no published data.
- The existing Supabase atomic snapshot RPC allows at most 93 days per range and 62 days for relative horizons. The endpoint therefore splits its roughly one-year read into contiguous **90-day** absolute-date windows and checks that all returned timezones and bounds match the applied authority. No database migrations or production writes.
- Primary Friday is always the published Dhuhr time, not an independently configured cached value. Optional second/third Friday services and rapidly changing announcements are not certified by this offline snapshot and must not be implied to be current.
- Saved `fetchedAt` and timezone are visible. The worker rejects malformed, private, non-200 or unbounded snapshots; cached schedules older than 370 days are not used. When a date isn't available, no time is fabricated.

## Storage and security

- Service Worker v19 owns versioned shell/static/image/page/data caches. One dedicated cache entry stores the last verified public schedule; other storage is bounded by existing caps.
- `/admin`, `/account`, all unrelated `/api` routes, non-GET requests, authenticated requests and Supabase URLs remain network-only. Existing `private`/`no-store` response exclusions and legacy private-page cache purging remain enforced.
- The snapshot response is public, immediately revalidated by the browser when online, and locally cached only after semantic validation. Network errors never overwrite the previous verified copy.
- Browser or OS storage eviction, cleared application data, unknown fresh installations, a missing Service Worker, a discontinued webpage and a future date outside the published range cannot guarantee offline operation.

## Software and later physical verification

- Unit: public DTO sanitization; no unpublished rows; Iqama and ISO validation; 367 calendar dates across leap/DST; SW validated-data read-through, bad-response rejection, private-route bypass, navigation fallback; Android first-launch policy; offline banner.
- CI: root lint/test/build, Android local JUnit and debug build, security scans. Do not call a GitHub workflow green until the exact-head check completes.
- **Later on real devices:** open Web PWA and Android TWA once online, confirm cached published date + Iqama, enter airplane mode, kill and relaunch, navigate uncached public URLs, browse the next published day, switch device timezone and return online. Verify iOS Safari/installed PWA SW lifecycle separately. Physical-device certification is **not executed** by this PR.

Scope deliberately prioritizes a reliable **read-only prayer timetable** over offline actions that need a server or a user's account. Previously opened public pages may be reused subject to cacheability; the app does not claim that every news post, payment, map, or third-party media item is downloaded for offline use.
