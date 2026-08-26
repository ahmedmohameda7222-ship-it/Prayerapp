# Prayerapp Friday V2 + Khutbah Automation — Approved Design Spec

**Status:** APPROVED

**Date:** 2026-08-26

**Scope:** Arabic header branding, Hijri date display correction, automatic Friday/Jumu'ah schedule derivation, Friday-specific Dhuhr naming, Admin additional Jumu'ah management, one multilingual Friday khutbah per Friday, and public khutbah reading UX.

This document is binding. Implementation may adapt internal code organization to the actual repository, but may not change product behavior without user approval.

---

## 1. Product goals

1. Replace the current Arabic header wordmark with the approved Thuluth-style artwork.
2. Fix the visually incorrect Arabic Hijri date ordering.
3. Make Friday/Jumu'ah work automatically from the published prayer schedule without requiring the Admin to recreate the Primary Friday prayer every week.
4. Treat the regular Friday `dhuhr` time as the mosque's **Primary Jumu'ah / first Friday prayer**.
5. Let Admin add only extra Friday services for people who miss the Primary Jumu'ah.
6. Change the public display name of Dhuhr to Jumu'ah on Fridays only, without changing calculation/storage semantics.
7. Let Admin write and publish one khutbah per Friday in any subset of Arabic, English, German, and Turkish.
8. Let users read the published khutbah immediately, even before Friday arrives.

---

## 2. Approved Arabic brand wordmark

### Visual source

Use `assets/approved_arabic_thuluth_wordmark_reference.png` as the approved visual reference.

A vector path asset is included at `assets/approved_arabic_thuluth_wordmark.svg` for implementation. Preserve its silhouette and do not substitute a live font-rendered title.

### Semantic spelling

Accessible Arabic wordmark text:

`مَسْجِدُ الدُّونَاوْ`

Critical spelling: `الدوناو` uses **د**, not **ذ**.

### Locale behavior

- Arabic locale: display approved SVG wordmark.
- English/German/Turkish: keep existing localized text brand names.
- Keep the association line exactly: `Deggendorfer Integrations und Bildungsverein e.V`.
- Keep `Deggendorf` in its current tertiary position.

### Technical requirements

- Remove the giant old inline Arabic path from `AppHeader.tsx`.
- Final wordmark must have no runtime font dependency.
- Do not embed the PNG as a base64 image inside SVG.
- Preserve current header color direction: cream wordmark on forest-green header.
- Prevent clipping of diacritics and long Thuluth strokes at narrow widths.

---

## 3. Hijri date correction

### Existing issue

The current Arabic Hijri date visually orders parts incorrectly because a full localized `Intl` string is inserted into RTL context.

### Approved output

For Arabic, render in this logical visual order:

`DAY MONTH YEAR هـ`

Example form:

`١٣ ربيع الأول ١٤٤٨ هـ`

### Rules

- Keep `islamic-umalqura`.
- Keep `Europe/Berlin`.
- Use `Intl.DateTimeFormat(...).formatToParts()`.
- Reassemble day/month/year/era explicitly.
- Isolate numeric parts with bidi-safe markup (`bdi` or equivalent semantic isolation).
- Arabic Hijri date uses Arabic-localized digits.
- Prayer times remain in the existing familiar time display format; do not globally convert prayer times into Eastern Arabic numerals.
- Do not alter Gregorian date localization outside what is necessary for bidi correctness.

---

## 4. Friday source-of-truth model

There are three distinct sources:

```text
prayer_times
    ↓
Primary Jumu'ah (automatic, immutable)

jumuah_times
    ↓
Additional Jumu'ah services only

friday_khutbahs
    ↓
One optional multilingual khutbah per Friday date
```

### Primary Jumu'ah

For a published `prayer_times` row whose date is Friday:

- Primary Jumu'ah time = `prayer_times.dhuhr` exactly.
- Never use `dhuhrIqama` for Primary Jumu'ah.
- It is virtual/derived and is **not** inserted into `jumuah_times`.
- It is always service #1.
- It is immutable from the Friday Admin screen.
- Admin cannot edit, delete, unpublish, or override the Primary Jumu'ah.
- To change Primary Jumu'ah, the authoritative prayer schedule itself must be changed through Prayer Times management.

Rationale: the Dhuhr time is the mosque's announced Primary Friday time and gives people enough notice to reach the mosque.

### Additional Jumu'ah services

`jumuah_times` rows for a Friday represent only services after the Primary.

