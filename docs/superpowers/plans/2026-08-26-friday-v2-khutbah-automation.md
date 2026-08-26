# Prayerapp Friday V2 + Khutbah Automation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Prayerapp's Friday experience self-maintaining from the published prayer schedule, add an immutable automatic Primary Jumu'ah, Admin-managed extra Jumu'ah services, a secure multilingual Friday khutbah publisher/reader, the approved Arabic Thuluth header wordmark, and correct Arabic Hijri date rendering.

**Architecture:** `prayer_times.dhuhr` is the sole source of truth for Primary Jumu'ah. `jumuah_times` becomes additional-services-only. A new `friday_khutbahs` table stores one optional multilingual khutbah per Friday date. One central Friday resolver feeds Friday page and Home instead of separate duplicated schedule logic.

**Tech Stack:** Next.js 16.3.2, React 19.2.4, TypeScript 5, Supabase/Postgres/RLS, Vitest 4.1.9, Testing Library, Tailwind CSS 4.

**Spec:** `docs/superpowers/specs/2026-08-26-friday-v2-khutbah-automation-design.md`

## Global Constraints

- Exact Arabic semantic wordmark: `مَسْجِدُ الدُّونَاوْ`; `الدوناو` uses د, never ذ.
- Primary Jumu'ah time is `PrayerTime.dhuhr`, never `dhuhrIqama`.
- Primary is virtual and immutable from Friday Admin.
- No automatic Primary row may be inserted into `jumuah_times`.
- `PrayerName` remains unchanged; Friday Jumu'ah naming is display-only for `dhuhr` on Friday.
- Timezone remains `Europe/Berlin`.
- Hijri calendar remains `islamic-umalqura`.
- Khutbah supports AR/EN/DE/TR; every language is optional individually.
- Publish requires at least one non-empty content field.
- Published khutbah is visible immediately, including before Friday.
- No runtime dependency should be added for this feature.
- No deployment and no merge.
- Preserve existing public design/accessibility/navigation and Next Prayer fixes.

---

## File Structure / Responsibility Map

### Create

- `public/branding/masjid-al-danube-ar.svg` — approved vector-path Arabic Thuluth wordmark copied from package asset.
- `components/ui/FormattedHijriDate.tsx` — bidi-safe part-wise Hijri rendering.
- `components/ui/FormattedHijriDate.test.tsx` — rendered Arabic part-order contract.
- `lib/prayer-display-name.ts` — Friday-only Dhuhr display-name key helper.
- `lib/prayer-display-name.test.ts` — Friday/non-Friday locale-independent key behavior.
- `supabase/migrations/20260826160500_friday_v2_khutbahs.sql` — khutbah table, constraints, grants, RLS, public policy.
- `lib/data/friday-khutbahs.ts` — public cached read mapper for published khutbahs.
- `app/admin/jumuah/khutbah-actions.ts` — protected draft/save/publish/unpublish actions.
- `components/admin/FridayKhutbahEditor.tsx` — four-language optional plain-text editor.
- `components/admin/FridayKhutbahEditor.test.tsx` — Admin editor contract.
- `app/friday/khutbah/[date]/page.tsx` — public secure reader route.
- `components/friday/FridayKhutbahReader.tsx` — available-language selection + RTL/LTR reader.
- `components/friday/FridayKhutbahReader.test.tsx` — language availability/fallback contract.

### Modify

