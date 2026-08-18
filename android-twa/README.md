# Danube Mosque Android TWA

Long-term Android shell for the Danube Mosque PWA.

## Architecture

- Web/PWA source of truth: `https://masjidelrahman.vercel.app/`
- Android package ID: `de.donaumoschee.app`
- Android shell: Trusted Web Activity (TWA) using Android Browser Helper
- Compile/target SDK: API 36
- Minimum SDK: API 23
- Android Browser Helper: 2.7.2
- Android Gradle Plugin: 8.11.1
- Gradle: 8.13
- JDK: 17

The Android project intentionally stays thin. Product UI, routing, authentication, prayer data, Web Push, service worker behavior, and most feature updates remain in the PWA. Native releases are reserved for Android-shell changes such as SDK updates, package metadata, signing, icons, or TWA configuration.

`twa-manifest.json` is the Android configuration source of truth for package/host/SDK/version settings used by Gradle. Android localized launcher labels live in `app/src/main/res/values-*` because Android chooses them from the device locale.

## Local build

Install Android SDK API 36, JDK 17 and Gradle 8.13, then run:

```bash
gradle --no-daemon :app:lintDebug :app:assembleDebug
```

GitHub Actions performs the same build and uploads an internal debug APK artifact. A debug APK proves that the native shell compiles, but it is not the production-signed application.

## Production signing — one-time identity step

The release key is the permanent Android identity of this app. Never commit it to Git.

Create one release keystore and keep at least two secure offline backups:

```bash
keytool -genkeypair -v \
  -keystore danube-mosque-release.jks \
  -alias danube-mosque \
  -keyalg RSA -keysize 2048 -validity 10000
```

Copy `signing.properties.example` to `signing.properties` and fill in the local values. `signing.properties`, `*.jks`, and `*.keystore` are ignored by Git.

Print the SHA-256 certificate fingerprint with:

```bash
keytool -list -v -keystore danube-mosque-release.jks -alias danube-mosque
```

Then replace the placeholder in `assetlinks.template.json` and publish the resulting JSON at:

```text
https://masjidelrahman.vercel.app/.well-known/assetlinks.json
```

Only publish Asset Links after the permanent release certificate has been chosen. A placeholder or temporary debug fingerprint must never be deployed to production.

## Release build

After `signing.properties` points at the permanent keystore:

```bash
gradle --no-daemon :app:lintRelease :app:assembleRelease :app:bundleRelease
```

Outputs:

- APK: `app/build/outputs/apk/release/`
- AAB: `app/build/outputs/bundle/release/`

For direct distribution outside Google Play, use the signed release APK. Keep the same package ID and signing key for every future update.

## TWA verification

A real fullscreen TWA requires both sides of Digital Asset Links:

1. The Android app declares trust for `https://masjidelrahman.vercel.app` using `asset_statements`.
2. The website publishes `/.well-known/assetlinks.json` containing package `de.donaumoschee.app` and the SHA-256 fingerprint of the permanent release certificate.

If verification is missing or wrong, Android Browser Helper intentionally falls back to a Custom Tab instead of pretending that the origin is trusted.

## Release discipline

- Never change `de.donaumoschee.app` after public distribution.
- Never replace or lose the permanent signing key.
- Bump `versionCode` for every native Android release.
- Keep `targetSdkVersion` current as Android requirements move.
- Update Android Browser Helper deliberately and validate notifications, app links, back navigation, cold start, background behavior and the Adhan flow on real Android hardware.
- Normal PWA UI/content updates do not require a new APK when the TWA shell itself is unchanged.
