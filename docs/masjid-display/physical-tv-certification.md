# Masjid Display — Physical TV / QR Certification

Status: PLAN 7 PHYSICAL CERTIFICATION PENDING

Physical release evidence is recorded by **hardware + browser/runtime + resolution + scaling + viewing distance**, not by vendor-specific code assumptions. Amazon Fire TV / Silk is a primary expected university target, but the implementation remains standards-based. Existing Samsung-TV evidence is secondary compatibility evidence only.

Automated tests, CSS inspection, screenshots, and desktop browser checks do not substitute for an actually executed physical TV check or a real QR scan.

## Known pre-Plan 7 baseline

The prior real-TV check at 100% browser zoom established only that the TV renderer loads on physical hardware. It also established the two approved Plan 7 presentation findings: browser chrome remained visible in ordinary browser mode, and the Prayer Strip Iqama presentation was too cramped. That baseline is not a PASS for the Plan 7 fixes.

## Required target record

Record these fields for the actual university release runtime:

| Field | Result |
| --- | --- |
| TV/display model | NOT EXECUTED |
| Fire TV device/runtime, if used | NOT EXECUTED |
| Browser and version, if available | NOT EXECUTED |
| Resolution | NOT EXECUTED |
| Browser zoom/scaling | NOT EXECUTED |
| Viewing distance | NOT EXECUTED |

## Required physical evidence

| Required physical evidence | Result | Evidence to record |
| --- | --- | --- |
| Actual university target runtime | NOT EXECUTED | Hardware, browser/runtime, resolution, scaling/zoom, viewing distance |
| Fullscreen/presentation activation | NOT EXECUTED | Remote/pointer activation and resulting browser UI state |
| Browser chrome removal where supported | NOT EXECUTED | Whether tabs/address/navigation chrome disappears |
| Safe fallback where fullscreen is unavailable/denied | NOT EXECUTED | Browser-level/manual operating path remains usable |
| Arabic RTL/shaping | NOT EXECUTED | Physical visual confirmation |
| German clipping/overflow | NOT EXECUTED | Physical visual confirmation |
| Prayer Strip readability | NOT EXECUTED | Practical-distance observation |
| Separate Iqama row/block | NOT EXECUTED | Five normal prayers separated; Sunrise and Friday Jumuah excluded |
| Clock/countdown readability | NOT EXECUTED | Practical-distance observation |
| Content and urgent/status readability | NOT EXECUTED | No essential state is obscured |
| QR safe area | NOT EXECUTED | Quiet zone and full code visible |
| Persistent Prayerapp QR scan | NOT EXECUTED | Real phone/camera resolves to `https://donaumoschee.vercel.app` |
| Campaign QR scan | NOT EXECUTED | Real phone/camera resolves to the safe HTTPS campaign target |
| Pixel-shift clipping/visibility | NOT EXECUTED | Essential content stays inside the visible area |
| Temporary network interruption | NOT EXECUTED | Valid LKG persists safely; reconnect refreshes automatically |
| Wake/visibility recovery | NOT EXECUTED | Current logical time/state refreshes without stale replay |

## Fullscreen operating procedure

1. Open the exact Plan 7 candidate on the target TV/browser at the intended resolution and 100% zoom/scaling unless the actual deployment requires a documented alternative.
2. While not fullscreen, locate the native **Vollbild / ملء الشاشة** button.
3. Activate it with the normal browser interaction available on the target: pointer/touch, keyboard Enter/Space, or the TV remote's ordinary focused-button action.
4. Confirm fullscreen is requested only from that user gesture. The application must never auto-enter fullscreen on load.
5. If the browser permits the standard Fullscreen API, confirm browser chrome/navigation UI disappears as far as that runtime supports and the setup control disappears.
6. Exit fullscreen using the browser/device's normal exit mechanism. Confirm the setup control returns and the display remains operational.
7. If the Fullscreen API is unavailable or denied, confirm the concise fallback instruction appears and use the browser/device's own fullscreen or presentation command if one exists. Do not treat lack of programmatic fullscreen as a renderer failure when the documented fallback works.
8. Confirm fullscreen entry/exit does not change Test Mode, prayer state, content rotation, QR content, LKG behavior, logical clock, diagnostics, or urgent overlays.

No vendor-specific user-agent branch is required or expected. A compatibility workaround may be added only after the actual target demonstrates a standards incompatibility, and then only with narrow regression coverage.

## Physical execution sequence

1. Deploy the exact candidate commit to the existing `donaumoschee-tv` project and record deployment ID, preview URL, and attached commit SHA.
2. Execute the fullscreen procedure above on the actual university target runtime.
3. Inspect header, Arabic/German text, clock, content, Prayer Strip, separate Iqama row, urgent/status overlays, persistent QR safe area, and pixel-shift behavior at practical viewing distance.
4. Run the deterministic Admin Test Mode checklist in `docs/masjid-display/test-mode-demo.md`.
5. Scan the persistent Prayerapp QR with a real phone/camera and record the resolved URL.
6. Run a safe HTTPS Campaign Test Mode scenario, scan its Campaign QR with a real phone/camera, and record the resolved URL.
7. After a valid LKG exists, temporarily interrupt network connectivity. Confirm safe LKG behavior, restore connectivity, and confirm automatic current-state refresh with no stale religious/test-state replay.
8. Background/sleep the browser/device where possible, return it to visible state, and confirm logical time/state refresh.
9. Record each executed result. Anything not actually executed remains `NOT EXECUTED`.

A rendered screenshot, unit test, or CSS assertion is never sufficient evidence for a real QR scan or physical-TV PASS.