- `components/layout/AppHeader.tsx` — remove old inline Arabic path, use external approved SVG, render structured Hijri component.
- `lib/date-utils.ts` — expose Hijri parts formatter using `formatToParts()`.
- `lib/app-brand.ts` only if an explicit accessible visual-brand constant is useful; preserve existing normal names.
- `lib/i18n/prayer-names.ts` — add Jumu'ah display translation overrides.
- `lib/types.ts` — Friday service resolver types + `FridayKhutbah` type; do not alter `PrayerName` union.
- `lib/friday.ts` — central Friday resolver, Primary synthesis, additional normalization, next-service logic.
- `lib/friday.test.ts` — replace DB-row-only assumptions with virtual Primary tests.
- `lib/home-jumuah.ts` — remove duplicated domain calculation or convert to a thin visibility adapter over `lib/friday.ts`.
- `lib/home-jumuah.test.ts` — preserve Wednesday→Friday Home visibility policy with new Primary source.
- `app/page.tsx` / `components/home/HomePageClient.tsx` — feed prayer schedule + additional services into unified Friday schedule.
- `components/home/HomeJumuahCard.tsx` — render resolver service shape including Primary.
- `components/home/HomeJumuahContract.test.tsx` — automatic Primary Home behavior.
- `app/friday/page.tsx` — load prayer times, additional Jumu'ah rows, published khutbah metadata/content needed by page.
- `components/friday/FridayPageClient.tsx` — use unified schedule + single khutbah CTA.
- `components/friday/FridayPageContract.test.tsx` — Primary-with-zero-DB-row and CTA contracts.
- `components/prayer/PrayerRow.tsx`
- `components/prayer/HomePrayerTimesCard.tsx`
- `components/prayer/PrayerTimesCard.tsx`
- `components/prayer/WeeklyPrayerTable.tsx`
- `components/prayer/PrayerTimesBrowser.tsx`
  - all public prayer-name consumers must use the Friday display helper where they render the row's date.
- related prayer component tests.
- `lib/data/jumuah.ts` — additional-service semantics/filtering helpers as needed; `khutbahTime` stays legacy compatible.
- `app/admin/jumuah/page.tsx` — Friday-centered Admin UI, locked Primary, Friday selector, additional service form, khutbah editor.
- `app/admin/jumuah/actions.ts` — validate against authoritative Friday prayer row; one-time extra service input; duplicate/later-than-Primary rules.
- `components/admin/JumuahTable.tsx` — additional rows only + invalid legacy warning.
- i18n/localization contract files as required by repository translation architecture.
- cache TTL/persistent cache helpers only if the existing generic APIs need a new prefix/TTL entry.

### Remove only when consumers are migrated and tests prove safety

- giant `ArabicMosqueBrandMark()` inline path inside `AppHeader.tsx`.
- duplicated scheduling logic in `lib/home-jumuah.ts` if a thin adapter is unnecessary.

Do **not** drop `jumuah_times.khutbah_time` in this feature.

---

### Task 1: Establish Isolated Branch, Baseline, and Authority Docs

**Files:**
- Add to repo: `docs/superpowers/specs/2026-08-26-friday-v2-khutbah-automation-design.md`
- Add to repo: `docs/superpowers/plans/2026-08-26-friday-v2-khutbah-automation.md`
- Add to repo: `docs/qa/FRIDAY_V2_ACCEPTANCE_MATRIX.md`

**Interfaces:**
- Consumes: package authority files and current repository.
- Produces: verified implementation baseline and isolated branch.

- [ ] **Step 1: Verify current main and inspect drift**

```bash
git fetch origin
git switch main
git pull --ff-only
git rev-parse HEAD
```

Expected package baseline is `0e7305762ce634b6d17789cc019cd373b5986817`. If HEAD differs, inspect:

```bash
git log --oneline 0e7305762ce634b6d17789cc019cd373b5986817..HEAD
git diff --stat 0e7305762ce634b6d17789cc019cd373b5986817..HEAD
```

Do not continue until newer changes are understood and confirmed compatible with this spec.

- [ ] **Step 2: Create isolated worktree/branch**

Use `superpowers:using-git-worktrees`. Target branch:

```bash
feat/friday-v2-khutbah-automation
```

- [ ] **Step 3: Copy authority docs into repo and commit**

```bash
git add docs/superpowers/specs/2026-08-26-friday-v2-khutbah-automation-design.md \
        docs/superpowers/plans/2026-08-26-friday-v2-khutbah-automation.md \
        docs/qa/FRIDAY_V2_ACCEPTANCE_MATRIX.md
git commit -m "docs: add approved Friday V2 implementation authority"
```

- [ ] **Step 4: Create Draft PR against main**

PR title recommendation:

`Friday V2 automatic Jumu'ah and khutbah publishing`

Keep it Draft through implementation.

---

### Task 2: Replace Arabic Header Wordmark with Approved SVG

**Files:**
- Create: `public/branding/masjid-al-danube-ar.svg`
- Modify: `components/layout/AppHeader.tsx`
- Modify/Test: `components/layout/AppHeaderAssociationName.test.tsx`
- Create or extend: `components/layout/AppHeaderBrandContract.test.tsx`

