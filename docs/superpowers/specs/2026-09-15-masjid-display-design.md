# Masjid Display and Prayer Time Engine Design

**Date:** 2026-09-15

## Goal

Build a production-grade, silent Masjid Display system for Prayerapp with a reliable internal Prayer Time Engine, a separate TV-focused Next.js application, a stable public display-feed contract, offline resilience, deterministic prayer-state behavior, responsive/adaptive presentation across TV sizes, and an Admin-controlled real-TV test console.

The design must reuse the existing Prayerapp data/domain model wherever possible. New logic is limited to capabilities that do not already exist: prayer-time generation, display-specific state orchestration, display projection, TV reliability, and temporary synthetic test control.

## Core principles

- Prayerapp remains the source of truth for mosque data and administration.
- The Masjid Display is a separate Next.js application inside the same repository and is deployed independently.
- The display is completely silent. There is no adhan audio, iqama audio, volume control, audio activation flow, or sound-setting subsystem.
- The display never calculates prayer times itself and never talks directly to Supabase.
- Prayer times are generated locally on the Prayerapp backend with no runtime dependency on an external prayer-time API.
- Published prayer schedule rows remain the canonical runtime schedule for Prayerapp and Masjid Display.
- Absolute Iqama times are removed from the final system. Iqama is always derived from the final stored prayer time plus a configured delay.
- A missing or stale religious datum must fail safe. The display must never invent prayer times or Iqama times.
- The display UI is responsive, adaptive, and fluid. It is not hard-coded to a 32-inch device. A 32-inch 1080p TV is a minimum/reference QA target, not the layout definition.
- The TV can be controlled from an Admin-only Masjid Display Test section using synthetic data without writing fake prayer/content records into production tables.

## Scope

Version 1 includes:

- Internal Prayer Time Engine with deterministic generation and calibration.
- Shared calculation settings and shared Iqama delay settings.
- Future schedule extension and controlled future recalculation.
- Prayer states for Fajr, Dhuhr, Asr, Maghrib, and Isha.
- Sunrise as informational data only.
- Friday/Jumuah display logic.
- Existing Maghrib Program data as informational content only.
- Existing Azkar dataset with a display playlist.
- Announcements, Urgent announcements, Special Display announcements, Events, and Donation Campaigns.
- Persistent Prayerapp QR code.
- Arabic and German display behavior.
- Last Known Good offline operation.
- Versioned public Display Feed.
- Admin-controlled real-TV synthetic test mode.
- TV wake/reconnect recovery, time correction, diagnostics, and deployment isolation.

The following are explicitly out of scope for this design:

- Audio, adhan playback, iqama sounds, or any sound controls.
- Weather.
- Janazah-specific subsystem.
- Generic Ayah/Hadith subsystem separate from the existing Azkar dataset.
- Multi-screen profiles or multiple display identities.
- Multiple-mosque tenancy.
- TV-side login, editing, or administration.
- Direct Supabase access from the TV.
- External prayer-time APIs at runtime.
- Video playback.
- Complex remote-control navigation.
- Dedicated Ramadan/Iftar/Taraweeh display-state automation in v1.
- Dedicated Eid display-state automation in v1.

Existing Ramadan/Eid data and ordinary announcements/events remain untouched and can continue to appear through their normal systems where applicable.

## Repository and deployment architecture

The existing Prayerapp remains at the repository root. A second independent Next.js project is added under `masjid-display/`.

```text
Prayerapp/
├── app/
├── components/
├── lib/
├── supabase/
├── docs/
└── masjid-display/
    ├── app/
    ├── components/
    ├── lib/
    ├── public/
    ├── package.json
    └── next.config.ts
```

The root Prayerapp and `masjid-display/` are separate Vercel projects with separate builds and separate domains. The root application is not converted into a monorepo framework solely for this feature.

The high-level data flow is:

```text
Prayerapp Admin
    ↓
Existing domain/data layer + Prayer Time Engine
    ↓
Supabase
    ↓
Versioned public Masjid Display feed
    ↓
Masjid Display same-origin proxy
    ↓
Runtime validation + Last Known Good cache
    ↓
Pure state engine + content scheduler
    ↓
Responsive TV renderer
```

The Masjid Display has no write authority over Prayerapp data.

## Data ownership boundaries

The final ownership model is:

| Source | Owns |
| --- | --- |
| `prayer_settings` | Prayer calculation parameters, calculation offsets, shared Iqama delays, calculation synchronization revision |
| `prayer_times` | Published daily prayer schedule and per-day Maghrib Program fields |
| `jumuah_times` | Additional Friday services after the primary Jumuah |
| `masjid_display_settings` | Display-only prayer-in-progress durations and Azkar playlist |
| Existing announcements | General, Urgent, and Special Display content plus display scheduling |
| Existing events | Published mosque events |
| Existing donation campaigns | Active campaign content and optional donation URL |
| Existing hardcoded Azkar dataset | Canonical Azkar content |
| Existing mosque settings | Mosque identity plus canonical public Prayerapp URL |
| Masjid Display test state | Temporary synthetic display override only; never religious production data |

The Display Feed is a read-only projection. It is not a second source of truth.

## Prayer Time Engine

### Engine location and kernel

The Prayer Time Engine lives in the main Prayerapp backend/Admin layer. It never runs in the Masjid Display.

Use a mature local open-source prayer calculation library, with `adhan` as the selected astronomy kernel. The exact package version used in implementation must be pinned and locked; the system must not float automatically to a newer calculation implementation.

Prayerapp wraps the library behind its own deterministic domain interface. The wrapper owns configuration, offsets, timezone handling, rounding, generation, calibration, verification, and persistence.

No external prayer-time provider is queried at runtime.

### Calculation settings

Create a singleton `prayer_settings` record containing at least:

