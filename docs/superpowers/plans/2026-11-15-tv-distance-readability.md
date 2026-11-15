# Plan: TV 32-inch readability and dynamic post-prayer slides

1. Add RED deterministic playlist tests that demonstrate single-dhikr rotation, length-sensitive dwell and repetition, long Arabic/German pagination and end-of-playlist return to NORMAL.
2. Implement `masjid-display/lib/post-prayer-playlist.ts` as the single read-time and slide-selection authority. Share it between state resolver and renderer; no persistence/timers.
3. Replace fixed-four-minute post-prayer window and grid with one-item-at-a-time large Arabic/German presentation. Update affected pre-existing tests and Admin TV Test copy. Preserve blackout/Friday priority and selected-only fallback.
4. Rebalance 16:9 CSS for 32-inch viewing: increase header/date/clock, six prayer cards, hero/normal azkar, next prayer and Friday prose; remove excessive whitespace. Avoid overflow at 1280x720 and 1920x1080. Retain the separate QR and the literal-black screen.
5. Run GitHub CI (TV Vitest, typecheck, lint, build, root, Android and Security), inspect code review, fix any regressions, squash merge and verify both Vercel production deployments. Do not trigger live physical TV Test.