**Interfaces:**
- Consumes: Arabic locale from `useTranslation()`, normal names from `APP_NAMES`.
- Produces: external wordmark asset with accessible semantic label; unchanged EN/DE/TR text branding.

- [ ] **Step 1: Write failing brand contract**

Test at minimum:

```tsx
expect(source).toContain('/branding/masjid-al-danube-ar.svg');
expect(source).not.toContain('function ArabicMosqueBrandMark()');
expect(APP_NAMES.ar).toBe('مسجد الدوناو');
```

Render Arabic header and assert an image/accessibility node exposes the approved Arabic semantic name. Render EN/DE/TR and assert their text names remain visible.

- [ ] **Step 2: Run targeted test and confirm RED**

```bash
npm test -- components/layout/AppHeaderBrandContract.test.tsx
```

Expected: fail because current header still contains old inline path / does not reference new asset.

- [ ] **Step 3: Copy exact vector asset**

Copy package:

`assets/approved_arabic_thuluth_wordmark.svg`

into:

`public/branding/masjid-al-danube-ar.svg`

Do not regenerate with a font. Inspect the path and confirm it is vector geometry, not an embedded raster.

- [ ] **Step 4: Replace old inline path in AppHeader**

Use the external SVG only for `locale === "ar" && !title`.

Preferred accessible structure:

```tsx
<img
  src="/branding/masjid-al-danube-ar.svg"
  alt="مَسْجِدُ الدُّونَاوْ"
  className="mosque-name-logo h-auto w-[clamp(190px,54vw,230px)]"
/>
```

Preserve current association and city lines. Do not change header layout except where necessary to prevent wordmark clipping.

- [ ] **Step 5: Run targeted + related header tests**

```bash
npm test -- components/layout/AppHeaderBrandContract.test.tsx components/layout/AppHeaderAssociationName.test.tsx
```

- [ ] **Step 6: Commit**

```bash
git add public/branding/masjid-al-danube-ar.svg components/layout/AppHeader.tsx components/layout/*Brand*test* components/layout/AppHeaderAssociationName.test.tsx
git commit -m "feat: replace Arabic header with approved Thuluth wordmark"
```

---

### Task 3: Fix Arabic Hijri Date Ordering and Bidi Safety

**Files:**
- Modify: `lib/date-utils.ts`
- Create: `components/ui/FormattedHijriDate.tsx`
- Create: `components/ui/FormattedHijriDate.test.tsx`
- Modify: `components/layout/AppHeader.tsx`

**Interfaces:**
- Produces:

```ts
export type HijriDateParts = {
  day: string;
  month: string;
  year: string;
  era: string;
};

export function formatHijriDateParts(date: string, locale?: Locale): HijriDateParts;
```

- [ ] **Step 1: Write failing formatter tests**

Assert that Arabic `formatHijriDateParts()` returns non-empty day/month/year and an era, with Arabic-localized numeric parts. Do not test only a single concatenated string.

- [ ] **Step 2: Write failing rendered bidi test**

Render:

```tsx
<FormattedHijriDate date="2026-08-26" locale="ar" />
```

Assert DOM child order is `day`, `month`, `year`, `era`, and numeric values are each inside bidi-isolated nodes.

- [ ] **Step 3: Run RED**

```bash
npm test -- components/ui/FormattedHijriDate.test.tsx
```

- [ ] **Step 4: Implement `formatToParts()` formatter**

Use exactly:

```ts
new Intl.DateTimeFormat(`${intlLocales[locale]}-u-ca-islamic-umalqura`, {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: APP_TIME_ZONE,
}).formatToParts(atNoonUtc(date));
```

Extract parts explicitly. For Arabic, normalize era presentation to `هـ` if needed by runtime output while preserving calendar calculation.

- [ ] **Step 5: Implement structured rendered component**

Render logical part order with isolated numeric nodes, e.g.:

```tsx
<span dir={locale === "ar" ? "rtl" : "ltr"}>
  <bdi>{parts.day}</bdi>{" "}
  <span>{parts.month}</span>{" "}
  <bdi>{parts.year}</bdi>{" "}
  <span>{parts.era}</span>
</span>
```

For non-Arabic, preserve expected locale order if the existing UX depends on it; the hard requirement is correct Arabic rendering.