- latitude
- longitude
- IANA timezone, initially `Europe/Berlin`
- Fajr angle
- Isha rule: angle or fixed minutes after Maghrib
- Isha angle when angle mode is selected
- Isha minutes-after-Maghrib when fixed-minute mode is selected
- Asr shadow factor/method
- high-latitude rule
- Fajr calculation offset in minutes
- Sunrise calculation offset in minutes
- Dhuhr calculation offset in minutes
- Asr calculation offset in minutes
- Maghrib calculation offset in minutes
- Isha calculation offset in minutes
- Fajr Iqama delay in minutes
- Dhuhr Iqama delay in minutes
- Asr Iqama delay in minutes
- Maghrib Iqama delay in minutes
- Isha Iqama delay in minutes
- `calculation_revision`
- `applied_calculation_revision`
- `updated_at`

Presets may populate calculation parameters for convenience, but the stored explicit values are the source of truth. A preset name must never be the only representation of calculation behavior.

All five Iqama delays are mandatory. Zero is a valid value. Null/missing values are invalid.

Changing only an Iqama delay does not invalidate the generated prayer schedule, because Iqama is derived after schedule lookup.

Changing coordinates, timezone, calculation angles/rule, Asr method, high-latitude rule, or per-prayer calculation offsets increments `calculation_revision` without changing `applied_calculation_revision`. The Admin must then show that the published schedule needs recalculation.

### Calculation pipeline and rounding

The deterministic pipeline is:

```text
coordinates + date + explicit profile
    ↓
raw astronomical instants
    ↓
selected high-latitude / Asr / Isha behavior
    ↓
per-prayer minute offsets
    ↓
convert/interpret in configured IANA timezone
    ↓
ceil to the next minute when seconds are non-zero
    ↓
final HH:MM values
```

The engine keeps second-level precision internally until final storage rounding.

Rounding rule:

- `16:42:00` stores as `16:42`.
- `16:42:01` through `16:42:59` store as `16:43`.

The purpose is to prevent Prayerapp from announcing a prayer before the calculated astronomical instant.

DST is handled through the IANA timezone, not by manually adding/removing an hour.

### Generated schedule

The engine generates:

- Fajr
- Sunrise
- Dhuhr
- Asr
- Maghrib
- Isha

Sunrise is stored and displayed, but never creates a prayer or Iqama state.

The final stored `prayer_times` row remains the runtime source used by Prayerapp and the display.

### Extend Schedule +1 Year

Admin action: `Extend Schedule +1 Year`.

Rules:

1. Find the first missing schedule date from today forward.
2. Generate one full year starting at that first missing date.
3. Existing dates are never overwritten by this action.
4. If an internal future gap exists, generation starts at the first gap instead of the latest stored date.
5. Admin sees Preview/Verification before persistence.
6. `Generate & Save` inserts the approved rows and publishes them immediately.
7. The operation is server-side and atomic.
8. At commit time, the first missing date and approved basis are revalidated. If data changed since Preview, abort and require a new Preview.
9. The action is blocked while `calculation_revision != applied_calculation_revision`; the future schedule must be recalculated first to avoid mixing calculation profiles.

### Recalculate Future Schedule

Admin action: `Recalculate Future Schedule`.

Rules:

1. Saving calculation settings alone never changes `prayer_times`.
2. Admin sees a Preview/Diff of the future schedule under the current calculation revision.
3. Explicit approval is required.
4. Only the approved future range is overwritten.
5. Historical dates remain untouched.
6. The operation is atomic; any failure rolls back the entire range.
7. The current calculation revision must still match the revision used for Preview at commit time.
8. Successful commit updates `applied_calculation_revision` to the current `calculation_revision`.

### Historical calibration and verification

The engine is not production-approved solely because the library returns values. Calibration against known data is mandatory.

Admin provides a calibration view comparing generated values to existing historical published rows prayer-by-prayer and day-by-day. Differences are shown in minutes.

Production approval requirements:

- representative winter dates
- representative summer dates
- DST start transition
- DST end transition
- dates near summer and winter solstices
- year transition
- leap-year coverage where applicable
- known historical schedule fixtures

Any unexplained difference greater than one minute must be investigated before approving the calculation profile for production.

Once a profile is approved, representative generated values become regression fixtures so dependency or code changes cannot silently alter prayer times.

## Iqama model

Absolute daily Iqama times are removed from the final domain model.

The only rule is:

```text
Iqama instant = final stored prayer start time + configured shared delay
```

This applies to Fajr, Dhuhr, Asr, Maghrib, and Isha. Sunrise has no Iqama.

The existing absolute fields are transitional legacy data only:

- `fajr_iqama`
- `dhuhr_iqama`
- `asr_iqama`
- `maghrib_iqama`
- `isha_iqama`

Final code, types, Admin forms, display logic, and database schema must no longer depend on those columns.

Iqama timing edge cases are fixed:

- delay `0`: skip `PRAYER_TIME_NOW` and enter `IQAMA_NOW` immediately at prayer time.
- delay `1`: `PRAYER_TIME_NOW` lasts one minute, then `IQAMA_NOW`.
- delay `>= 2`: `PRAYER_TIME_NOW` may last its full two minutes, then `WAITING_FOR_IQAMA` if additional time remains.
- the Iqama instant always preempts any stale Prayer Time visual.

Missing Iqama delay data is a configuration error. The display must not invent a delay or derive one from legacy columns.

## Friday and Jumuah

The first Jumuah on Friday is always the final stored Dhuhr time for that Friday.

There is no separate primary-Jumuah time field.

Additional Jumuah services are entered manually per Friday date in the existing `jumuah_times` workflow. There are no recurring templates/defaults for Jumuah #2/#3/etc.

Friday replaces the normal Dhuhr lifecycle on the display. There is no Dhuhr `PRAYER_APPROACHING`, Dhuhr Iqama, or Dhuhr prayer-in-progress lifecycle on Friday.

