# Prayerapp Public UI Refinement Design

**Date:** 2026-08-26
**Status:** Approved

## Goal

Refine the existing Prayerapp public UI without redesigning its identity. The work improves legibility, especially for elderly users, strengthens the mosque brand hierarchy, and consolidates typography, spacing, radii, colors, and touch-target rules into one coherent public design system.

## Product Direction

Preserve the current forest-green and warm-neutral visual identity, the current information architecture, the five-destination bottom navigation, the existing Home/Friday/prayer flows, Arabic RTL behavior, PWA/TWA adaptations, reduced-motion behavior, safe-area handling, and all prayer-time logic.

This is a refinement, not a visual reset.

## Brand Header

The localized mosque name remains the primary identity:

- Arabic: `مسجد الدوناو`
- English: `Danube Mosque`
- German: `Donau-Moschee`
- Turkish: `Tuna Camii`

Directly below the mosque name, render the exact registered association name in every locale:

`Deggendorfer Integrations und Bildungsverein e.V`

The registered name is not translated. `Deggendorf` remains tertiary location information below the association name.

The association line must be readable, formal, centered, allowed to wrap, and visually secondary to the mosque name.

## Next Prayer Readability

The Home Next Prayer instrument is the highest-priority readability surface. Increase the visual size of the label, prayer name, adhan time, countdown, and iqama without changing prayer calculations or status behavior.

Target mobile hierarchy:

- label: 16px / 700
- prayer name: 32px / 700
- adhan time: 40px / 700
- countdown: 28px / 700
- iqama: 16px / 600-700

Target desktop hierarchy:

- label: 17px
- prayer name: 36px
- adhan time: 48px
- countdown: 32px
- iqama: 18px

Keep tabular numerals and `aria-live="polite"` on the live countdown.

## Typography System

Use one intentional semantic hierarchy rather than page-specific near-duplicate sizes.

Public UI scale:

- metadata: 12px
- secondary labels: 14px
- body: 16px
- card/list titles: 16-17px
- section titles: 20px
- page titles: 22-24px
- prominent contextual titles: 28-32px
- key prayer values: 34-48px depending on context

Normal UI weights are limited to 400, 500, 600, and 700. Weight 800 is reserved for rare intentional emphasis or branding.

Font roles:

- interface UI: system font stack
- Qur'an/religious Arabic reading: existing Arabic reading stack
- mosque Arabic identity: existing dedicated brand mark/font

Audit remaining Playfair/Tajawal/font-brand usage and remove legacy imports only when no required consumer depends on them.

## Interaction and Accessibility

- Public interactive controls have a minimum 44x44 CSS-pixel hit target.
- Segmented controls and Settings diagnostic actions must not shrink below 44px.
- iOS bottom-navigation labels must never be below 11px; target 12px.
- Preserve visible keyboard focus, reduced motion, reduced transparency, RTL, and safe-area behavior.
- Do not make status understandable by color alone.
- Keep sampled current contrast relationships or improve them; do not weaken contrast.

## Color, Radius, and Spacing

Keep the approved current palette values but expose them through canonical semantic tokens rather than three competing token vocabularies.

Use a small radius system:

- controls: 14px
- cards: 18px
- large surfaces: 24px
- pills: fully rounded only for pill/navigation contexts

Use spacing steps based on 4, 8, 12, 16, 24, and 32px.

Replace the current 3px one-sided status stripes on urgent/Friday surfaces with a calmer semantic treatment: tinted surface, full 1px border, and text/icon/status semantics.

## CSS Architecture

The current Home palette preview has become production authority. Promote it into a canonical Home stylesheet rather than adding another layer.

- rename `app/home-palette-preview.css` to `app/home-ui.css`
- canonical semantic tokens live in the global design-system authority
- Home stylesheet owns Home-specific selectors, not a second token vocabulary
- migrate appropriate Home responsive rules out of `responsive-prayer-nav.css`
- preserve breakpoints and platform behavior

## Responsive and Localization Acceptance

Required QA widths:

- 375px
- 768px
- 1440px

Required locales:

- Arabic
- English
- German
- Turkish

Also verify:

- Arabic RTL
- iOS PWA navigation
- Android/TWA-style navigation
- desktop sidebar
- browser text/zoom enlargement up to 200%
- keyboard focus
- reduced motion
- reduced transparency
- German long association-name wrapping

No horizontal page overflow is acceptable. The Next Prayer instrument must not clip at 375px.

## Scope Exclusions

- no admin redesign
- no dependency upgrades unless separately approved
- no navigation redesign
- no prayer-domain behavior change
- no deployment or merge to `main` as part of implementation

## Verification

Implementation follows RED -> GREEN TDD where practical. Before completion run the repository test suite, lint, build, diff checks, and rendered responsive/localization QA. Stop before merge/deployment and provide a handoff.