- Admin enters one time per additional service.
- No separate khutbah-time field in the new workflow.
- Sort ascending by `prayerTime`.
- First valid additional row = Jumu'ah 2.
- Second valid additional row = Jumu'ah 3.
- Continue numerically if more are created.
- Each additional time must be strictly later than Primary Jumu'ah.
- Duplicate additional times are invalid.
- Existing optional location, khateeb, language and notes metadata may remain available.

### Legacy rows

If old data contains a `jumuah_times` row exactly equal to Primary `dhuhr`, the public resolver must deduplicate it so Primary appears only once.

If an old additional row is earlier than or equal to Primary:

- do not display it publicly as an additional Jumu'ah;
- do not delete it silently;
- show Admin a warning so it can be corrected.

---

## 5. Automatic upcoming Friday detection

Use `Europe/Berlin` as the only app timezone.

The public Friday page must derive its schedule from published `prayer_times`, not from the existence of `jumuah_times` rows.

Behavior:

- Monday–Thursday: select the next Friday with a published prayer-times row.
- Friday: select today while at least one Friday service has not passed.
- Friday after the final Friday service: advance to the next Friday with a published prayer-times row.
- Saturday/Sunday: select the next Friday with a published prayer-times row.
- If no published prayer-times row exists for the required Friday, do not invent a time; show the established empty/failure state.

The resolver must work when there are **zero** additional Jumu'ah DB rows.

### Home card

Preserve the current normal Home Jumu'ah visibility policy (Wednesday through Friday) and the existing QA preview override. The card's schedule source changes to the new resolver, so Primary Jumu'ah exists even without Admin Friday rows.

---

## 6. Friday-specific Dhuhr naming

This is a display/domain-context rule only.

Internal prayer storage/type remains `dhuhr`.

On Friday only, when displaying the `dhuhr` prayer name to users, render:

- Arabic: `الجمعة`
- English: `Jumu'ah`
- German: `Freitagsgebet`
- Turkish: `Cuma`

On all non-Friday dates, keep normal Dhuhr/ظهر/Öğle labels.

Apply this consistently across public prayer surfaces so the same Friday date never shows `الظهر` in one place and `الجمعة` in another.

Do not alter prayer calculation order, next-prayer calculation, stored field names, reminder identifiers, or database columns.

---

## 7. Public Friday page UX

The Friday page remains a dedicated public destination.

### Schedule structure

For a Friday with `dhuhr = 12:18` and Admin extras 13:30 and 14:30:

```text
Jumu'ah 1 / الجمعة الأولى     12:18   ← automatic Primary
Jumu'ah 2 / الجمعة الثانية   13:30   ← Admin
Jumu'ah 3 / الجمعة الثالثة   14:30   ← Admin
```

The Primary may have a subtle localized label indicating it is the main/primary Friday prayer, but do not expose implementation text such as “from prayer_times”.

### Live/next Friday hero

Use the unified computed schedule.

- Before Primary: hero targets Primary.
- After Primary, if another service remains: hero advances to the next additional service.
- Continue advancing through services.
- After final service: Friday page advances to next Friday according to the resolver rule.
- Preserve the existing five-minute “imminent” behavior unless a test shows a conflict with the approved semantics.

---

## 8. Admin Friday management UX

Default Admin page is centered on the upcoming Friday derived from `prayer_times`.

### Primary section

Show:

- Friday date.
- Primary Jumu'ah time from `dhuhr`.
- locked/read-only state.

Admin cannot change it from this page.

### Additional services

Admin can:

- add another Jumu'ah;
- edit an additional Jumu'ah;
- delete an additional Jumu'ah;
- publish/unpublish additional rows.

Required input for each additional service:

- one `prayerTime`.

Optional existing metadata may remain:

- language(s)
- khateeb
- location
- notes

The current separate `khutbahTime` form control is removed from the new workflow. The legacy DB field remains nullable/deprecated for compatibility.

### Friday selector

Admin can select another Friday in order to prepare future weeks. The selector must be sourced from actual available `prayer_times` Friday rows; do not offer arbitrary non-Friday dates.

Default selection: upcoming Friday.

### Validation

Enforce on the server, not only in UI:

- selected date is Friday;
- matching prayer-times row exists;
- `HH:mm` is valid;
- additional time > `prayer_times.dhuhr`;
- no duplicate additional time on that date.

---

## 9. Friday khutbah data model

Create a new table:

`friday_khutbahs`

One row maximum per Friday date.

Fields:

- `id uuid primary key`
- `date date unique not null`
- `title_ar text null`
- `content_ar text null`
- `title_en text null`
- `content_en text null`
- `title_de text null`
- `content_de text null`
- `title_tr text null`
- `content_tr text null`
- `published boolean not null default false`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

All four languages are optional individually.