Friday display rules:

- one hour before Jumuah #1: enter Friday focus/countdown.
- at Jumuah #1: show `JUMUAH_NOW` for up to 30 minutes.
- after the hold: return to normal content unless the next additional Jumuah is approaching.
- for each additional Jumuah: the final 10 minutes before the service show focused countdown.
- at each additional Jumuah: show `JUMUAH_NOW` for up to 30 minutes.
- if a current 30-minute hold overlaps the final 10-minute countdown to the next service, the current hold ends early and the next countdown wins.
- no Jumuah Iqama exists.
- the 30-minute hold is presentation behavior, not a claim about actual prayer duration.

The existing canonical Friday resolver should be reused/adapted rather than implementing a second interpretation of Friday schedules.

`khutbah_time` is not used as a display timing source in this design.

## Maghrib Program

Keep the existing per-day Maghrib Program because it is needed for summer scheduling.

Retain:

- `maghrib_program_enabled`
- `maghrib_lesson_title`
- `maghrib_lesson_duration_minutes`
- `maghrib_combined_isha_time`

Remove only the concept of an absolute Maghrib Iqama time as part of the general Iqama cleanup.

`maghrib_combined_isha_time` remains manual Admin program information. It does not replace engine-generated Isha, does not alter Isha Iqama delay, and does not enter the normal Isha state engine.

When enabled, the Maghrib Program may appear as informational content in normal rotation. It is not a new prayer state.

## Pure Masjid Display state engine

The state engine is a pure deterministic module independent of React and timers.

Conceptual input:

```text
snapshot + logicalNow → resolvedDisplayState
```

Timers are presentation triggers only. They are never state authority.

Core states:

- `NORMAL`
- `PRAYER_APPROACHING`
- `PRAYER_TIME_NOW`
- `WAITING_FOR_IQAMA`
- `IQAMA_NOW`
- `PRAYER_IN_PROGRESS`
- `FRIDAY_MODE`
- `JUMUAH_NOW`

Urgent content, offline status, stale warnings, diagnostics, and test-mode indication are overlays/operational concerns rather than mutually exclusive religious states.

### Normal prayer lifecycle

For Fajr, Dhuhr, Asr, Maghrib, and Isha:

```text
NORMAL
  ↓ T-10 minutes
PRAYER_APPROACHING
  ↓ prayer instant
PRAYER_TIME_NOW
  ↓ optional wait
WAITING_FOR_IQAMA
  ↓ Iqama instant
IQAMA_NOW
  ↓
PRAYER_IN_PROGRESS
  ↓ configured end
NORMAL
```

`PRAYER_APPROACHING` starts exactly 10 minutes before prayer time. It is not Admin-configurable.

`PRAYER_TIME_NOW` lasts at most two minutes and is shortened/preempted by Iqama as described above.

`IQAMA_NOW` is a two-minute visual state.

Prayer-in-progress duration is configured independently for each of the five obligatory prayers in `masjid_display_settings`.

The in-progress end is calculated from the original Iqama instant, not from the end of `IQAMA_NOW`:

```text
prayerInProgressEnd = iqamaInstant + configuredPrayerDuration
```

During `PRAYER_IN_PROGRESS`, normal Azkar/Event/Campaign/Announcement rotation is suspended. Prayer-strip information and the persistent Prayerapp QR remain available. Real Urgent content remains available during normal production operation.

Sunrise never creates an approach, prayer-now, Iqama, or in-progress state.

### Wake/resume behavior

On browser visibility return, TV wake, page restoration, or network reconnect:

1. recalculate logical time;
2. resolve the current state from source data;
3. recalculate countdown targets;
4. request a fresh snapshot immediately.

Expired transient states are never replayed. If the TV slept through Prayer Time and Iqama and wakes while prayer is in progress, it must show the current in-progress state directly.

## Logical clock and time integrity

The runtime uses a corrected logical clock rather than trusting the TV clock blindly.

Successful feed/proxy responses provide a trusted server-time signal through the HTTP `Date` header or an equivalent response-time header that does not change snapshot content.

Conceptually:

```text
logicalNow = deviceNow + validatedServerOffset
```

Small drift may update normally. A large unexpected drift must be revalidated with another successful response before adoption.

Countdowns always use `targetInstant - logicalNow`; remaining-seconds counters are not persisted as source of truth.

Offline operation continues using the last validated clock offset plus the device's advancing clock.

## Normal content scheduler

The normal scheduler is deterministic and skip-empty.

Base cadence:

```text
Prayer → Dhikr → Prayer → General Content → repeat
```

Each ordinary slide is approximately 10 seconds. Prayer is a non-skippable anchor, so main-area prayer information returns approximately every 20 seconds at most during normal operation.

If an optional content family is empty, the scheduler skips that slot immediately rather than showing a blank screen.

Normal rotation pauses while a prayer/Friday state owns the main area. After the state ends, rotation resumes fairly instead of always resetting to the first item.

### Azkar

Reuse the existing hardcoded canonical Azkar dataset. Do not create a second Azkar content store for the display.

`masjid_display_settings` stores a playlist of selected existing Azkar IDs.

Reuse the existing time/category behavior as one shared pure helper:

- Friday → Friday
- 04:00–12:00 → Morning
- 15:00–22:00 → Evening
- 22:00–04:00 → Sleep
- otherwise → Morning

The display filters the configured playlist by current category. If no selected item matches the current category, fall back to any selected published Azkar. If the playlist is empty, skip Dhikr slots.

### Announcements

Extend the existing announcement model with:

- `display_style`: `normal` or `special`
- optional `display_from`
- optional `display_until`

Published announcements are eligible automatically; there is no `show_on_masjid_display` opt-in flag.