- [ ] **Step 6: Wire AppHeader and run tests**

```bash
npm test -- components/ui/FormattedHijriDate.test.tsx components/layout/AppHeaderBrandContract.test.tsx
```

- [ ] **Step 7: Commit**

```bash
git add lib/date-utils.ts components/ui/FormattedHijriDate.tsx components/ui/FormattedHijriDate.test.tsx components/layout/AppHeader.tsx
git commit -m "fix: render Arabic Hijri date in stable bidi order"
```

---

### Task 4: Build the Unified Friday Resolver with Virtual Primary

**Files:**
- Modify: `lib/types.ts`
- Rewrite/Modify: `lib/friday.ts`
- Modify: `lib/friday.test.ts`
- Modify/remove adapter logic: `lib/home-jumuah.ts`
- Modify: `lib/home-jumuah.test.ts`

**Interfaces:**

Define a focused resolver shape similar to:

```ts
export type FridayService = {
  id: string;
  date: string;
  prayerTime: string;
  source: "prayer-times" | "admin";
  editable: boolean;
  jumuah?: JumuahTime;
};

export type FridaySchedule = {
  date: string;
  primaryPrayer: PrayerTime;
  services: FridayService[];
  nextIndex: number;
  isToday: boolean;
};

export function resolveUpcomingFridaySchedule(
  prayerTimes: PrayerTime[],
  jumuahTimes: JumuahTime[],
  now: Date,
): FridaySchedule | undefined;
```

Exact naming may vary only if all consumers/tests are updated consistently; do not split domain logic between Home and Friday again.

- [ ] **Step 1: Replace tests with Primary-first RED cases**

Add tests for:

```ts
// no jumuah rows, prayer Friday exists
expect(schedule.services).toHaveLength(1);
expect(schedule.services[0]).toMatchObject({
  prayerTime: fridayPrayer.dhuhr,
  source: "prayer-times",
  editable: false,
});
```

Also assert `dhuhrIqama` does not affect Primary.

- [ ] **Step 2: Add RED normalization cases**

- additional rows sorted ascending;
- equal-to-Primary legacy row deduped;
- earlier-than-Primary legacy row ignored publicly;
- unpublished additional row ignored;
- non-Friday row ignored.

- [ ] **Step 3: Add RED transition cases**

- weekday → upcoming Friday;
- current Friday before Primary → Primary next;
- current Friday between services → next extra;
- after final service → next Friday;
- weekend → next Friday;
- missing published prayer Friday → undefined, never synthesized.

- [ ] **Step 4: Run RED**

```bash
npm test -- lib/friday.test.ts lib/home-jumuah.test.ts
```

- [ ] **Step 5: Implement minimal resolver**

Primary ID must be deterministic and non-colliding, e.g.:

```ts
id: `primary:${prayer.date}`
```

Additional service object wraps the original `JumuahTime` row.

Use `todayIso()` / `zonedDateTime()` and `APP_TIME_ZONE` helpers rather than browser-local date assumptions.

- [ ] **Step 6: Make Home logic a visibility adapter only**

Preserve Home-specific days-until / Wednesday-to-Friday visibility behavior without recomputing service semantics.

- [ ] **Step 7: Run GREEN**

```bash
npm test -- lib/friday.test.ts lib/home-jumuah.test.ts
```

- [ ] **Step 8: Commit**

```bash
git add lib/types.ts lib/friday.ts lib/friday.test.ts lib/home-jumuah.ts lib/home-jumuah.test.ts
git commit -m "feat: derive Primary Jumuah from Friday Dhuhr"
```

---

### Task 5: Feed Unified Friday Schedule into Home and Friday Page

**Files:**
- Modify: `app/page.tsx`
- Modify: `components/home/HomePageClient.tsx`
- Modify: `components/home/HomeJumuahCard.tsx`
- Modify: `components/home/HomeJumuahContract.test.tsx`
- Modify: `app/friday/page.tsx`
- Modify: `components/friday/FridayPageClient.tsx`
- Modify: `components/friday/FridayPageContract.test.tsx`

**Interfaces:**
- Consumes: unified Friday resolver from Task 4.
- Produces: public Primary schedule with no Jumuah DB dependency.

- [ ] **Step 1: Add failing Home contract with zero Jumuah rows**

