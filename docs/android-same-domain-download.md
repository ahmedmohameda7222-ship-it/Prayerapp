# Android same-domain APK delivery

## Public contract

Normal users download the current approved Production APK from:

```text
https://donaumoschee.vercel.app/android/download
```

The browser receives the APK response body from the Prayerapp/Vercel origin. The endpoint does not redirect the client to GitHub, `release-assets.githubusercontent.com`, or `objects.githubusercontent.com`.

GitHub Release remains the canonical Android release authority. The website does not commit or rebuild the APK and does not alter Android signing.

## Trust chain

`GET /android/download` fails closed unless all of the following agree:

1. `android-twa/twa-manifest.json` supplies the expected package ID, `versionName`, `versionCode`, and minimum supported version code.
2. The server derives exactly one expected Production tag: `android-v${versionName}`. The download path resolves that exact GitHub Release by tag; it does not scan historical releases.
3. The exact release contains the expected `danube-mosque.apk` asset plus the exact `android-release.json` asset produced by the protected `Android production release` workflow.
4. Release metadata matches package/version/asset/signer identity.
5. GitHub's release-asset SHA-256 digest matches `android-release.json`.
6. The GitHub release asset size is positive and no larger than the server-side 32 MiB safety limit.
7. The canonical APK fetch always starts at the fixed repository/tag/asset URL. Request input cannot select or modify an upstream URL or redirect allowlist.
8. APK redirects are handled manually. Before every network hop, the target must use HTTPS, contain no credentials or non-default port, and match one of the exact required hosts: `github.com` or `release-assets.githubusercontent.com`. HTTP downgrade, malformed locations, localhost/private/external hosts, and excessive redirect chains fail closed before the target is fetched.
9. One 20-second AbortSignal deadline begins before release-authority lookup and remains active across the exact release API request, release-metadata fetch, redirect resolution, APK fetch, and APK body read.
10. The complete APK body is buffered with a hard byte limit and must match the release asset size and SHA-256 before any APK bytes are returned to the client.

A timeout, upstream error, malformed/missing metadata, wrong tag, unexpected asset, unapproved redirect, unexpected size, partial body, or digest mismatch produces a controlled no-store 5xx response with no GitHub asset URL exposed to the client.

The stable `/android/download` response is deliberately returned with `Cache-Control: no-store` (and equivalent CDN no-store headers). This prevents an older APK from remaining cached at the user-facing stable URL after a future Production release.

The exact-tag release authority lookup uses a short 60-second server-side revalidation cache. The cache key is tied to the manifest-derived tag. Therefore, after the manifest advances, an older cached release cannot be selected as the new version. If the matching new tag or metadata is not available yet, the endpoint returns a controlled 503 until the exact new authority can be resolved; it never falls back to the previous APK.

## Current Production evidence (1.0.4)

At implementation time the approved Production release is:

- tag: `android-v1.0.4`
- package: `de.donaumoschee.app`
- versionName: `1.0.4`
- versionCode: `7`
- APK asset: `danube-mosque.apk`
- APK size: `1590092` bytes
- APK SHA-256: `39c0bcd32f025af0411f0eeb7394f07145363d4da7daf80140bdf6bd2b773b3e`
- Production signer SHA-256: `E9:98:4B:DB:36:FF:2F:8F:A5:58:29:5C:5C:06:6F:BA:ED:3A:BD:BD:CC:80:1C:83:5D:AE:1B:DD:4C:D7:0E:92`

These values are release evidence, not a second APK authority. Runtime SHA-256 and asset size are taken from the validated Production GitHub Release metadata rather than from a committed APK binary.

## What happens for 1.0.5

1. Change `android-twa/twa-manifest.json` through the normal reviewed development process so `versionName` becomes `1.0.5` and `versionCode` is monotonically increased.
2. Merge/deploy that reviewed manifest change through the normal Git-linked Vercel architecture. The server immediately derives the new expected tag `android-v1.0.5`. Any cached 1.0.4 authority is keyed to the old exact tag and cannot satisfy the new manifest identity. Until a matching approved 1.0.5 release exists, `/android/download` fails closed instead of serving 1.0.4 as if it were current.
3. Run the existing protected Android build/release process. The `Android production release` workflow must run from current `main`, verify the current-main Android workflow, reconstruct the permanent Production signing identity, build and verify the APK/AAB, and publish tag `android-v1.0.5` only with the explicit Production confirmation/environment approval.
4. That protected workflow generates `android-release.json` from the verified APK. The metadata contains the 1.0.5 package/version identity, exact APK asset name, exact APK SHA-256, and Production signer fingerprint; GitHub also records the canonical release-asset digest and size.
5. `/android/download` resolves only `android-v1.0.5`. After the protected release and matching metadata are available, the short authority cache refreshes and the endpoint starts serving the exact verified 1.0.5 APK bytes. No APK binary is committed to the Next.js repository and no manual hash substitution is needed.
6. `Android public download smoke` independently downloads the canonical GitHub Release APK and the live Prayerapp-domain APK, verifies HTTP 200/no GitHub redirect, SHA-256, exact byte equality, package/version/versionCode, SDK identity, and Production signer certificate.

This ordering intentionally permits a temporary controlled 5xx window between a manifest deployment and Production Android publication. It never silently falls back to an older or unverified APK and therefore cannot accidentally promote an unsigned release candidate.