A scheduled announcement is active only within its configured interval. Empty schedule boundaries mean no boundary on that side.

`Special Display` content receives the first suitable non-prayer content opportunity and recurs in round-robin order, but it must not starve all ordinary content.

Special Display never overrides a prayer/Friday state, never removes the prayer strip, and never removes the persistent Prayerapp QR.

### Urgent announcements

Urgent is a persistent production overlay/bar, not a full-screen state.

When real production data is active, Urgent remains visible across normal, approaching, Prayer Time, waiting for Iqama, Iqama, in-progress, Friday countdown, Jumuah, and Special Display.

Multiple urgent items/language views rotate every eight seconds.

Preferred sequence for two bilingual urgent messages:

```text
Urgent A Arabic → Urgent A German → Urgent B Arabic → Urgent B German → repeat
```

Urgent scheduling/expiry continues locally while offline.

### Events

Display only current and upcoming published Events.

Expiry:

- if an Event has an `endTime`, it expires after that time;
- if no `endTime` exists, it expires at the end of its event date.

Sort nearest upcoming/current events first.

At most two Events may share a slide, and only when readability remains strong. Otherwise show one. Font size must not be aggressively reduced to force two items onto a slide.

### Donation Campaigns

A campaign is eligible when:

- `isActive = true`;
- current date is on/after `startDate` if provided;
- current date is on/before `endDate` if provided;
- required bilingual content is complete.

`endDate` becomes optional. A missing end date means the campaign can continue indefinitely while active.

Add optional `donation_url` per campaign. Generate a QR code dynamically from the URL. Do not store a campaign QR image.

A campaign with no URL remains displayable without a QR.

At most two campaigns may share a slide when both remain readable and any QR remains scannable. Otherwise show one. Five campaigns naturally group as 2 + 2 + 1 when space allows two-card layouts.

## Arabic and German

Core display UI is Arabic + German.

Short system/prayer labels should appear together where practical. Longer dynamic content may rotate Arabic and German views instead of forcing both into a cramped layout.

Relevant dynamic content intended for publication to the display must have complete Arabic and German variants. The Admin/domain layer blocks publishing incomplete applicable content, while the Display Feed also defensively excludes invalid legacy content so a bypassed/old row cannot produce a half-translated TV slide.

Do not auto-translate old mosque content during migration.

## Persistent Prayerapp QR code

The public Prayerapp URL is stored as canonical mosque/application configuration, using a field such as `mosque_settings.public_app_url`.

Requirements:

- HTTPS URL validation.
- The Masjid Display feed exposes the public URL only.
- The display generates the QR dynamically; no QR image is stored.
- The Prayerapp QR is a persistent shell element and is separate from Donation Campaign QR codes.
- It remains visible during normal content, prayer states, Friday/Jumuah states, Special Display, in-progress states, degraded display states where a valid app URL is available, and Masjid Display Test mode.
- A concise Arabic/German label accompanies it, for example "افتح التطبيق / Prayerapp öffnen".
- Its placement is adaptive so it never overlaps the Urgent bar, prayer strip, or primary countdown.
- The QR has a protected quiet zone and a minimum scannable rendered size determined by responsive layout/physical QA.
- If the configured app URL is missing/invalid, no fake QR is generated; Admin reports incomplete display setup.

## Display Feed contract

Create a public read-only Prayerapp endpoint conceptually at:

```text
GET /api/public/masjid-display
```

It requires no user session/token because its response is deliberately limited to public mosque-display data and the TV must recover unattended after reboot.

The endpoint is an allowlisted projection of existing domain/data functions. It must not expose database rows wholesale.

Conceptual v1 snapshot:

```text
schemaVersion
snapshotRevision
generatedAt
timezone

mosque
  nameAr
  nameDe
  address
  publicAppUrl

prayers
  schedule[]
  iqamaDelays
  additionalJumuah[]

displaySettings
  prayerDurations
  azkarPlaylistIds

azkar[]
announcements[]
events[]
campaigns[]
```

The response must never include:

- service-role credentials
- Supabase keys
- Admin-only settings
- user/account data
- unpublished content
- calculation internals not needed by the display
- private audit data
- stack traces/internal errors

The snapshot is atomic. The display either accepts the complete validated snapshot or rejects it; partial salvage is forbidden.

### Schedule horizon

The feed provides a compact operational prayer window: yesterday, today, and approximately 35 days forward. The database may contain years of future schedule; the TV does not need all of it in each snapshot.

Yesterday is included to make midnight/wake boundary handling robust.

### Versioning and runtime validation

Start with `schemaVersion: 1`.

The Masjid Display explicitly supports known schema versions. Breaking changes require a new schema version. Optional backward-compatible additions may remain in the same version.

Before any network snapshot replaces Last Known Good, validate at runtime:

- supported schema version
- required fields
- valid/unique IDs where required
- valid date values
- valid `HH:MM` values
- unique and ordered prayer dates
- all five non-negative Iqama delays
- valid prayer durations
- valid additional Jumuah times
- valid URL formats when URLs are present
- bilingual dynamic content completeness

An invalid snapshot is rejected completely.

### ETag and conditional requests

The main display feed is polled every 60 seconds using conditional GET/ETag where supported.

The ETag is based on stable snapshot content/revision, not on the current clock. Unchanged content returns `304 Not Modified`.

Server time synchronization is taken from response headers rather than forcing `generatedAt` to change every request.

## Same-origin display proxy

The TV calls only the Masjid Display domain:

```text
TV browser
  ↓
masjid-domain/api/display-feed
  ↓
Prayerapp public Masjid Display feed
```

The proxy:

- forwards conditional request metadata;
- preserves ETag/304 semantics;
- exposes a trusted server-time signal;
- uses reasonable upstream timeouts;
- preserves failure status instead of converting errors into an empty success;
- contains no mosque business logic;
- prevents CORS complexity from reaching the TV runtime.