Given `initialPrayerTimes` containing upcoming Friday `dhuhr` and `jumuahTimes=[]`, Home's Jumu'ah card must render Primary in the existing display window.

- [ ] **Step 2: Add failing Friday page contract with zero Jumuah rows**

Render Friday page client with prayer data + empty additional rows and assert Primary is visible.

If current props do not carry prayer times, change the component API under test first and let compilation/test failure prove RED.

- [ ] **Step 3: Run RED**

```bash
npm test -- components/home/HomeJumuahContract.test.tsx components/friday/FridayPageContract.test.tsx
```

- [ ] **Step 4: Update server loaders**

`app/friday/page.tsx` must load an adequate upcoming prayer range via `getPrayerTimes()` plus published `getJumuahTimes()` independently, preserving failure isolation.

`app/page.tsx` already loads prayer range + Jumuah rows; reuse them.

- [ ] **Step 5: Update client schedule computation**

Do not duplicate Primary synthesis inside components. Call resolver/adapter only.

- [ ] **Step 6: Adapt presentation shape**

Home and Friday labels should number services based on `schedule.services`, with Primary always index 0.

- [ ] **Step 7: Run GREEN + relevant old tests**

```bash
npm test -- components/home/HomeJumuahContract.test.tsx components/friday/FridayPageContract.test.tsx lib/friday.test.ts lib/home-jumuah.test.ts
```

- [ ] **Step 8: Commit**

```bash
git add app/page.tsx app/friday/page.tsx components/home components/friday
git commit -m "feat: show automatic Primary Jumuah across public Friday surfaces"
```

---

### Task 6: Add Friday-Only Dhuhr → Jumu'ah Display Semantics

**Files:**
- Create: `lib/prayer-display-name.ts`
- Create: `lib/prayer-display-name.test.ts`
- Modify: `lib/i18n/prayer-names.ts`
- Modify all affected public prayer renderers and their tests.

**Interfaces:**

Recommended helper:

```ts
export function getPrayerDisplayTranslationKey(name: PrayerName, date: string): string {
  return name === "dhuhr" && isFridayIso(date) ? "prayer.jumuah" : `prayer.${name}`;
}
```

Do not pass locale into the domain decision if the translation layer can handle it.

- [ ] **Step 1: Write failing domain tests**

```ts
expect(getPrayerDisplayTranslationKey("dhuhr", "2026-08-28")).toBe("prayer.jumuah");
expect(getPrayerDisplayTranslationKey("dhuhr", "2026-08-27")).toBe("prayer.dhuhr");
expect(getPrayerDisplayTranslationKey("asr", "2026-08-28")).toBe("prayer.asr");
```

- [ ] **Step 2: Write failing localization contract**

Add translations:

```text
ar: الجمعة
en: Jumu'ah
de: Freitagsgebet
tr: Cuma
```

- [ ] **Step 3: Run RED**

```bash
npm test -- lib/prayer-display-name.test.ts lib/i18n/localization-contract.test.ts
```

- [ ] **Step 4: Implement helper and translation overrides**

Reuse one Friday-date predicate; do not scatter `getUTCDay() === 5` through components.

- [ ] **Step 5: Wire every public prayer-name renderer**

At minimum inspect and update:

- `PrayerRow.tsx`
- `HomePrayerTimesCard.tsx`
- `PrayerTimesCard.tsx`
- `WeeklyPrayerTable.tsx`
- `PrayerTimesBrowser.tsx`
- Next Prayer label renderer if it independently translates the prayer name.

Each call must have the actual prayer row's date, not `new Date()` browser-local assumptions.

- [ ] **Step 6: Run prayer regression tests**

```bash
npm test -- components/prayer lib/prayer-display-name.test.ts lib/i18n/localization-contract.test.ts
```

- [ ] **Step 7: Commit**

```bash
git add lib/prayer-display-name.ts lib/prayer-display-name.test.ts lib/i18n/prayer-names.ts components/prayer lib/i18n/localization-contract.test.ts
git commit -m "feat: label Friday Dhuhr as Jumuah in public UI"
```

---

### Task 7: Rework Admin Friday Management Around Locked Primary

