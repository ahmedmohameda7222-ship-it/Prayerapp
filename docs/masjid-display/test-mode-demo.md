# Masjid Display — Deterministic Admin Test Mode Demo

Status: READY FOR OPERATOR EXECUTION

This checklist exercises the real TV renderer through the Admin-only **Masjid Display Test** controls. Every synthetic scenario is temporary. The expected badge is always `TEST MODE / وضع الاختبار`. When a valid canonical Prayerapp URL exists, the persistent Prayerapp QR remains visible in every scenario.

| Admin scenario | Expected TV visual state | Countdown | Persistent QR | Stop / expiry expectation |
| --- | --- | --- | --- | --- |
| Normal display | Synthetic normal announcement card | None | Visible | Stop or 15-minute expiry returns to current real state |
| Prayer approaching | `PRAYER_APPROACHING`, selected prayer | Running toward synthetic T+10 target | Visible | Stop/expiry immediately returns to current real state |
| Prayer Time Now | `PRAYER_TIME_NOW` | No persisted counter | Visible | Stop/expiry returns to current real state |
| Waiting for Iqama | `WAITING_FOR_IQAMA` | Running toward synthetic T+5 target | Visible | Stop/expiry returns to current real state |
| Iqama Now | `IQAMA_NOW` | None required | Visible | Stop/expiry returns to current real state |
| Prayer In Progress | `PRAYER_IN_PROGRESS` | None required | Visible | Stop/expiry returns to current real state |
| Friday mode / first Jumuah | `FRIDAY_MODE`, service #1 | Running toward synthetic T+60 target | Visible | Stop/expiry returns to current real state |
| Additional Jumuah countdown | `FRIDAY_MODE`, additional service | Running toward synthetic T+10 target | Visible | Stop/expiry returns to current real state |
| Jumuah Now | `JUMUAH_NOW` | None required | Visible | Stop/expiry returns to current real state |
| Urgent announcement | Synthetic urgent bar/content only | None | Visible | Stop/expiry removes synthetic urgent content |
| Special Display | Synthetic special announcement | None | Visible | Stop/expiry returns to current production rotation |
| Event slide | Synthetic bilingual Event | None | Visible | Stop/expiry removes synthetic Event |
| Donation Campaign with QR | Synthetic campaign plus Campaign QR | None | Prayerapp QR remains separately visible | Stop/expiry removes synthetic Campaign |
| Donation Campaign without QR | Synthetic campaign, no Campaign QR | None | Prayerapp QR remains visible | Stop/expiry removes synthetic Campaign |
| Azkar slide | Synthetic Arabic/German Azkar | None | Visible | Stop/expiry returns to current production rotation |
| Offline/LKG visual | Offline status treatment with synthetic content | None | Visible when canonical URL is valid | Stop/expiry restores actual network/LKG status |
| Stale prayer horizon | Stale/update-needed fail-safe | No religious countdown | Visible | Stop/expiry restores current real coverage |
| Missing/incomplete configuration | Configuration-degraded visual | No invented prayer/Iqama value | Visible when canonical URL is valid | Stop/expiry restores real configuration state |
| Long Arabic/German | Long bilingual stress card | None | Visible | Stop/expiry returns to current production rotation |

## Operator sequence

1. Open the Admin-only **Masjid Display Test** page and the actual TV display.
2. Start each scenario in the table in button order. Confirm the expected state, countdown behavior where applicable, the TEST MODE badge, and persistent Prayerapp QR behavior.
3. Switch directly from one active scenario to another and confirm the TV changes within the approximately two-second Test Control polling cadence.
4. Use **Extend +15 minutes** once and verify the expiry advances by exactly 15 minutes.
5. Use **Stop Test Mode** and verify the TV immediately returns to the **current** real state rather than replaying the pre-test state.
6. For one scenario, do not stop it. Confirm automatic expiry after 15 minutes and the same return-to-current-real-state behavior.

## Data isolation invariant

Synthetic Test Mode data never enters:

- production `prayer_times`;
- production `prayer_settings` or Jumuah rows;
- announcements, Events, donation campaigns, or other production content tables;
- the production Masjid Display Feed;
- Last Known Good (LKG).

Only the dedicated temporary `masjid_display_test_state` control record is mutated by Admin Test actions. The TV renders synthetic fixture data locally and continues to preserve the production LKG independently.
