# TV 32-inch distance readability and adaptive after-prayer rotation

## Source and intent
User supplied physical photos of a Samsung 32-inch TV on 2026-11-15 and requested legible text at approximately 6 metres. Current header, six-prayer rail, hero, normal azkar and after-prayer dense grid are too small. The TV is already running the released V2; change the actual TV implementation, not a preview.

## Approved presentation
- Rebalance fixed TV viewport: visibly larger mosque name/date/clock, six prayer cards (including Iqama), state headings and prayer names, countdown, normal azkar and Friday/other central content. Prioritize large typography over decorative padding while preserving the six-card rail and QR; retain 16:9 desktop TV and responsive narrow-screen fallback without clipping. Do not promise real-world six-metre legibility without a physical check.
- Black congregational prayer DOM bypass, durations, Adhan and Iqama logic, Friday service semantics and production prayer engine/feed are unchanged.
- Replace the post-prayer 2x4 / 3x6 static board with exactly one large, source-backed dhikr at a time. Short text can show Arabic and German together. Long text must be paginated on word boundaries and shown in separate Arabic then German slides; no ellipsis, clipping or omitted content. Keep repetition count, source and position / remaining time visible.
- Every slide duration is deterministic from Arabic and German word count and repeatCount (readable pacing, minimum dwell); the complete selected prayer-scoped playlist has its own calculated duration, **not** fixed at four minutes. No repeating forever: after last slide return to NORMAL. Earlier prayer/Friday states can preempt it. No selected content => NORMAL. Friday post-prayer uses the existing completion point and the same adaptive playlist.
- Admin TV Test must use the same computed absolute time and tell admins that post-prayer slides rotate. Stop / expiry reverts as before.

## Safety and verification
- Unit tests for reading-time calculation, repetition, splitting / lossless word content, deterministic boundaries, selected order, prayer-specific selection, empty feed, Friday and midnight; component tests for exactly one readable item and subsequent transitions; CSS regression for TV typography and anti-clipping styles.
- Verify Masjid Display tests/lint/typecheck/build, root CI / Android / security, review before release. Physical 32-inch visibility remains user QA, not an automatic PASS claim.