**Files:**
- Modify: `app/admin/jumuah/page.tsx`
- Modify: `app/admin/jumuah/actions.ts`
- Modify: `components/admin/JumuahTable.tsx`
- Add/modify Admin tests for page/actions.
- Modify: `lib/data/jumuah.ts` only as required for filtering/compatibility.

**Interfaces:**
- Consumes: selected Friday prayer row and additional Jumuah rows.
- Produces: additional-service CRUD only.

- [ ] **Step 1: Write failing server validation tests**

Create action-level/domain-level validation tests proving:

- 13:30 accepted when Primary is 12:18;
- 12:18 rejected;
- 12:00 rejected;
- duplicate 13:30 rejected;
- non-Friday selected date rejected;
- missing prayer-times row rejected;
- malformed time rejected.

If direct server-action testing is awkward, extract a pure validation function into a focused `lib/admin-jumuah-validation.ts` and test it directly, then have server actions call it.

- [ ] **Step 2: Write failing Admin UI contract**

Assert:

- Primary appears locked/read-only from Dhuhr;
- no editable `khutbahTime` control exists;
- additional form requires one prayer time;
- date is selected from Friday prayer rows rather than arbitrary record creation.

- [ ] **Step 3: Run RED**

```bash
npm test -- app/admin/jumuah components/admin/JumuahTable.test.tsx
```

Use exact discovered test paths if repository naming differs.

- [ ] **Step 4: Implement protected server validation**

Server action flow must:

1. `requireAllowedAdmin(token)`;
2. fetch authoritative published/unpublished prayer row for selected Friday as appropriate to Admin management;
3. confirm Friday date;
4. compare additional time to `dhuhr`;
5. query same-date additional rows to reject duplicates excluding current edit ID;
6. insert/update `jumuah_times` with `khutbah_time = null` for new V2 rows;
7. preserve existing optional metadata and publication behavior.

Do not rely on client-submitted Primary time.

- [ ] **Step 5: Implement Admin Friday-centered UI**

Default to upcoming Friday. Provide future Friday selector sourced from prayer-times Friday rows. Primary card is locked. Additional list is editable.

Invalid legacy rows earlier/equal to Primary must display a warning and correction action; never silently delete them.

- [ ] **Step 6: Preserve existing push behavior narrowly**

Do not invent Primary weekly pushes or khutbah pushes. Ensure any existing push call still triggers only from existing Admin additional-service publication semantics and remains deduplicated per Friday.

- [ ] **Step 7: Run GREEN**

```bash
npm test -- app/admin/jumuah components/admin
```

- [ ] **Step 8: Commit**

```bash
git add app/admin/jumuah components/admin/JumuahTable.tsx lib/data/jumuah.ts
git commit -m "feat: manage additional Jumuah services around locked Primary"
```

---

### Task 8: Add `friday_khutbahs` Migration, RLS, Types, and Data Layer

**Files:**
- Create: `supabase/migrations/20260826160500_friday_v2_khutbahs.sql`
- Modify: `lib/types.ts`
- Create: `lib/data/friday-khutbahs.ts`
- Add data/mapping tests.

**Interfaces:**

Type:

```ts
export interface FridayKhutbah {
  id: string;
  date: string;
  titleAr?: string;
  contentAr?: string;
  titleEn?: string;
  contentEn?: string;
  titleDe?: string;
  contentDe?: string;
  titleTr?: string;
  contentTr?: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}
```

Public reader function recommendation:

```ts
export async function getFridayKhutbahByDate(
  date: string,
  includeUnpublished?: boolean,
): Promise<FridayKhutbah | undefined>;
```

- [ ] **Step 1: Write migration/data RED tests**

At minimum create mapper/data tests that expect all four optional language fields and published filtering behavior.

- [ ] **Step 2: Create additive SQL migration**

Use:

