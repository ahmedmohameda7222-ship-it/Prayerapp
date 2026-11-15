# Calibri-first TV Typography — 32-inch Samsung + Amazon Silk

## Intent
Physical 32-inch Samsung TV is viewed from roughly 6 metres through Amazon Fire Stick. User requests Calibri for clear Arabic and German across the WHOLE TV, increasing all small text while retaining the approved layouts, prayer timeline, full black during congregation, Friday German khutbah, rotating post-prayer dhikr and Fire TV Wake Lock.

## Platform reality and font strategy
Microsoft Calibri regular/bold covers both Arabic and Latin, but is proprietary and not licensed to redistribute as a webfont. Do not commit or share any Calibri binary. Use CSS Calibri first, then locally packaged open-source Carlito (Calibri metric-compatible Latin) and Noto Sans Arabic (Arabic glyph coverage), followed by OS sans-serif. Next.js next/font/google self-hosts these on successful production build: no font CDN runtime dependency. System fallback remains for page startup or offline cache misses. No background font changes in Admin or mobile apps.

## Layout changes
Apply a final, centrally maintained TV-specific CSS stylesheet after tv-v2.css and globals.css.
- Scale visible main header (mosque identity/Arabic name/date/clock) and all small textual elements including Iqama in six-card rail and QR caption.
- Use generous Arabic and German copy for normal Azkar, post-prayer single-page rotation, Friday sermon, next-prayer hero, state alerts, announcements, events, campaigns, and Maghrib program.
- Keep all six prayer cards on one landscape row, no ellipsis/truncation or clipped text; no scroll UI under a physical TV. Preserve QR and blackout overrides.
- Maintain bounded text scaling for long Arabic/German and font fallback for 720p and 1080p.
- Never change prayer calculation, Iqama offsets, selection of religious texts, timers, state machine or tests of real TV.

## Acceptance
- CSS first font family Calibri for both scripts; locally self-hosted open-license fallbacks; no copyrighted fonts in source.
- Minimum 720p TV landscape reading target: header/name around 24–32px, prayer clocks >=40px, Iqama >=20px, essential captions >=18px, primary Arabic around 50–65px, German >=28px when enough space.
- Tests assert full stylesheet loaded after existing rules, font stack and critical minimum sizes, no clipping/ellipsis on post-prayer dhikr, all six cards and black state retained.
- CI: TV unit/lint/typecheck/build, two-app integration, Root CI, Security, Android. Physical viewing at 6m is user validation, not automatically proven.