## Last Known Good and offline behavior

Store a versioned Last Known Good record locally in the display browser containing at least:

- validated snapshot
- ETag
- received time
- schema version

Conceptual storage key: `masjid-display-lkg-v1`.

Startup flow:

1. load local LKG;
2. validate local LKG;
3. render immediately if valid;
4. fetch fresh snapshot;
5. validate response;
6. atomically replace LKG only on success.

Failure behavior:

- `200 + valid snapshot`: accept and replace LKG.
- `304`: retain LKG and refresh time synchronization.
- `200 + invalid snapshot`: reject and retain LKG.
- timeout/5xx/network error: retain LKG.
- unsupported schema: retain LKG.
- corrupt local cache: discard it and wait for a valid network snapshot.

Scheduling/expiry continues locally while offline:

- announcements obey `display_from`/`display_until`;
- Events expire at their configured end behavior;
- campaigns obey active/start/end semantics;
- Urgent items expire locally when their window ends.

Prayer schedule may continue while today's date exists in cached prayer coverage.

If the TV remains offline until today's date is no longer represented in the cached published schedule:

- do not calculate prayer times locally;
- do not guess or extrapolate times;
- disable prayer countdown/state behavior that requires missing schedule data;
- show a prominent stale/update-needed warning;
- continue safe cached static/dynamic content only while individually valid.

## Masjid Display Test console

### Purpose

Add an Admin-only section named `Masjid Display Test` that controls the actual TV display for demos, acceptance testing, university presentations, development, and support.

This is not an Admin preview. Pressing a test control changes the real Masjid Display itself.

The test subsystem is explicitly designed to work before real mosque display data has been entered. It uses synthetic fixtures and does not write fake rows into religious/content production tables.

### Test-state architecture

Use a dedicated temporary test-control record/store separate from `prayer_times`, `prayer_settings`, announcements, events, campaigns, Jumuah, and display settings.

Conceptual data:

```text
active
scenario
scenarioParameters
startedAt
expiresAt
updatedAt
```

Admin writes are authenticated/authorized through existing Admin protection.

The TV reads only the active public test directive. It does not need Admin credentials.

The Masjid Display project contains versioned synthetic fixture data used by the same production renderer/state components. The Admin directive selects a scenario and optional parameters; it does not persist fake mosque records.

Test priority:

```text
active non-expired test directive
    → synthetic test renderer/state inputs
otherwise
    → real validated Display Feed + real state engine
```

During Test Mode, synthetic test content takes over the display so real announcements/Urgent/events/campaigns do not interfere with the demo. The persistent Prayerapp QR remains visible when a valid public app URL is configured.

A clear `TEST MODE / وضع الاختبار` indicator is mandatory.

### Test responsiveness

The ordinary Display Feed polling interval remains 60 seconds. Test control requires faster feedback.

Use a tiny same-origin test-control endpoint polled approximately every two seconds with ETag/conditional behavior. This is acceptable because v1 targets one display, the payload is tiny, and reliability on TV browsers is preferred over adding a long-lived realtime transport dependency.

Starting, switching, or stopping a test should therefore reach the TV within a few seconds.

### Test scenarios

The Admin Test section provides direct controls for at least:

- Normal display
- Prayer approaching with a running 10-minute countdown
- Prayer Time Now
- Waiting for Iqama with a running countdown
- Iqama Now
- Prayer In Progress
- Friday mode / first Jumuah countdown
- additional Jumuah countdown
- Jumuah Now
- Urgent announcement
- Special Display announcement
- Event slide
- Donation Campaign with QR
- Donation Campaign without QR
- Azkar slide
- offline/LKG visual state
- stale prayer horizon visual state
- missing/incomplete configuration visual state
- long Arabic/German text stress case

Where useful, the Test section may let the Admin choose the prayer name and a short countdown parameter while still using fixed safe synthetic fixture data.

### Test lifecycle safety

Test state is temporary.

- `Stop Test Mode` immediately returns the TV to its real state.
- Default test expiry is 15 minutes.
- Admin can extend an active test by another 15 minutes.
- Expired test directives are ignored automatically.
- Test mode never modifies `prayer_times`, calculation settings, Iqama delays, Jumuah rows, announcements, Events, campaigns, or any other production content.
- Test mode remains available after production launch for support/demo use.

## Admin architecture

### Prayer Engine page

Create an Admin area for:

- location/timezone
- calculation profile parameters
- calculation offsets
- shared Iqama delays
- calibration
- schedule extension
- future recalculation

Required actions:

- `Calibrate Against Existing Schedule`
- `Preview`
- `Extend Schedule +1 Year`
- `Generate & Save`
- `Preview Recalculation Diff`
- `Recalculate Future Schedule`

Calculation-changing settings save independently from live schedule mutation. A visible `Needs Recalculation` warning remains until the approved future schedule is recalculated successfully.

### Prayer Times page

The existing Prayer Times page becomes primarily a schedule viewer and emergency single-day correction tool rather than the main future-schedule entry workflow.

Keep:

- date
- six prayer start times
- published state
- notes where already supported
- per-day Maghrib Program fields

Remove from final UI/domain:

- all five absolute Iqama time fields
- any absolute Maghrib Iqama field

The legacy CSV-import workflow should not remain a parallel primary method for future prayer schedules after the engine is established. The Prayer Time Engine is the official future-generation path.

Manual single-day correction may remain as an emergency correction mechanism. No provenance/manual-lock subsystem is added; a later explicitly approved future recalculation can overwrite future manual corrections shown in its Preview/Diff.

### Jumuah page

Preserve the existing primary behavior:

- Friday Dhuhr is the primary/first Jumuah.
- Admin adds additional services manually for a selected Friday.
- additional services must occur after the primary.
- no recurring second/third-Jumuah templates are introduced.

