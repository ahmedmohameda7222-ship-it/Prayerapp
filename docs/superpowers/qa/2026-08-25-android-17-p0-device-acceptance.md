# Android 17 P0 Device Acceptance

Build required: de.donaumoschee.app / 1.0.3 / code 6 / target 37 / min 23
Signing certificate: E9:98:4B:DB:36:FF:2F:8F:A5:58:29:5C:5C:06:6F:BA:ED:3A:BD:BD:CC:80:1C:83:5D:AE:1B:DD:4C:D7:0E:92

P0-A passes only if native Adhan plays through the production path while the app is backgrounded/locked and in the supported idle path, and schedule recovery is verified after reboot.

P0-B passes only if native prayer reminders arrive through the production path under the same supported background conditions and after reboot.

P0-C passes only if a clean install does not show the Play Protect warning saying the app was built for an older Android version / does not include the latest privacy protections.

Force Stop, powered-off device, revoked exact-alarm access, and revoked notification permission are explicitly outside the delivery guarantee.

## Exact candidate evidence

- PR: #89
- Source SHA: pending exact post-checklist head
- Successful unsigned Android TWA run: pending
- Protected signing run: pending
- Signed APK SHA-256: pending
- Device: Samsung Galaxy S25
- Device Android version / API: pending
- Play Protect version/state: pending

## P0 result record

| Gate | Required evidence | Result |
| --- | --- | --- |
| P0-C | Clean install of the exact signed RC; no old-Android/latest-privacy-protections warning. Record any separate reputation warning verbatim. | PENDING |
| P0-A | Native Adhan while backgrounded/locked, backgrounded/unlocked, supported process reclaim, supported idle/Doze path, and real-schedule reboot repair. | PENDING |
| P0-B | Native reminder while backgrounded/locked, supported idle/Doze path, and real-schedule reboot repair. | PENDING |

## P0-C clean-install procedure

1. Uninstall any existing Danube Mosque installation.
2. Delete previous `danube-mosque*.apk` files from Downloads.
3. Transfer or download only the exact signed RC recorded above.
4. Open the APK through the normal package installer.
5. Pass only if the specific old-Android/latest-privacy-protections warning does not appear.
6. Record a separate `Play Protect hasn't seen this app before` reputation message separately; it is not the old-target warning.

If ADB is available, record:

```bash
adb shell dumpsys package de.donaumoschee.app \
  | grep -E 'versionCode=|versionName=|targetSdk=|minSdk='
```

## P0-A native Adhan procedure

1. Grant notification permission and exact-alarm access; confirm native readiness.
2. Confirm the selected Adhan is cached/ready.
3. Settings → `Real prayer simulation` → choose a prayer → `Simulate Adhan now`.
4. Immediately press Home and lock the screen before the 10-second alarm fires.
5. Pass only if the saved Adhan starts through the native alarm/service path while the UI is not foreground.
6. Repeat with the app backgrounded and screen unlocked.
7. For supported process reclaim, schedule the test and run `adb shell am kill de.donaumoschee.app`; do not use Force Stop.
8. For supported idle, schedule the test, background/lock, run `adb shell dumpsys deviceidle force-idle`, then restore with `adb shell dumpsys deviceidle unforce`.
9. For reboot persistence, verify a real configured upcoming prayer/Adhan arrives after reboot through repaired native scheduling; synthetic 10-second alarms are not reboot proof.

## P0-B native reminder procedure

1. Settings → `Real prayer simulation` → `Simulate 15-min reminder`.
2. Immediately background and lock the device before the 10-second test alarm.
3. Pass only if the native reminder notification appears correctly.
4. Repeat under supported idle with `adb shell dumpsys deviceidle force-idle`, then restore with `adb shell dumpsys deviceidle unforce`.
5. For reboot persistence, verify a real configured upcoming reminder arrives after reboot through repaired native scheduling.

## Failure rule

If any of P0-A, P0-B, or P0-C fails, do not merge and do not publish. For a P0-C failure on an independently verified target-37 APK, record the APK SHA-256, device Android version/API, Play Protect version/state, screenshot, and exact warning wording before classification/appeal. Do not change target SDK or permissions speculatively.