```sql
create table if not exists public.friday_khutbahs (
  id uuid primary key default gen_random_uuid(),
  date date not null unique,
  title_ar text,
  content_ar text,
  title_en text,
  content_en text,
  title_de text,
  content_de text,
  title_tr text,
  content_tr text,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

Add a Friday-only DB check if it can be expressed safely and consistently with existing migration conventions. If added, use ISO/Postgres weekday semantics correctly and test bootstrap.

Enable RLS. Public read policy:

```sql
using (published = true)
```

Follow current hardened grants: public roles receive only required SELECT; Admin writes use service-role server actions.

- [ ] **Step 3: Implement data mapper/cache**

Public query must never return unpublished rows. `includeUnpublished=true` is Admin-only usage and must not be exposed through a public route/client call that bypasses Admin protections.

Reuse current memory + persistent cache patterns and a scoped key such as:

`friday_khutbah:${date}`

- [ ] **Step 4: Run clean migration bootstrap**

Use the exact repo CI/bootstrap command or Supabase test flow. If it fails, invoke `systematic-debugging` before editing SQL.

- [ ] **Step 5: Run unit tests**

```bash
npm test -- lib/data
```

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations lib/types.ts lib/data/friday-khutbahs.ts
git commit -m "feat: add multilingual Friday khutbah data model"
```

---

### Task 9: Build Protected Admin Khutbah Editor

**Files:**
- Create: `app/admin/jumuah/khutbah-actions.ts`
- Create: `components/admin/FridayKhutbahEditor.tsx`
- Create: `components/admin/FridayKhutbahEditor.test.tsx`
- Modify: `app/admin/jumuah/page.tsx`
- Modify cache helpers only if required.

**Interfaces:**

Server validation should expose a pure helper or equivalent behavior:

```ts
export function hasPublishableKhutbahContent(data: Record<string, string>): boolean;
```

True iff one of `contentAr/contentEn/contentDe/contentTr` is non-whitespace.

- [ ] **Step 1: Write RED validation tests**

Cases:

```text
all content empty → draft save allowed, publish rejected
Arabic content only → publish allowed
Turkish content only → publish allowed
title only → publish rejected
whitespace content only → publish rejected
```

- [ ] **Step 2: Write RED editor UI tests**

Assert four language tabs/sections exist, none is globally required, textareas are plain text, and Publish feedback is clear.

- [ ] **Step 3: Implement Admin actions**

Every write:

1. authorize with `requireAllowedAdmin()`;
2. validate Friday date corresponds to a Friday prayer row;
3. trim values;
4. upsert by unique `date`;
5. set `published` only if validation passes;
6. update `updated_at`;
7. invalidate khutbah cache immediately;
8. revalidate Friday/reader/Admin paths.

Do not send a new push notification on khutbah publish.

- [ ] **Step 4: Implement editor**

Four optional languages:

- العربية
- English
- Deutsch
- Türkçe

Each has optional title + multiline content.

Do not add WYSIWYG/HTML dependencies.

- [ ] **Step 5: Integrate into Friday Admin selected-date flow**

The editor always edits the one khutbah for the currently selected Friday date. It is not attached to an individual additional service.

- [ ] **Step 6: Run GREEN**

```bash
npm test -- components/admin/FridayKhutbahEditor.test.tsx app/admin/jumuah
```

- [ ] **Step 7: Commit**

```bash
git add app/admin/jumuah components/admin/FridayKhutbahEditor.tsx components/admin/FridayKhutbahEditor.test.tsx
git commit -m "feat: add optional multilingual Friday khutbah editor"
```

---

### Task 10: Add Public Khutbah CTA and Secure Reader

**Files:**
- Modify: `app/friday/page.tsx`
- Modify: `components/friday/FridayPageClient.tsx`
- Create: `app/friday/khutbah/[date]/page.tsx`
- Create: `components/friday/FridayKhutbahReader.tsx`
- Create: `components/friday/FridayKhutbahReader.test.tsx`
- Modify: `components/friday/FridayPageContract.test.tsx`

**Interfaces:**

Available language representation recommendation:

```ts
type KhutbahLanguage = "ar" | "en" | "de" | "tr";
```

A language is available only if its `content*?.trim()` is non-empty.

- [ ] **Step 1: Write RED Friday CTA tests**

- no published khutbah → CTA absent;
- published khutbah → one CTA present;
- future Friday published khutbah → CTA present immediately.

- [ ] **Step 2: Write RED language-selection tests**

Examples:

```text
available AR + TR, locale DE → render AR/TR chooser, no content auto-selected
available TR, locale TR → Turkish selected automatically
available EN + DE, locale AR → chooser contains EN/DE only
```

- [ ] **Step 3: Write RED security route test**

Unpublished/missing date must not render draft content. Route returns established not-available UI or `notFound()` depending project conventions.

- [ ] **Step 4: Run RED**