### Masjid Display settings page

Create display-only settings for:

- Fajr prayer-in-progress duration
- Dhuhr prayer-in-progress duration
- Asr prayer-in-progress duration
- Maghrib prayer-in-progress duration
- Isha prayer-in-progress duration
- selected Azkar playlist IDs

Do not duplicate coordinates, calculation settings, Iqama delays, Jumuah times, announcements, Events, or campaigns here.

Incomplete required settings are visible as setup warnings. Religious values are never silently invented.

### Masjid Display Test page/section

Provide the real-TV test controls defined above. This page is Admin-only and is not a preview iframe substitute.

### Announcement editor changes

Add:

- display style: Normal / Special Display
- optional display-from
- optional display-until

Keep existing Urgent behavior rather than creating a second urgent subsystem.

### Event editor

No display-specific opt-in is added. Published, temporally relevant bilingual Events are eligible automatically.

### Donation Campaign editor

Add optional `donation_url`. Make `endDate` optional. Do not add QR-image upload.

### Public Prayerapp URL

Add/edit a canonical HTTPS Prayerapp public URL in mosque/application settings. This value drives the persistent display QR and is required for a fully configured display.

## Database design and migration

### `prayer_settings`

Create singleton table `prayer_settings` with constraints for:

- valid latitude/longitude
- valid explicit calculation values
- mutually consistent Isha mode fields
- non-negative mandatory Iqama delays
- bounded/reasonable calculation offsets
- calculation/applied revision fields

Timezone validity is additionally validated at the server/domain layer against IANA timezone behavior.

### `prayer_times`

Preserve the existing one-row-per-date model and six `HH:MM` prayer fields so existing Prayerapp schedule logic remains reusable.

Add/retain strict time-format constraints where safe.

Retain Maghrib Program columns.

Final schema drops the five absolute Iqama columns after code cutover.

No per-row `source`, `generated_by`, or provenance model is introduced.

### `masjid_display_settings`

Create singleton table containing only:

- five prayer-in-progress duration values
- Azkar playlist IDs
- `updated_at`

Because the canonical Azkar dataset uses stable string IDs and is currently hardcoded rather than a database-backed content source, playlist IDs may be stored as text identifiers and validated against the canonical dataset on save.

### Announcements

Add:

- `display_style`
- nullable `display_from`
- nullable `display_until`

When both schedule boundaries are present, `display_until` must be later than `display_from`.

### Donation campaigns

Change `end_date` to nullable/optional and add nullable `donation_url`.

### Jumuah

No duplicate primary Jumuah row is introduced. The primary time continues to come from Friday Dhuhr. Existing `jumuah_times` rows represent additional services for display semantics.

### Mosque settings

Add `public_app_url` or an equivalently named canonical HTTPS field for the persistent Prayerapp QR.

### Test-state storage

Create a dedicated one-row temporary Masjid Display test-state store/table or equivalent durable backend record with only temporary scenario-control fields. It must not share columns or writes with religious production tables.

Only Admin-authorized server operations may mutate it. Public display reads may expose only the active non-sensitive scenario directive.

### Iqama migration sequence

Use a controlled cutover:

1. add `prayer_settings` and configure explicit shared Iqama delays;
2. add Prayer Engine/calibration without removing old columns;
3. deploy code paths that use only prayer start + shared delay;
4. verify Prayerapp and display behavior;
5. remove old absolute Iqama fields from types/mappers/forms/tests;
6. drop legacy absolute-Iqama DB columns.

The final state must not operate a dual Iqama model.

### Atomic schedule persistence

Bulk engine writes occur in server-side transactions.

For both generation and recalculation:

- revalidate the approved range/settings revision before mutation;
- write the complete approved range atomically;
- rollback the entire operation on any row failure;
- never leave a half-generated year or partially recalculated period.

## Responsive, adaptive, fluid TV UI

The display is not designed as a fixed 32-inch canvas and must not branch on TV brand/model/physical inches.

The design system combines:

- responsive layout
- adaptive composition
- fluid typography/spacing
- controlled minimum/maximum readable sizes
- CSS Grid/Flexbox
- `clamp()`-style sizing
- percentage/viewport/container-relative sizing where appropriate
- content-driven card count
- safe-area behavior

A 32-inch 1080p landscape TV is the minimum/reference physical QA target. Larger 43/50/55/65-inch displays and 4K displays should scale cleanly without increasing information density simply because more pixels are available.

Layout decisions are based on available viewport/container space, not physical-screen detection.

### Shell

The stable visual shell contains:

- mosque/date/clock header
- flexible main-content region
- persistent daily prayer-times region/strip
- persistent Prayerapp QR region
- optional Urgent region when production urgent content exists

The main region changes between prayer, Friday, Azkar, Announcement, Event, Campaign, Special Display, Maghrib Program, degraded, and test states.

The shell should minimize visual jumping when content changes.

### Typography and density

Typography is fluid with hard minimum readability thresholds rather than fixed pixel values for one TV.

Priority hierarchy:

1. current prayer/religious state and countdown
2. current time and next prayer
3. full daily prayer schedule
4. current rotating content
5. secondary metadata

If available space becomes constrained, reduce the number of simultaneous cards/elements before reducing text below readable minimums.

No essential display information should collapse into ordinary small website text.

### Prayer strip

Show:

- Fajr
- Sunrise
- Dhuhr, or Jumuah semantics on Friday
- Asr
- Maghrib
- Isha

Include Arabic/German names and prayer start times. Derived Iqama may appear for the five obligatory prayers where space permits. Sunrise is visually identified as informational rather than a congregation prayer.

On Friday, the Dhuhr cell becomes primary-Jumuah semantics and does not show a Dhuhr Iqama.

If six simultaneous cells do not remain readable at a particular viewport, adapt composition instead of shrinking text excessively.

