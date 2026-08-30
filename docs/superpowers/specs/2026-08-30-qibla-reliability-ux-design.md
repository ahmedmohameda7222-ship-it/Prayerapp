# Prayerapp — Qibla Reliability + UX Design Authority

Status: Approved binding product, UX, correctness, privacy, accessibility, and QA authority for the Qibla reliability hardening batch.

## Core user outcome

The Qibla experience must answer **“Which way should I turn?”** while remaining useful when a trustworthy live compass cannot be established.

## Heading trust boundary

- `calculateQiblaBearing()` is true/geographic-north referenced.
- Every heading used by live guidance must therefore be true-north referenced.
- Relative device orientation must never drive a live Qibla arrow. It produces bearing-only mode with reason `relative-heading`.
- Standard absolute orientation is accepted only when the event is `deviceorientationabsolute` or `event.absolute === true` and required orientation values are finite.
- WebKit magnetic headings are accepted only when finite and in `[0, 360)`.
- `webkitCompassHeading < 0` is invalid and must never be normalized into a usable heading.
- WebKit accuracy `< 0` is unusable, `0–25` is usable, `> 25` requires calibration, and missing/non-finite accuracy is unknown.
- Magnetic headings must be corrected with WMM2025: `trueHeading = normalizeDegrees(magneticHeading + declination)`, east positive / west negative.
- If WMM lookup fails or is out of range, fail closed to bearing-only. Never silently use an uncorrected magnetic heading and never enable `allowOutOfBoundsModel`.

## Permission and geometry contract

- Location and compass permissions are progressive and independent.
- Initial CTA `Find Qibla` requests location only.
- Once bearing exists, `Enable Live Compass` requests orientation access.
- Where supported, call `DeviceOrientationEvent.requestPermission(true)` from the explicit user-activation path.
- Live guidance is portrait-only. In landscape preserve bearing, pause authoritative live guidance, and show `Rotate your phone to portrait to use the live compass.`
- Live guidance requires an approximately flat phone. `MAX_LIVE_TILT_DEGREES = 35`; if `abs(beta) > 35` or `abs(gamma) > 35`, pause live guidance and show `Hold your phone flat.`
- Do not implement landscape heading compensation in this batch.

## Alignment contract

- `ALIGN_ENTER_DEGREES = 4`
- `ALIGN_EXIT_DEGREES = 7`
- Enter aligned when absolute turn delta is `<= 4°`; remain aligned until it exceeds `7°`.
- Signed turn delta uses the shortest path in `[-180, 180)`; positive means clockwise/right, negative means left.

## State contract

Core mode:

`idle | locating | bearing-ready | requesting-compass | bearing-only | live | aligned | location-error`

Live-block reasons:

`permission-denied | unsupported | sensor-timeout | relative-heading | invalid-heading | calibration-required | magnetic-correction-unavailable | landscape | tilted`

Valid location plus no trustworthy compass is a valid bearing-only feature, not a location/feature error.

## Architecture contract

- `lib/qibla-utils.ts`: great-circle bearing, normalization, circular delta, needle/turn delta, time-based smoothing, hysteresis, direction sectors.
- `lib/qibla-heading.ts`: sensor source/reference types, validation, WebKit classification, magnetic→true conversion, standard absolute conversion, relative rejection, tilt classification.
- `lib/qibla-magnetic.ts`: the only application boundary around `geomagnetism`; returns `number | null` declination.
- `lib/qibla-state.ts`: pure deterministic reducer, no browser APIs/React.
- `lib/use-qibla-controller.ts`: geolocation, orientation permission/listeners, source priority, WMM correction, lifecycle, reverse geocoding, state dispatch; no visual markup.
- `components/qibla/QiblaCompass.tsx`: pure physical compass, explicit SVG Qibla marker, non-mirrored coordinate space, decorative graphic hidden from assistive tech.
- `components/qibla/QiblaExperience.tsx`: permissions, bearing-only/live/aligned UX, semantic turn guidance, manual location fallback, contextual warnings, Details, accessibility announcements.
- `app/qibla/page.tsx`: AppShell + current shared PageHeader + QiblaExperience only.