There is exactly one khutbah per Friday date. Jumu'ah 1, 2, 3, etc. for the same Friday all point to/read the same khutbah implicitly by date.

Do not duplicate a khutbah per service.

---

## 10. Khutbah Admin editor

Admin may prepare the khutbah in any subset of:

- العربية
- English
- Deutsch
- Türkçe

Each language has:

- optional title;
- optional content.

### Draft

A draft may be completely empty while being prepared.

### Publish

Publish is allowed when **at least one** `content_*` value contains non-whitespace text.

Titles alone do not make a language available and do not satisfy publish validation.

If a language has content but no title, public reader uses a generic localized heading.

No rich-text editor in V1. Use safe plain text with preserved new lines (`white-space: pre-wrap` or equivalent).

No HTML injection.

---

## 11. Public khutbah visibility and reader

As soon as the Admin publishes a khutbah, it is visible immediately, even if Friday is still in the future.

If no published khutbah exists for the Friday currently displayed:

- do not show a disabled CTA;
- do not show “coming soon”;
- simply omit the CTA.

### CTA copy

- Arabic: `قراءة الخطبة`
- English: `Read Khutbah`
- German: `Predigt lesen`
- Turkish: `Hutbeyi oku`

Use one CTA for the Friday as a whole, not one per Jumu'ah service.

### Reader route

Use a dedicated app route, recommended:

`/friday/khutbah/[date]`

Do not use a small modal for the full khutbah.

### Language availability — approved Option A

Only languages with non-empty `content_*` appear as choices.

- If the current app locale is available, select/open it by default.
- If the current app locale is not available, do not silently fallback to another language; show the available-language chooser and require the user to select one.
- Never show a language tab whose content is empty.

Direction:

- Arabic content: RTL.
- English/German/Turkish: LTR.

The reading surface must use comfortable long-form typography, constrained line length on desktop, selectable text, responsive mobile layout, and normal back navigation to Friday.

Direct route access to missing/unpublished content must not expose drafts.

---

## 12. Security / caching

### RLS

For `friday_khutbahs`:

- enable RLS;
- public/anon/authenticated SELECT policy only where `published = true`;
- grant only the public read surface required by the current security pattern;
- Admin writes occur through authenticated server actions after `requireAllowedAdmin()` and the server/service-role client.

### Cache

Follow existing public cache patterns.

On Admin create/update/publish/unpublish:

- invalidate Friday khutbah caches immediately;
- revalidate `/friday`, relevant khutbah route, `/admin/jumuah`, and `/` if necessary.

The approved behavior is: Publish → content becomes visible immediately, not after a long TTL.

### Failure isolation

- Khutbah fetch failure must not hide the Friday schedule.
- Additional Jumu'ah fetch failure should still allow reliable Primary Jumu'ah display when prayer-times data is available.
- Missing prayer-times source means no automatic Primary; do not synthesize one.

---

## 13. Existing notification behavior

No new notification feature is part of this scope.

- Preserve current existing Friday announcement push behavior unless the new data semantics require a narrowly scoped compatibility adjustment.
- Do not create automatic weekly Primary-Jumu'ah pushes.
- Do not send a push simply because a khutbah is published.

---

## 14. Non-goals

Do not implement:

- automatic translation;
- AI-generated khutbahs;
- rich-text/HTML editor;
- PDF upload;
- khutbah audio/video;
- public khutbah archive/history;
- new push-notification product behavior;
- manual Primary Jumu'ah override;
- automatic creation of weekly Primary rows in `jumuah_times`;
- prayer calculation changes;
- unrelated visual redesign.

---

## 15. Acceptance summary

The implementation is correct when all of these are true:

1. Arabic header uses the approved Thuluth SVG and exact spelling with dal.
2. Arabic Hijri date is visually ordered day → month → year → هـ with bidi-safe rendering.
3. Published Friday prayer-times data automatically creates virtual Jumu'ah 1 from `dhuhr`.
4. Admin cannot alter Primary from Friday management.
5. Additional services are Admin-managed, later than Primary, sorted, and deduplicated.
6. On Friday, public Dhuhr label becomes Jumu'ah in AR/EN/DE/TR only.
7. `jumuah_times` is not required for a valid Primary Friday schedule.
8. One optional multilingual khutbah exists per Friday date.
9. Any subset of four languages can be published, as long as one content field is non-empty.
10. Published khutbah appears immediately before or on Friday.
11. Public reader shows only available languages, with no silent fallback if current locale is unavailable.
12. Draft/unpublished khutbah is never publicly exposed.
13. All existing tests plus new tests, migration bootstrap, lint, build, responsive QA, RTL QA, and four-locale QA pass.
