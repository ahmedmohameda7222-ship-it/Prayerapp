# Masjid Display — Physical TV / QR Certification

Status: BLOCKED — physical execution pending

Automated unit, integration, build, or browser-viewport checks do not substitute for physical display inspection or a real QR scan. No physical TV, Samsung browser, phone camera, or QR scanner was available to this ChatGPT execution, so no row below is marked PASS.

| Required physical evidence | Result | Evidence to record |
| --- | --- | --- |
| 32-inch 1080p reference display | BLOCKED | TV model/browser, resolution, viewing distance, photos/notes |
| Larger 16:9 display when available | BLOCKED | Size/model/browser and layout observations |
| 2560×1440 adaptive viewport/display | BLOCKED | Device/browser or controlled physical viewport evidence |
| 4K viewport/display | BLOCKED | Device/browser and adaptive-layout observations |
| Arabic RTL/shaping | BLOCKED | Physical visual confirmation |
| German clipping/overflow | BLOCKED | Physical visual confirmation |
| Prayer Strip readability | BLOCKED | Practical-distance observation |
| Clock/countdown readability | BLOCKED | Practical-distance observation |
| Overscan/safe area | BLOCKED | All important content visible inside physical safe area |
| Persistent Prayerapp QR scan | BLOCKED | Real phone/camera scan reaches configured Prayerapp URL |
| Campaign QR scan | BLOCKED | Real phone/camera scan reaches configured campaign URL |
| Urgent readability | BLOCKED | Urgent overlay readable without obscuring essential state |
| Long bilingual Test scenario | BLOCKED | Arabic/German stress scenario remains legible |
| Event/card grouping | BLOCKED | One/two-card behavior remains readable |
| Campaign + QR composition | BLOCKED | QR quiet zone/size and copy both usable |
| Stale-data overlay | BLOCKED | Warning remains legible with shell content |
| Pixel-shift clipping/visibility | BLOCKED | Full shift cycle never clips essential content |

## Physical execution procedure

1. Deploy the exact candidate commit to the TV project and record the deployment identifier.
2. On a 32-inch 1920×1080 display, open the production TV URL in the target browser. Record model, browser/runtime version, resolution, scaling/zoom, and viewing distance.
3. Run the deterministic Admin Test Mode checklist in `docs/masjid-display/test-mode-demo.md`, including the long Arabic/German, Urgent, Event, Campaign+QR, stale-data, and prayer/Jumuah scenarios.
4. Observe a full pixel-shift cycle and inspect all edges for overscan/clipping.
5. Scan the persistent Prayerapp QR with a physical phone/camera and record the resolved URL/result.
6. Scan a Campaign QR the same way and record the resolved URL/result.
7. Repeat adaptive checks at 2560×1440 and 4K on physical displays when available; also record a larger 16:9 display result.
8. Attach dated evidence and reviewer identity/initials. Change a row to PASS only for an actually executed check.

No physical PASS may be inferred from screenshots, unit tests, or CSS inspection alone.
