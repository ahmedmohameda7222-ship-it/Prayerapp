# TV Layout V2 — Approved Interactive Preview

**Approval:** 2026-11-14 user explicitly approved the interactive HTML prototype `prayerapp_tv_layout_v2_preview.html` shown in this conversation. This document governs translation of that *prototype* into the production Next.js TV display, not the review controls themselves.

**Visual source of truth:** 1920×1080 viewport of the approved HTML. Deep emerald (#061713–#12372f) background, restrained gold (#dac58a), no photography, faint geometric pattern, mosque branding/date/live clock header, large hero slot, six-card prayer rail + persistent app QR, understated fullscreen control. Preserve screen legibility at 1366×768 and fullscreen 1920×1080. The preview QR is a fake; production must keep real, scannable `QRCodeSVG` values.

**State layouts:**
- L01 approaching: prayer name, strong time-to-Adhan countdown, optional target time.
- L02 prayer-now: prayer name and clear present-tense message, no countdown.
- L03 waiting for Iqama: large countdown and actual Iqama target.
- L04 Iqama-now: calm but unmistakable bilingual announcement.
- L05 prayer in progress: quiet minimal static hero.
- L06, L06b & L07 Friday primary/additional count and now: service number and time from Friday engine, no guessed Iqama.
- L08 Morning/Evening/Friday regular Azkar: bilingual body and source; separate language frames for long source text as already scheduled.
- L08c/d Post Prayer: **fixed unchanging board** for **240 seconds** immediately after congregational completion, not 10-second rotating Azkar slides. Sort by existing `sortOrder` (Hisn al-Muslim 66–73), preserve text, repeat count and special Fajr/Maghrib scope; 8 selected = 2×4 large panels, 9–18 selected = 3×6 compact board with full content preserved in DOM. Do not infer or manufacture text. All items shown must be published and selected in the Feed. Friday primary/extra post-Jumuah uses the existing 30-minute state hold. Prayer states always override this board. The four-minute deadline is absolute in the Berlin-local prayer schedule, not a mutable browser countdown.
- L09 normal announcement; L10 special announcement with distinct treatment; L11 event one large date/time/location composition; L12 campaign with progress bar and distinct donation QR; L13 Maghrib program with lesson and combined-Isha callout.
- L14 urgent banner, L15 offline LKG state, L16 coverage stale warning, L17 no-content next-prayer fallback, L18 initial loading, L19 fatal error. Preserve all source safety and existing connectivity semantics.

**Technical architecture:** Retain root prayer engine, public Feed contracts and date calculations, root Admin, public routes, Friday and ordinary state rules, QR values, LKG cache, pixel shift, clock, and fullscreen logic. Create a post-prayer timing state resolved from the existing validated Feed, make 4m state strictly superior to normal Scheduler and inferior to live prayer/Jumuah states. Components should be differentiated by content/state and use V2 CSS tokens; do not hardcode sample preview prayer times or fictional campaign money into production.

**Excluded:** No new photo or generated artwork; no sleeping Azkar; no TV runtime data entry UI; no audio; no migration/SQL unless user separately authorizes more selected source texts. The approved preview's side navigation, fake QR, accelerated clock, inspector and demo-switching are review-only; never show on mosque TV.

**Verification:** RED/GREEN state and board tests; existing tests; TV typecheck/lint/build; root CI, TV integration, security, Android as applicable; deploy main-only after squash merge and verify TV Vercel production READY.