## Privacy contract

- Exact GPS coordinates may be used locally for Qibla bearing and local WMM declination.
- Before `/api/reverse-geocode`, client coordinates are rounded with `Number(value.toFixed(3))`; server rounds defensively as well.
- Compass readings remain local.
- Factual copy intent: `Your precise location is used on this device to calculate Qibla. A coarse location may be used to display your city.`
- Manual location search uses the existing server-side Geoapify credential; never expose `GEOAPIFY_API_KEY` to browser code.
- Forward geocode queries are bounded, trimmed, rate-limited, max 5 results, and return only label/latitude/longitude fields.

## UX contract

- Do not duplicate the PageHeader title in the initial card.
- Initial: `Find Qibla` + `Use your location to calculate the Qibla direction.`
- Bearing-ready: `Qibla · {bearing}° {direction}` + `Enable Live Compass`.
- Live primary: `Turn right {degrees}°` or `Turn left {degrees}°`; raw bearing is secondary.
- Aligned primary: `Facing Qibla` with calm success treatment and hysteresis.
- Bearing-only explicitly says live compass is unavailable and instructs use of the true-north bearing with a trusted compass. Do not show a static pointer that can be mistaken for live guidance.
- Calibration/tilt/landscape guidance appears only when actually required.
- Technical data belongs behind `Details`; no raw needle rotation or five-decimal coordinates in the default experience.
- If map link remains, label it `View current location`; do not imply a Qibla map.
- Center desktop experience at roughly `max-width: 680px` and use current public `--ui-*` tokens rather than expanding legacy `--color-*` usage.

## RTL physical compass contract

Physical directions never mirror: North=top, East=right, South=bottom, West=left. Use a deterministic physical coordinate container (for example `dir="ltr"`) while localized labels can render correctly. Positive arrow rotation remains clockwise in every locale.

## Accessibility contract

- Moving compass graphic is `aria-hidden` and does not receive per-frame accessible names.
- Real semantic text exposes turn direction or `Facing Qibla`.
- `aria-live` is categorical only: bearing ready, live ready, calibration, flat-phone warning, portrait warning, unavailable, aligned.
- No raw degree announcement per sensor event.
- Preserve >= ~44px shared control targets.
- Respect `prefers-reduced-motion`; functional orientation may update, unnecessary easing/decorative animation is disabled.

## Lifecycle/performance contract

- Raw/transient samples live in refs; semantic React updates are capped around 10Hz.
- Time smoothing uses `1 - exp(-deltaMs / timeConstantMs)` with default `timeConstantMs = 180`.
- On visibility/page hide: detach or pause listeners, cancel frames/timeouts, stop React updates.
- On foreground: reset smoothing timestamp and restart only if the user had enabled compass permission; require a fresh trustworthy heading before live status.
- Retry/resume must not duplicate listeners; stale permission promises must not revive an unmounted/dead controller.

## Failure/offline contract

Reverse geocoding, forward geocoding, and external services are not dependencies of bearing calculation, live guidance, or alignment. GPS + reverse-geocode failure must still yield Qibla. WMM correction is local from the bundled model. Do not claim full cold-start offline support without PWA/physical evidence.

## Release QA authority

Create and execute a physical matrix covering recent iPhone Safari + Home Screen PWA, Pixel Chrome, Samsung Galaxy Chrome + Samsung Internet where supported, and Prayerapp Android TWA. Cover permissions, denial/retry, portrait/landscape, flat/tilted, calibration/interference, background/resume, bearing-only, Arabic RTL, large text, reduced motion, and comparison with a trusted external compass away from magnetic interference. DevTools sensor emulation cannot produce a physical-device PASS.
