# Masjid Display — Soak Test Certification

Status: BLOCKED — 24-hour physical/runtime soak not executed

The initial release gate requires at least **24 continuous hours** on the deployed candidate. A 72-hour extension should be completed before final release when practical. Unit/integration tests and CI duration do not count as soak time.

## Run record

| Field | Required value |
| --- | --- |
| Exact commit | Record candidate SHA |
| Deployed version | Record deployment/build identifier |
| Device/browser | Record physical device and browser/runtime |
| Start timestamp | ISO timestamp with timezone |
| End timestamp | ISO timestamp with timezone |
| Continuous duration | Must be ≥24h for initial PASS |
| 72h extension | Record separately if performed |

## During-soak checklist

Record observations for:

- unattended idle operation;
- network disconnect and reconnect;
- display sleep/wake;
- browser background throttling/visibility return;
- Test Mode start;
- Test Mode scenario switch;
- Test Mode Stop;
- automatic Test Mode expiry;
- repeated Feed polling;
- repeated Test Control polling;
- memory/responsiveness over time;
- black screen occurrence;
- stale religious-state replay;
- uncontrolled reload/reload loop;
- frozen renderer;
- synthetic Test data leakage into production Feed or LKG.

Any black screen, stale religious-state replay, reload loop, frozen renderer, or Test data leakage blocks certification until corrected and the required soak is repeated on the corrected candidate.

## Current results

- **24-hour soak: BLOCKED — not executed.**
- **72-hour soak: BLOCKED — not executed.**
