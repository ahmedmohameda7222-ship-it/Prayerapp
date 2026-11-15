# TV five-prayer blackout and German-only published Friday sermon

User-approved behavior (2026-11-15, conversations prior to and following TV Test release #143).

## Weekday prayer state sequence
- PRAYER_APPROACHING: unchanged; canonical Adhan countdown, real times.
- PRAYER_TIME_NOW: bilingual heading **حان الآن موعد أذان صلاة** / **Jetzt ist Zeit für den Adhan zum Gebet**, then prayer name independently. Retain existing up-to-2m adhan state and real time label.
- WAITING_FOR_IQAMA: unchanged real countdown.
- IQAMA_NOW: bilingual heading **حان الآن موعد إقامة صلاة** / **Jetzt ist Zeit für die Iqama zum Gebet**, then prayer name. Exactly 30 seconds starting from canonical Iqama instant.
- PRAYER_IN_PROGRESS: absolutely **black screen**, no header, clock, footer, QR, status, background, text, logos, animation, diagnostics or test badge. Time duration begins **after** the 30-second Iqama announcement: Fajr 6min; Maghrib 7min; Dhuhr, Asr and Isha 10min. These are fixed presentation times, not Admin configurable `prayerDurations`.
- POST_PRAYER_AZKAR: existing full-height static 4m sourced from selected Hisn al-Muslim and existing prayer-scoped selection, beginning immediately after full blackout; if no selected after-prayer content, return NORMAL instead of empty board.
- NORMAL: existing 10s rotation, next prayer and content. Other prayer state can preempt as before.

## Friday exception
- Preserve existing primary Friday from Dhuhr and additional Admin-configured service times and 30m focus/hold; never create Friday Iqama or blackout.
- During JUMUAH_NOW the TV shows only **published German khutbah** from Admin's `friday_khutbahs.title_de` and `content_de` for that Berlin-local Friday date. Arabic, English and Turkish khutbah fields must not be returned to TV. Do not invent alternate-language content if unpublished or German body empty: calm German-language unavailable placeholder.
- Separate small public read-only root endpoint for one Friday and TV same-origin proxy, server select only published title_de/content_de. Do not enlarge or alter main prayer Feed budget (128KB). No browser admin credentials or secrets.
- Display German paragraphs on legible timed pages (if long); keep mosque header, prayer rail and ordinary Friday rendering precedence. Do not mix normal rotation or urgent banners into khutbah hero.
- A TV offline after previously loading same-date published content may retain in-memory copy for that date; no cross-date leak.

## Test integration and safety
- Existing Admin TV Test #143 scenarios must exercise the new lifecycle, including physically black PRAYER_IN_PROGRESS, 30s IQAMA_NOW, and German sermon during JUMUAH_NOW. Real commands remain 180s TTL and Stop; simulation must derive exact same hardwired blackout end as runtime.
- Preserve feed validation, high-latitude settings, timezone, DST and midnight behavior; device time independent while offline (existing logical clock).
- Do not alter production Supabase prayer times/settings or display Feed.
- Test at second boundaries, Friday primary/additional, 30s message, per-prayer durations, zero Iqama delay, midnight Isha, black DOM, post-prayer timing, German published/unpublished source, and TV Test behavior.
