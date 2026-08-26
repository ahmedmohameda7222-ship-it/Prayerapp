# Prayerapp Public UI Accessibility & Design-System Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use RED -> GREEN TDD, frequent commits, and verification gates.

**Goal:** Refine Prayerapp's approved public UI without redesigning its identity: improve typography and elderly readability, add the official association name under the mosque brand, enlarge the Next Prayer instrument, normalize touch targets, and consolidate the public design system.

**Architecture:** Keep the existing Next.js/React/PWA structure and current visual direction. Establish one canonical semantic design-token layer in `app/globals.css`, make Home/non-Home styles consume those tokens, preserve page-specific selectors where useful, and remove preview/duplicate authority rather than adding another CSS layer. Functional navigation, localization, prayer calculations, PWA behavior, RTL, and platform adaptations remain unchanged.

**Tech Stack:** Next.js 16.3.2, React 19, TypeScript, CSS/Tailwind utilities, existing i18n layer, Vitest + Testing Library, PWA/TWA.

**Spec:** `docs/superpowers/specs/2026-08-26-prayerapp-public-ui-refinement-design.md`

## Global Constraints

- Preserve current forest-green / warm-neutral identity.
- Preserve navigation and information architecture.
- Preserve Arabic, English, German, and Turkish.
- Add exact `Deggendorfer Integrations und Bildungsverein e.V` directly below the mosque name in every locale; do not translate the legal name.
- Keep `Deggendorf` as tertiary location information below the association name.
- Prioritize elderly readability on Next Prayer.
- Minimum public interactive target: 44x44 CSS px.
- iOS bottom-navigation label target: 12px and never below 11px.
- UI font role: system stack; religious Arabic and mosque brand keep their existing dedicated roles.
- Normal UI weights: 400/500/600/700; rare 800 only when intentional.
- Preserve focus-visible, reduced-motion, reduced-transparency, safe-area, RTL, and platform adaptations.
- No dependency upgrades, deployment, or merge unless separately approved.
- Before completion: full tests, lint, build, diff checks, rendered responsive/localization QA, then `superpowers:verification-before-completion`.

---

### Task 1: Establish Canonical Public Design Tokens

**Files:** `app/globals.css`, `app/public-ui-refresh.css`, Home CSS; create `components/ui/PublicDesignSystemContract.test.tsx`.

Define semantic typography sizes 12/14/16/20/24/32px, weights 400/500/600/700, radii 14/18/24px + pill, spacing 4/8/12/16/24/32px, and canonical semantic color roles using the approved palette. Home/non-Home variables become aliases during migration.

TDD: add failing source-contract test, verify RED in CI, add minimal tokens/aliases, verify GREEN.

Commit: `refactor(ui): establish semantic public design tokens`

### Task 2: Add Official Association Name to Header

**Files:** `lib/app-brand.ts`, `components/layout/AppHeader.tsx`, Home header CSS; create `components/layout/AppHeaderAssociationName.test.tsx`.

Export `ASSOCIATION_NAME = "Deggendorfer Integrations und Bildungsverein e.V"`; render it directly below mosque name / Arabic brand mark; keep `Deggendorf` below it. Style at 14px mobile, 15px desktop, medium/semibold, readable and wrapping.

TDD: exact legal-name export/render contract and localized mosque-name preservation.

Commit: `feat(header): show mosque association legal name`

### Task 3: Increase Next Prayer Readability

**Files:** `components/prayer/PrayerCountdown.tsx`, `app/responsive-prayer-nav.css`, Home CSS; create `components/home/HomeNextPrayerReadabilityContract.test.tsx`.

Mobile targets: label 16, prayer 32, adhan 40, countdown 28, iqama 16. Desktop targets: label 17, prayer 36, adhan 48, countdown 32, iqama 18. Preserve tabular numerals, prayer logic, and `aria-live="polite"`.

Commit: `feat(home): improve next prayer readability`

### Task 4: Normalize Public Touch Targets

**Files:** `components/ui/SegmentedControl.tsx`, `components/settings/SettingsControls.tsx`, optionally `components/ui/Button.tsx`; create `components/ui/TouchTargetContract.test.tsx`.

Fix SegmentedControl 40px and Settings diagnostic 36px overrides to at least 44px. Verify touched icon-only controls are at least 44x44.

Commit: `fix(a11y): normalize public touch targets`

### Task 5: Improve Bottom Navigation Legibility

**Files:** `app/native-pwa.css`, only if necessary `components/layout/BottomNav.tsx`; extend `components/layout/NavigationContract.test.tsx`.

Replace iOS 10.5px nav labels with 12px. Preserve the five destinations, icons+labels, `aria-current`, RTL, iOS gesture enhancement, normal Link fallback, glass style, and Android adaptation.

Commit: `fix(nav): improve mobile tab label legibility`

### Task 6: Consolidate Public Typography

**Files:** public Home/Friday/prayer/public CSS files and targeted component classes only where they override semantic CSS.

Normalize public roles to metadata 12, secondary 14, body 16, card/list 16-17, section 20, page 22-24, prominent 28-32. Replace unnecessary 560/620/650/680/720/730/750/850 values with approved weights. Audit Playfair/Tajawal/font-brand usage; remove legacy imports only if no required consumer remains.

Commits: `refactor(ui): normalize home typography`, `refactor(ui): normalize friday and public typography`

### Task 7: Normalize Color, Radius, Spacing, and Status Treatment

**Files:** `app/globals.css`, public CSS, `components/ui/Button.tsx`; extend design-system contract test.

Replace touched hard-coded palette values with semantic tokens; replace Button hard-coded gold; normalize radii/spacing. Replace 3px one-sided urgent/Friday stripes with subtle tinted surface + full 1px border + text/icon/status semantics.

Commit: `refactor(ui): unify public surface styling`

### Task 8: Retire Preview CSS Authority

Rename `app/home-palette-preview.css` to `app/home-ui.css`; migrate appropriate Home responsive rules; modify `app/layout.tsx`; replace `HomePalettePreviewContract.test.tsx` with `HomeUiContract.test.tsx` and update Home responsive contracts.

Do not add another CSS layer. Canonical tokens stay global; Home CSS owns Home selectors rather than a second token vocabulary.

Commit: `refactor(css): promote canonical home ui styles`

### Task 9: Responsive, Localization, and Accessibility Hardening

QA at widths 375/768/1440 and locales ar/en/de/tr. Verify Arabic RTL, iOS PWA, Android/TWA-style nav, desktop sidebar, up to 200% text enlargement/zoom, keyboard focus, reduced motion/transparency, and German association-name wrapping.

Acceptance: clean wrapping, no Next Prayer clipping at 375px, no horizontal overflow, no public touch target below 44px, readable nav, correct Arabic direction.

For each reproducible regression: failing test first, then fix.

Commit: `fix(ui): harden responsive localized layouts`

### Task 10: Final Verification and Handoff

Run CI-equivalent checks: `npm run lint`, `npm test`, Supabase migration bootstrap from CI, `npm run build`, and diff checks. Audit changed CSS for sub-11px public labels, targets below 44px, 3px one-sided stripes, arbitrary weights, and new hard-coded palette values where semantic tokens exist. Run rendered QA matrix and `superpowers:verification-before-completion`.

Handoff must include branch, commits, files, checks, rendered QA, retained legacy dependencies, and confirmation that `main` was not merged/deployed. Stop before merge/deploy.