### State presentation

Prayer approaching emphasizes prayer name and running countdown.

Prayer Time Now emphasizes that prayer time has entered.

Waiting for Iqama emphasizes derived Iqama time and countdown.

Iqama Now is visually clear and minimally distracting.

Prayer In Progress is intentionally calm and suppresses ordinary rotating content.

Friday mode focuses on Jumuah #1 and additional service times/countdowns according to the state rules.

### Dynamic content layout

- one Dhikr per slide when text is long;
- one or at most two Events depending on available space;
- one or at most two Campaigns depending on available space and QR scanning requirements;
- one Announcement/Special Display item at a time when required for readability;
- long bilingual content may alternate Arabic/German views rather than compressing both.

### QR behavior

The persistent Prayerapp QR and any campaign QR must retain quiet zones and scannability.

When two campaign cards would force QR codes below the physical/scannability threshold, show one campaign instead.

### Motion and burn-in mitigation

Use restrained fades/crossfades only. No bouncing, flashing, continuous marquees, or distracting motion.

Use subtle 2–4px automatic pixel shifting over longer intervals as burn-in mitigation. It must not visibly disrupt layout or religious text.

### Safe area and overscan

Use proportional safe margins rather than fixed device-specific coordinates. Important content must stay away from edges to tolerate TV/browser overscan and viewport quirks.

## Error handling and recovery

Failure classes:

### Network/transient

Timeout, DNS, 5xx, or connectivity loss:

- retain LKG;
- continue local state engine while schedule coverage is valid;
- continue 60-second attempts;
- retry immediately on reconnect;
- do not replace the display with a full-screen technical error.

### Data/contract

Malformed JSON, invalid fields, incompatible schema:

- reject snapshot;
- retain LKG;
- record diagnostics;
- never partially install the bad response.

### Configuration

Missing required delay/duration/settings:

- Admin shows setup incomplete;
- feed/runtime do not invent values;
- only dependent religious behavior is disabled/fails safe.

### Runtime/rendering

Use a top-level error boundary and a lightweight health/watchdog strategy.

There is no periodic hard reload. A controlled self-reload is a last-resort recovery only if the runtime demonstrably stops progressing after wake/recovery attempts.

## Diagnostics and observability

Maintain non-sensitive diagnostic state such as:

- display app version
- supported/feed schema version
- snapshot revision/generated time
- last successful sync
- last attempted sync
- current logical time
- clock offset
- current resolved state
- prayer schedule coverage
- online/offline status
- whether LKG is in use
- latest validation failure category
- whether Test Mode is active and its expiry

Provide a maintenance-only diagnostics view/route/flag without exposing Admin controls or secrets.

Log state transitions, snapshot acceptance/rejection, reconnect/wake events, schema mismatches, expired schedule horizon, and watchdog recovery. Do not log full sensitive payloads.

Prayerapp backend logs generation/recalculation transaction failures and Display Feed build failures without leaking credentials to public responses.

## Security boundary

The Display Feed and test-control read endpoints are public read-only surfaces containing non-sensitive display information only.

Security requirements:

- GET-only public display endpoints.
- no mutation from TV.
- no Supabase/service-role keys in browser code.
- no Admin/auth tokens in display storage.
- no user/account data in the feed.
- no stack traces/internal SQL errors in public responses.
- strict runtime validation before cache installation.
- Admin authentication/authorization required for Prayer Engine mutation, display settings, content editing, and test-state mutation.
- public test directive exposes only scenario information needed by the TV.
- edge rate limiting may be added for abuse resistance without changing display semantics.

Opening the display domain from an ordinary browser should reveal no more sensitive information than the public mosque information intentionally shown on the TV.

## Deployment and compatibility

Prayerapp and Masjid Display deploy independently.

A Prayerapp internal implementation change must not require a Masjid Display redeploy as long as the supported feed contract remains compatible.

A breaking contract change requires a new schema version and staged compatibility, not an assumption of simultaneous deployment.

The display build carries an application version and supported feed-schema set.

Bad backend deployment cannot poison Last Known Good because runtime validation rejects incompatible/invalid snapshots.

Bad display deployment can be rolled back independently without rolling back Prayerapp.

Versioned local-storage keys prevent incompatible browser-cache formats from being interpreted as current state.

## Samsung/TV runtime reliability

The implementation assumes TV browsers may suspend timers, sleep, resume late, run under memory pressure, and throttle background work.

Therefore:

- pure state resolution from current time/data;
- no state authority in chained timers;
- no WebSocket/realtime dependency for core operation;
- no heavy video/canvas loop;
- no audio initialization;
- no large animation framework requirement;
- no requirement for a service worker to make basic display operation correct;
- lightweight rendering and QR generation;
- immediate state recalculation on wake/visibility return.

## Testing and production certification

### Prayer Engine tests

Cover:

- known historical fixtures
- winter/summer dates
- DST start/end
- solstice-adjacent dates
- year boundaries
- leap-year cases
- explicit calculation parameter changes
- calculation offsets
- Isha modes
- final ceil-to-minute behavior
- deterministic repeatability

Historical calibration must pass the agreed profile. Unexplained differences greater than one minute block production approval.

### Generation/recalculation tests

Verify:

- first-missing-date behavior
- repeated +1-year extension
- internal future gaps
- no overwrite during Extend
- revision mismatch blocks Extend
- settings Save alone does not mutate live schedule
- future-only recalculation
- past rows untouched
- Preview conflict abort
- atomic rollback on failure

### Iqama tests

Verify:

- five required delays
- zero valid
- 0/1/2/>2-minute transition behavior
- no sunrise Iqama
- no Friday Dhuhr Iqama lifecycle
- no legacy absolute-Iqama fallback
- prayer-in-progress end measured from original Iqama instant

