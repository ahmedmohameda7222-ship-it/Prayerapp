# Qibla Physical-Device QA Matrix

Status: **NOT RUN — release gate remains open.**

This matrix is the final physical validation authority for Prayerapp live Qibla guidance. Automated tests and DevTools sensor emulation do not count as a physical-device PASS.

## Test environment

For every live-compass comparison:

- Test away from speakers, steel furniture, chargers, magnetic phone accessories, vehicles, and other strong magnetic interference.
- Compare Prayerapp guidance against a trusted external/reference compass that is set to the same true-north reference where applicable.
- Confirm the location shown/selected is the intended test location.
- Record device model, OS version, browser/app version, date, test location, and reference-compass method.
- Do not weaken heading validation, WMM correction, portrait gating, tilt gating, or relative-heading rejection just to make an arrow move.

## Required surfaces

| Surface | Device / browser | Status | Evidence / notes |
| --- | --- | --- | --- |
| iPhone Safari | Recent iPhone · current Safari | NOT RUN | Required |
| iPhone PWA | Recent iPhone · installed Home Screen PWA | NOT RUN | Required |
| Pixel Chrome | Recent Pixel · current Chrome | NOT RUN | Required |
| Samsung Chrome | Recent Samsung Galaxy · current Chrome | NOT RUN | Required |
| Samsung Internet | Recent Samsung Galaxy · Samsung Internet, if supported | NOT RUN | Required when available |
| Android TWA | Prayerapp Android TWA | NOT RUN | Required |

## Per-device checklist

Run every applicable row on every required surface above.

| Scenario | Expected result | Status |
| --- | --- | --- |
| Location permission granted | Bearing becomes available without requiring compass permission | NOT RUN |
| Location permission denied | Retry plus city/address search are available | NOT RUN |
| Location retry | No duplicate listeners or stale state | NOT RUN |
| Compass permission granted | Fresh trustworthy heading can activate live mode | NOT RUN |
| Compass permission denied | Bearing-only mode remains usable | NOT RUN |
| Portrait | Trusted live guidance may operate | NOT RUN |
| Landscape | Bearing remains; live guidance pauses with portrait instruction | NOT RUN |
| Phone flat | Trusted live guidance may operate | NOT RUN |
| Phone tilted beyond supported geometry | Live guidance pauses with flat-phone instruction | NOT RUN |
| Flat recovery | A fresh trustworthy sample resumes live guidance | NOT RUN |
| Calibration / interference | Calibration warning appears only when required; unsafe data never becomes authoritative | NOT RUN |
| Background / resume | Sensor work pauses; resume requires a fresh trustworthy heading; no duplicate listeners | NOT RUN |
| Sensor unavailable / timeout | Bearing-only fallback remains useful | NOT RUN |
| Relative orientation only | Relative data never drives live guidance | NOT RUN |
| Arabic RTL | North/top, East/right, South/bottom, West/left remain physically correct; clockwise rotation does not mirror | NOT RUN |
| Large text | Semantic guidance, controls, warnings, Details, and fallback remain readable/usable | NOT RUN |
| Reduced motion | Functional direction remains available without unnecessary easing/spinning | NOT RUN |
| External compass comparison | Turn instruction and aligned state agree with trusted reference within practical sensor limits | NOT RUN |

## Release rule

Code-complete automated validation does **not** authorize the claim “trusted production live Qibla compass.” That claim is blocked until every required physical surface has documented PASS evidence or an explicitly accepted, investigated platform limitation. If physical behavior contradicts browser/spec assumptions, use systematic debugging and preserve the correctness guards.
