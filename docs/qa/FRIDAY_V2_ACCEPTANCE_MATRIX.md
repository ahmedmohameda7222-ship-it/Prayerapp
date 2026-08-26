# Friday V2 — Acceptance / Rendered QA Matrix

This matrix is mandatory before completion.

## Automated gates

Run and record:

```bash
npm test
npm run lint
npm run build
```

Also run the project's clean Supabase migration/bootstrap validation used by CI. Do not claim migration success from static inspection only.

No new lint errors are allowed. Existing warnings may remain only if they pre-existed and are unrelated.

## Responsive widths

Render at minimum:

- 320 px
- 375 px
- 390 px
- 430 px
- 768 px
- 1440 px

## Locales

Verify:

- Arabic RTL
- English
- German
- Turkish

## Brand/header cases

- Arabic header shows approved new Thuluth wordmark.
- Exact visual spelling uses `د` in `الدوناو`; there is no `ذ` dot.
- No clipping of fatha/damma/shadda/sukun or tall/extended strokes.
- Wordmark remains legible at 320/375 widths.
- Association line remains exactly `Deggendorfer Integrations und Bildungsverein e.V`.
- Deggendorf line remains present.
- EN/DE/TR header branding remains text-based and unchanged in meaning.

## Hijri cases

Arabic header must visually read in this structure:

`[day] [month] [year] هـ`

- day is visually first on the right-to-left reading sequence as intended;
- Arabic-localized digits render correctly;
- no bidi reordering such as month/year appearing before the day;
- Gregorian date remains correct;
- time zone remains Europe/Berlin.

## Primary Friday cases

### No `jumuah_times` rows

Given a published Friday prayer row with `dhuhr = 12:18`:

- Friday tab exists and shows Jumu'ah 1 = 12:18.
- Home Jumu'ah card appears under its existing Wednesday→Friday visibility rule.
- Admin shows Primary = 12:18 locked.
- No `jumuah_times` Primary row is created.

### Dhuhr IQama differs

Given:

- `dhuhr = 12:18`
- `dhuhrIqama = 13:00`

Primary Jumu'ah must be **12:18**, never 13:00.

## Additional-service cases

Primary 12:18:

- Admin add 13:30 → accepted as Jumu'ah 2.
- Admin add 14:30 → accepted as Jumu'ah 3.
- 12:18 → rejected as duplicate/equal to Primary.
- 12:00 → rejected as before Primary.
- duplicate 13:30 → rejected.
- sorting is time ascending regardless of insertion order.
- editing/deleting Primary is impossible.
- editing/deleting additional rows works.

## Legacy-data cases

- Legacy row at exact Primary time is deduplicated publicly.
- Legacy row earlier than Primary is hidden from public additional services.
- Invalid legacy row is visible to Admin with correction warning; it is not silently deleted.

## Day/time transition cases

Use deterministic test clocks in Europe/Berlin.

- Monday–Thursday → next Friday.
- Friday before Primary → Primary is next service.
- Friday after Primary with Jumu'ah 2 pending → Jumu'ah 2 becomes next.
- Friday after Jumu'ah 2 with Jumu'ah 3 pending → Jumu'ah 3 becomes next.
- Friday after final service → Friday page advances to next Friday.
- Saturday/Sunday → next Friday.
- No published prayer-times row for required Friday → no fabricated Primary.

## Friday prayer-name cases

For the same Friday date, every public prayer surface must show:

- AR: الجمعة
- EN: Jumu'ah
- DE: Freitagsgebet
- TR: Cuma

For Thursday/Saturday/non-Friday dates, the normal Dhuhr name must remain.

Ensure calculation/storage/reminder identifiers remain `dhuhr` internally.

## Khutbah Admin cases

Test language combinations:

1. Arabic only.
2. English only.
3. German only.
4. Turkish only.
5. Arabic + English.
6. Arabic + English + Turkish.
7. All four languages.
8. Empty draft.

Rules:

- empty draft can be saved;
- empty draft cannot be published;
- title-only language is not considered available;
- one non-empty content language is sufficient to publish;
- all language fields are optional individually;
- no HTML/rich-text requirement is introduced.

## Public Khutbah cases

- Published future-Friday khutbah appears immediately before Friday.
- No CTA exists when no published khutbah exists.
- CTA appears once for the Friday, not once per service.
- direct URL to unpublished/missing khutbah does not expose draft content.

### Language chooser

If app locale exists in content:

- it is selected by default.

If app locale does not exist:

- no silent fallback;
- only available languages are offered;
- user chooses one.

Examples:

- available AR + TR, app DE → show العربية + Türkçe only; no auto-open of AR.
- available TR only, app TR → Turkish opens by default.
- available EN + DE, app AR → show English + Deutsch only.

### Direction / long text

- Arabic text RTL.
- EN/DE/TR LTR.
- line breaks preserved.
- very long khutbah remains readable and scrollable.
- text is selectable.
- desktop line length is constrained.
- no horizontal overflow at 320 px.

## Accessibility

- meaningful accessible name for Arabic wordmark.
- keyboard access to language selector and CTA.
- visible focus treatment.
- controls meet current >=44px public touch-target contract where applicable.
- no lost content at increased text size / browser zoom.
- route heading structure remains logical.

## Failure isolation

Simulate where practical:

- Khutbah read failure → Friday prayer schedule still renders.
- Additional Jumu'ah read failure → Primary can still render from prayer data.
- Prayer data failure → do not invent Primary; show established empty/error behavior.

## Regression focus

Do not regress:

- Next Prayer image fill fix.
- enlarged Next Prayer typography.
- bottom navigation.
- public design tokens/colors.
- association name.
- prayer schedule logic outside Friday label presentation.
- existing admin authentication.
- current push-notification behavior.