### State-machine tests

Test boundary instants immediately before/at/after:

- T-10 prayer approach
- prayer start
- Prayer Time Now end
- Iqama
- Iqama Now end
- prayer-in-progress end
- midnight
- wake after missed states

Sunrise must never create a religious state.

### Friday tests

Cover:

- first Jumuah equals Friday Dhuhr
- Friday mode from T-60
- 30-minute Jumuah hold
- additional service T-10 focus
- overlap rule cutting current hold
- multiple additional Jumuah services
- return to Normal after final hold

### Display Feed tests

Verify:

- valid v1 accepted
- missing required field rejected
- invalid time/date rejected
- duplicate prayer date rejected
- negative/missing Iqama delay rejected
- unsupported schema rejected
- no private/Admin fields leaked
- ETag stable for unchanged content
- 304 preserves LKG
- bilingual invalid content is excluded/blocked

### Offline/LKG tests

Cover:

- online first boot without cache
- offline boot with valid cache
- corrupt-cache boot
- network loss during each prayer state
- reconnect after sleep/outage
- local announcement/Event/campaign/Urgent expiry
- valid in-horizon prayer operation
- expired prayer horizon fail-safe
- invalid network response cannot poison LKG

### Content scheduler tests

Verify:

- Prayer anchor cannot be skipped
- prayer main content returns approximately within 20 seconds
- empty families are skipped
- Azkar time filter/fallback
- Special Display prominence without starvation
- round-robin fairness
- pause/resume through religious states
- Urgent eight-second bilingual rotation in production mode
- Event and campaign eligibility/grouping logic

### Admin tests

Verify:

- calculation Save does not mutate schedule
- `Needs Recalculation` lifecycle
- Iqama delay change does not mark calculation revision stale
- generation/recalculation Preview requirements
- explicit bulk confirmation
- absence of final absolute-Iqama controls
- manual additional-Jumuah constraints
- display settings completeness warnings
- public-app URL validation

### Masjid Display Test tests

Verify:

- Admin can activate each scenario without real prayer/content data
- real TV changes within the target polling delay
- same production renderer/components are used
- countdown scenarios tick correctly
- synthetic data never enters production religious/content tables
- real production content does not interfere while Test Mode owns the display
- persistent Prayerapp QR remains present when configured
- visible TEST MODE indicator
- Stop returns immediately to current real state
- auto-expiry returns to real state
- extend-test action updates expiry safely

### Migration tests

Run migrations against a production-like schema copy and verify:

- historical prayer rows survive
- Maghrib Program survives
- new singleton settings are created safely
- legacy absolute-Iqama columns remain until code cutover
- final drop occurs only after new logic is verified
- campaign optional-end-date migration is safe
- bilingual cleanup/constraints do not destroy legacy content

### Browser and physical-TV certification

Use desktop/browser automation for responsive breakpoints and a physical TV test for final display acceptance.

A 32-inch 1080p TV is the minimum/reference device; also test one or more larger/4K displays when available to confirm fluid scaling rather than device-specific layout.

Physical checks include:

- Arabic shaping and RTL correctness
- German text clipping/wrapping
- readability from realistic room distance
- countdown visibility
- prayer strip readability
- persistent Prayerapp QR scan success
- campaign QR scan success
- adaptive one/two-card behavior
- safe-area/overscan behavior
- wake/sleep
- network disconnect/reconnect
- continuous multi-hour/overnight operation
- 24–72 hour soak test before production certification
- pixel shift remains unobtrusive

### Production gate

The display is production-ready only when all critical categories pass:

```text
Prayer Engine calibration             PASS
DB migration dry-run                  PASS
Prayer/state unit tests               PASS
Display Feed contract tests           PASS
Offline/LKG tests                     PASS
Admin workflow tests                  PASS
Masjid Display Test scenario tests    PASS
Wake/recovery browser tests           PASS
Responsive/physical TV QA             PASS
Long-duration soak test               PASS
Security boundary review              PASS
```

A failure in any critical category blocks production certification.

## Migration/cutover order

The implementation plan should preserve these architectural dependencies:

1. introduce shared prayer settings and calculation domain without changing current live schedule behavior;
2. implement/calibrate Prayer Time Engine;
3. add generation/recalculation transaction workflows;
4. switch Prayerapp Iqama domain behavior to shared delays;
5. add display settings, public app URL, and content schema extensions;
6. build the versioned public Display Feed;
7. build the independent Masjid Display runtime/state/scheduler and offline cache;
8. add Admin-controlled synthetic Masjid Display Test control;
9. verify end-to-end behavior and physical TV operation;
10. remove legacy absolute-Iqama code and database columns only after cutover verification.

This ordering is a design dependency statement, not the detailed implementation plan.

## Final invariants

The completed system must maintain all of the following:

- one canonical published prayer schedule drives Prayerapp and Masjid Display;
- one canonical shared set of five Iqama delays exists;
- no absolute Iqama source remains in final production behavior;
- first Jumuah is always Friday Dhuhr;
- additional Jumuah services are manual per Friday;
- Maghrib Program never overrides normal Isha prayer-state timing;
- Sunrise never creates a prayer state;
- the TV never invents prayer times;
- the TV never writes mosque data;
- invalid snapshots never replace Last Known Good;
- expired offline content is removed locally according to its schedule;
- Test Mode never pollutes real religious/content data;
- Test Mode uses the real display renderer with synthetic inputs;
- the Prayerapp QR is persistent whenever a valid public app URL is configured;
- the layout adapts to available TV viewport and is not hard-coded to 32 inches;
- the display remains silent in every production and test state.

## Approval status

All design sections in this document were approved in the brainstorming session on 2026-09-15. The next step after user review of this written spec is to create a detailed implementation plan using the Superpowers `writing-plans` workflow. No implementation should begin before that review gate is approved.
