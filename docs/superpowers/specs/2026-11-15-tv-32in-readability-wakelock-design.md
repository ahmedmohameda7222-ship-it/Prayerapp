# Physical 32-inch TV: readability, rotating post-prayer dhikr, Fire TV wake request

## Source and decision
Physical Samsung 32-inch photos provided 2026-11-15 show small header/clock, six prayer cards, hero text, and a dense 18-card postprayer grid. User wants readability from roughly six metres and the whole landscape display used, plus a Fire Stick that does not fall idle after ~five minutes. Work on TV presentation only, not prayer schedules/Prayer Engine/production database.

## Behavior
- In landscape 16:9 TV browser viewport, enlarge logo/brand, Gregorian/Hijri date, live clock, prayer and Iqama clocks, and hero/Adhan/Iqama/normal Arabic and German copy. Keep six prayers plus QR, no clipped times, preserve fullscreen black congregation, Friday priority, diagnostic/test state.
- Post-prayer: one selected Hisn al-Muslim dhikr at a time, full Arabic and German, repeat count and source, with generous reading size and a progress indicator; deterministic progression anchored to canonical blackout end. Each item holds long enough for language reading and repetitions; total time is derived from selected items, not fixed 240 seconds. Selected prayer-scoped content only; return to normal after last item; real prayer or Friday state preempts.
- Admin test should preview one real rotating dhikr and still expire after 180 seconds; Stop restores live mode.
- Fire Stick: use native Screen Wake Lock API from visible HTTPS page when supported, reacquire on wake/visibility and check every four minutes. No synthetic click/mouse move or forced page reload to spoof hardware activity. If Silk/Fire OS does not support or honor Wake Lock, TV OS-level configuration or native wrapper KEEP_SCREEN_ON is needed; do not claim guaranteed prevention of Amazon screensaver or power-off.
- No audio/video playback, no permissions escalation, no writes.

## Design choices
- Reuse immutable validated Feed and state resolver; keep reading-time calculation and item lookup pure and unit-tested.
- Single item presentation over a truncated multi-column grid; content size capped responsively for long text.
- Browser Wake Lock held while document is visible; cleanup on unmount; no hidden wake assertion when unsupported.
- Existing Prayer Time Now/Iqama 30 seconds/blackout durations and Friday German sermon remain unchanged.
