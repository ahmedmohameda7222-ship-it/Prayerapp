# Masjid Display — Attacker-Perspective Security Review

Status: PASS — AUTOMATED SECURITY CERTIFICATION

## Boundary

The public TV is treated as an untrusted browser. It may read only the two public display surfaces through its own server-side proxy:

- production Feed: GET only;
- Test Control directive: GET only.

All mutation authority remains in the root Prayerapp Admin application. Test Mode mutations require the existing Admin authorization/audit path and write only the dedicated `masjid_display_test_state` record.

## Reviewed attack surfaces

| Attack surface | Expected control | Certification result |
| --- | --- | --- |
| Supabase access from TV browser | No Supabase browser dependency/runtime | No dependency/use found; automated source gate added |
| Audio/runtime media abuse | No `new Audio` or `<audio>` | No runtime use found; automated source gate added |
| Prayer calculation in TV | No Adhan/calculation runtime | No TV `adhan` dependency/import found; automated source gate added |
| TV mutation | Public/TV routes GET-only | GET-only routes; no mutation handlers |
| Test mutation | Admin auth required | `requireAllowedAdminIdentity` remains in Admin actions |
| Upstream selection/SSRF | Origin fixed by server-only `PRAYERAPP_ORIGIN`; closed path allowlist | Source gate added; request URL/query does not select origin |
| Service/browser secrets | No service-role/Supabase secret in Feed/TV | Source/payload gates added |
| User/Admin data | Feed DTO contains only public display data | Fixture/projection gate added |
| Calculation internals | Coordinates/angles/revisions excluded from Feed | Existing and Plan 5 tests enforce exclusion |
| Diagnostics | Read-only, non-sensitive operational fields | No secret/write controls found |
| Dynamic HTML/script | Render external values through React text/props | No `dangerouslySetInnerHTML`; hostile-string render test added |
| QR injection | QR targets passed as component `value` | Persistent/Campaign QR source gate added |
| Upstream errors | Generic public error, no stack/SQL details | Root and TV route tests/source checks |
| LKG poisoning | Strict full Feed validation before install | LKG calls `validateFeedV1`; invalid 200/schema retained as diagnostics only |
| Synthetic Test data | Dedicated local synthetic rendering; production LKG untouched | Dedicated Test Mode certification added |
| Payload exhaustion | Fixed -1/+35 day prayer horizon and strict projections | Horizon + fixture-size release gate added |

## Public Feed minimization

The v1 Feed intentionally excludes Admin accounts, audit records, auth/session values, service-role credentials, latitude/longitude, calculation angles/rules/revisions, and legacy absolute-Iqama fields. Malformed dynamic content is omitted or causes strict validation failure as appropriate; malformed snapshots are never partially installed into LKG.

## Error disclosure

The root Feed route returns the fixed public error `masjid_display_feed_unavailable` on build failure and logs only an error type, not raw exception details. TV proxy failures return fixed public upstream-unavailable errors. The review found no path that intentionally forwards a stack trace, SQL text, Supabase error object, or secret to the browser.

## Test Mode isolation

Synthetic Test payloads are rendered as typed data. They do not become production Feed records and do not replace LKG. Admin Test actions write only `masjid_display_test_state`; production prayer/content tables are not mutation targets.

## Automated gates

- `lib/__tests__/masjid-display-feed-security.test.ts`
- `masjid-display/lib/security-boundary.test.ts`
- `masjid-display/lib/runtime/offline-certification.test.tsx`
- `masjid-display/lib/runtime/test-mode-certification.test.tsx`
- existing strict Feed/LKG/proxy/Admin tests

No significant unresolved Plan 5 security defect was identified.

Actual implementation evidence on HEAD `b16811c0e994c7ab05831625de886c06b2a785a2`:

- Security Scanners run `35413523141`: SUCCESS.
- CodeQL JavaScript/TypeScript: SUCCESS.
- Gitleaks full-history scan: SUCCESS.
- OSV dependency scan: SUCCESS.
- exact-head isolated runtime DAST: SUCCESS.
- deployed-production non-destructive public/unauthorized DAST: SUCCESS.
- authenticated local DAST: SUCCESS.
- SBOM/dependency evidence generation: SUCCESS.
- Masjid Display Verification run `35413523100`: SUCCESS, including the forbidden Supabase/audio runtime gate.
- Root CI run `35413523120`: SUCCESS.

**SECURITY REVIEW: PASS.**

A later legitimate GitHub Codex Critical/Important/security finding would reopen this gate.