```bash
npm test -- components/friday/FridayKhutbahReader.test.tsx components/friday/FridayPageContract.test.tsx
```

- [ ] **Step 5: Implement one Friday CTA**

Copy:

```text
AR: قراءة الخطبة
EN: Read Khutbah
DE: Predigt lesen
TR: Hutbeyi oku
```

Link to `/friday/khutbah/${schedule.date}`.

- [ ] **Step 6: Implement reader**

- dedicated route;
- readable constrained content width;
- `white-space: pre-wrap`;
- Arabic RTL, other languages LTR;
- title optional with localized generic fallback;
- language selector contains only content-bearing languages;
- current locale auto-selected only if available;
- otherwise no silent fallback.

- [ ] **Step 7: Run GREEN**

```bash
npm test -- components/friday/FridayKhutbahReader.test.tsx components/friday/FridayPageContract.test.tsx
```

- [ ] **Step 8: Commit**

```bash
git add app/friday components/friday
git commit -m "feat: publish and read Friday khutbahs"
```

---

### Task 11: Harden Legacy Compatibility and Failure Isolation

**Files:**
- Modify tests in `lib/friday.test.ts`
- Modify: `app/friday/page.tsx`
- Modify: `components/friday/FridayPageClient.tsx`
- Modify related data-load tests.

**Interfaces:**
- Consumes independent prayer/additional/khutbah sources.
- Produces partial-but-trustworthy UI when one optional source fails.

- [ ] **Step 1: Add RED legacy tests**

Ensure exact-Primary DB duplicate is not doubled and earlier invalid legacy row is omitted publicly.

- [ ] **Step 2: Add RED failure-isolation tests**

- khutbah failure does not remove Friday schedule;
- additional Jumuah failure still permits Primary if prayer data exists;
- prayer data failure prevents fabricated Primary.

Prefer server loader result flags over catching everything into one `loadFailed` boolean.

- [ ] **Step 3: Implement minimal isolation**

Use independent `Promise.allSettled()` or equivalent, consistent with `app/page.tsx` patterns.

- [ ] **Step 4: Run focused GREEN suite**

```bash
npm test -- lib/friday.test.ts components/friday
```

- [ ] **Step 5: Commit**

```bash
git add lib/friday.ts lib/friday.test.ts app/friday components/friday
git commit -m "fix: harden Friday legacy and partial-data behavior"
```

---

### Task 12: Full Regression, Migration Verification, and Rendered QA

**Files:**
- Modify only if failures reveal real defects; any fix requires a new failing regression test first.
- Update Draft PR with evidence.

**Interfaces:**
- Produces verified ready-to-merge branch; no deployment/merge.

- [ ] **Step 1: Run complete test suite**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 2: Run lint**

```bash
npm run lint
```

Expected: no new errors. Record any existing warnings and prove they are pre-existing if relevant.

- [ ] **Step 3: Run clean Supabase migration/bootstrap verification**

Use the repository's actual CI-equivalent clean database process. Confirm the new migration works in sequence from scratch, not only against an already-migrated local database.

- [ ] **Step 4: Run production build**

```bash
npm run build
```

Expected: success.

- [ ] **Step 5: Execute rendered QA matrix**

Follow `docs/qa/FRIDAY_V2_ACCEPTANCE_MATRIX.md` completely at:

```text
320 / 375 / 390 / 430 / 768 / 1440 px
AR / EN / DE / TR
```

Capture evidence for:

- new Arabic wordmark;
- Hijri date order;
- Primary-only Friday;
- 2/3-service Friday;
- Friday Dhuhr labels;
- Turkish-only and mixed-language khutbahs;
- unavailable-locale chooser;
- long Arabic RTL khutbah;
- legacy row handling;
- failure isolation;
- no regression to Next Prayer card/navigation.

- [ ] **Step 6: Invoke `verification-before-completion`**

Do not summarize from memory. Use fresh command outputs and current rendered state.

- [ ] **Step 7: Update Draft PR and stop before merge**

Report:

- branch;
- PR number;
- all commit SHAs/messages;
- migration filename;
- tests/lint/build/bootstrap results;
- rendered QA matrix result;
- residual risks;
- explicit confirmation: **not deployed, not merged**.

Do not mark completion if any acceptance item remains unverified.
