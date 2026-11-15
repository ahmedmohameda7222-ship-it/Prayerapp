# Prayerapp Fire TV Kiosk — dedicated, always-on Android Fire OS app

This is **not** the phone Android TWA project. This standalone Android TV
application opens the live mosque display at
https://donaumoschee-tv.vercel.app/ in a native fullscreen WebView.

## Why this exists

On Amazon Silk, the JavaScript Screen Wake Lock API may be unsupported,
denied or ignored by Fire OS. Fake keystrokes, timers, periodic DOM changes,
hidden videos and page reloads **cannot reset the operating-system idle
timer reliably**. A webpage cannot control an already sleeping HDMI device.

The native Android Activity sets
`WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON` for its entire foreground
lifetime. This is the **documented Android/Fire OS mechanism** to prevent
screen-off/Daydream while signage is displayed. The app needs **no button
presses or remote interaction after it is launched**. It releases the flag
on `onPause`; it never holds an unrestricted background CPU wake lock.
It cannot force a powered-off television to turn on or prevent TV firmware
auto power-off, HDMI power loss, an OS-app switch or an app process crash.

Reference:
- https://developer.android.com/develop/background-work/background-tasks/awake/screen-on
- https://developer.amazon.com/docs/fire-tv/faq-general.html
- https://developer.amazon.com/docs/fire-tv/hybrid-apps-overview.html

## Supported devices

- **Android-derived Fire OS** devices that allow Android APK sideloading:
  typically Fire OS 7/8/14/16. Minimum Android API 23.
- **NOT Vega OS** (Amazon's Fire TV Stick 4K Select, Fire TV Stick HD 2026,
  and 4K 3rd Gen 2026): these do not run Android APKs. A separate Vega-native
  app or a suitable Android-derived Fire OS stick is needed.
- For devices with Silk and unknown operating system, check **Fire TV
  Settings > My Fire TV > About**, then compare Amazon device specifications.

Reference: https://developer.amazon.com/docs/fire-tv/fire-os-overview.html

## Getting the test APK (after the GitHub workflow passes)

1. Open the GitHub Actions tab and select **Fire TV Kiosk APK**.
2. Open the **successful** run for the merged commit. Download the
   `prayerapp-fire-tv-kiosk-debug-apk` artifact and extract it.
3. The archive contains `app-debug.apk` (Android SDK debug-signed, **sideloadable**)
   and `SHA256SUMS.txt`. This diagnostic APK is **not** the production
   Android TWA binary and does not contain any secret key.
4. On the supported Android Fire TV, enable developer mode/ADB and sideload
   using the device's IP on the same trusted Wi-Fi network:

```sh
adb connect <FIRE_TV_IP>:5555
adb install -r app-debug.apk
adb shell monkey -p de.donaumoschee.firetv 1
```

After installation open **Prayerapp TV — Stay Awake** from the device's
Apps list. It loads the production TV URL immediately and keeps the window
awake automatically. No further presses are necessary while the Activity
remains foreground. Use the TV Admin Test page on the main webapp to
simulate prayer blackouts and rotating Dhikr; those remain exactly as in
the hosted TV site.

**Power:** Use the Fire Stick's wall power adapter (not a TV USB port that
cuts power during standby). Also disable the *Samsung TV's own* independent
sleep timer/auto-power-off if enabled. Neither feature can be set by an
Android application on an HDMI stick.

## On-device acceptance checklist

- Leave this native app in foreground for **30+ minutes**, beyond the
  previously observed 5-minute idle timeout, with no remote input.
- Confirm the Fire TV screensaver/launcher never replaces the display.
- Confirm all prayer states (real or Admin TV Test), including the genuine
  full-black congregation period, remain correct.
- Confirm disconnection/reconnection: if the *main HTML page fails*, the
  WebView automatically retries after 30 seconds; if API responses fail
  after the page loaded, the existing webapp's cached feed logic applies.
- Confirm remote Home/background causes the device to be allowed to sleep,
  and reopening Prayerapp TV returns the TV display.
- If it still goes inactive, record Fire TV model, Fire OS/Vega OS version,
  whether this is in native Prayerapp TV or Silk, and whether the Samsung
  TV itself powers off. These are distinct failure modes.

## Developer build

Reuse the already checked-in, verified mobile project's **Gradle wrapper**
without modifying the phone app:

```sh
./android-twa/gradlew --no-daemon -p fire-tv-kiosk \
  :app:testDebugUnitTest :app:lintDebug :app:assembleDebug
```

APK: `fire-tv-kiosk/app/build/outputs/apk/debug/app-debug.apk`.

The native WebView only navigates to the exact production HTTPS origin;
JavaScript and DOM storage are enabled for Next.js, cleartext and local
file/content access are disabled, SSL errors are never ignored, and
HTTP mainframe failures retry without requiring remote input.

**Limits:** The OS flag only operates when this Activity is visible.
Android does not allow a third-party app to continuously wake the screen
when another app is foreground or the HDMI TV is physically off. Native
startup on every system reboot is not promised; launch the app after
power-on. Production deployment of the TV website is still through Vercel.
