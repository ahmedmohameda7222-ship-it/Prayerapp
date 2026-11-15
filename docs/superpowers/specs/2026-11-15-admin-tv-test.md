# TV Test: remote-controlled admin rehearsal mode

Status: User-requested 2026-11-15. Build in its own PR; existing production feed, prayer engine and calendar stay authoritative.

## Outcome
The mosque's installed TV can be demonstrated to administrators without waiting for Adhan, Iqama or Friday. The privileged `/admin/tv-test` page offers prayer selection and scenario buttons, reports active scenario/remaining expiry, and includes **Stop Test** to restore live mode immediately. Only authorized admins can start or stop tests. Other public pages are unaffected.

## Approaches
- **Admin-only iframe preview:** low risk but does not change physically mounted TV, so insufficient.
- **Editing prayer times to force conditions:** dangerous and would corrupt the canonical schedule; explicitly prohibited.
- **Ephemeral server-issued TV test command (selected):** isolated command table, short expiry, root-API read-only status, same-origin TV proxy, short polling. The TV derives test display from the validated public Feed without ever saving or modifying production times.

## Safety
- Service-role-only `masjid_display_tv_test` table with RLS enabled; no anon/auth grants. Exactly one active command for the single TV screen. Public GET returns only an allowlisted scenario, prayer and time data, never the admin token or ID.
- Root Admin server actions are secured with `requireAllowedAdminIdentity` and existing admin audit; commands validated server-side (scenario and prayer enum, bounded TTL).
- Automatic expiration after at most 180 seconds using absolute server timestamp; a lost network connection cannot hold an old test indefinitely.
- TV polls same-origin `/api/tv-test` every three seconds; no permanent local storage. If status fetch fails, retain active command only until expiry.
- An explicit visible **TEST MODE** indicator during simulations distinguishes dummy times from real schedule; Stop resets; otherwise no state override.
- Use actual published Feed and simulated logical clock for prayer transitions and Friday service logic. If feed schedule is missing, fail closed rather than invent prayer times.
- Normal content demo uses real published items already present in the Feed; missing categories are clearly unavailable, not fabricated.
- Existing offline/LKG, clock, watchdog, QR, feed validation and normal 120-second feed polling are unaffected.

## Rehearsal cases
1. Fajr, Dhuhr, Asr, Maghrib, Isha: approaching, Adhan-now, waiting Iqama, Iqama-now, in-progress, post-prayer four-minute board.
2. Friday: pre-service countdown, Jumuah-now, including additional services where available.
3. Normal: next-prayer hero, general rotation, Azkar, announcements, events, campaigns and Maghrib program if actual published content is available.
4. Server control: Start, switch immediately, Stop, expiry, loss of connectivity. Test preview on live physical TV and show command status in Admin page.

## Future work compatibility
Blackout after Iqama and German-only khutbah are separately approved but **not present in main as of this branch**. The rehearsal mode reuses the genuine state renderer; when those features are implemented, the in-progress/Jumuah scenarios must show their new live behavior, not a mocked substitute. Do not advertise these future behaviors as verified here.
