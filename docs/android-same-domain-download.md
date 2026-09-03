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
2. The newest stable `android-v*` GitHub Release matches that manifest version exactly.
3. The release contains the exact `danube-mosque.apk` asset plus `android-release.json` produced by the protected `Android production release` workflow.
4. Release metadata matches package/version/asset/signer identity.
5. GitHub's release-asset SHA-256 digest matches `android-release.json`.
6. The GitHub release asset size is positive and no larger than the server-side 32 MiB safety limit.
7. The server fetch target is the fixed repository release URL for that exact tag and asset; request input cannot choose or modify the upstream URL.
8. The complete upstream body is buffered with a hard byte limit and must match the release asset size and SHA-256 before any APK bytes are returned to the client.

A timeout, upstream error, malformed/missing metadata, wrong tag, unexpected asset, unexpected size, partial body, or digest mismatch produces a controlled 5xx response with no GitHub asset URL exposed to the client.

The stable `/android/download` alias is deliberately returned with `Cache-Control: no-store` (and equivalent CDN no-store headers). This prevents an older APK from remaining cached at the stable URL after a future Production release.

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
2. Merge/deploy that reviewed manifest change through the normal Git-linked Vercel architecture. Until a matching approved Production release exists, `/android/download` fails closed instead of serving 1.0.4 as if it were current.
3. Run the existing protected Android build/release process. The `Android production release` workflow must run from current `main`, verify the current-main Android workflow, reconstruct the permanent Production signing identity, build and verify the APK/AAB, and publish tag `android-v1.0.5` only with the explicit Production confirmation/environment approval.
4. That protected workflow generates `android-release.json` from the verified APK. The metadata contains the 1.0.5 package/version identity, exact APK asset name, exact APK SHA-256, and Production signer fingerprint; GitHub also records the canonical release-asset digest and size.
5. `/android/download` resolves release data fresh. As soon as the protected `android-v1.0.5` release is published and its metadata/digest/size all match the already-deployed manifest, the endpoint automatically starts serving the exact 1.0.5 APK bytes. No APK binary is committed to the Next.js repository and no manual hash substitution is needed.
6. `Android public download smoke` independently downloads the canonical GitHub Release APK and the live Prayerapp-domain APK, verifies HTTP 200/no GitHub redirect, SHA-256, exact byte equality, package/version/versionCode, SDK identity, and Production signer certificate.

This ordering intentionally permits a temporary controlled 5xx window between a manifest deployment and Production Android publication. It never silently falls back to an older or unverified APK and therefore cannot accidentally promote an unsigned release candidate.
