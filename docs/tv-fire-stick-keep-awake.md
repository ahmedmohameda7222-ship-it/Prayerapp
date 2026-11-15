# Fire Stick / Silk: mosque TV always-on check

The TV website requests a W3C Screen Wake Lock while its browser tab is visible. When it is denied or automatically released, the application retries when the page becomes visible again and rechecks every four minutes. **No artificial click or pointer movement is emitted:** synthetic DOM activity does not reset the Fire TV operating system idle timer.

## Field check (physical device only)
1. On the installed Fire Stick, open `https://donaumoschee-tv.vercel.app/?diagnostics=1` over HTTPS in Amazon Silk. The diagnostics panel exposes `Browser Wake Lock (best effort)`.
2. `active`: the browser accepted the request, **not a guarantee** the Fire TV OS will ignore its own screensaver/power-saving policy. Leave the screen on longer than the previously observed five-minute timeout and verify manually.
3. `unsupported`: Silk does not expose the required API. `denied`: it exposes it but refused the request. `hidden` / `released`: tab was deactivated or the lock was dropped, and it will try again on visibility/interval.
4. After testing, remove `?diagnostics=1` to return to the normal display. The black congregation state always overrides diagnostics and remains black.

## If the Fire Stick still sleeps
The browser does not have authority to change the Amazon device's OS sleep policy. Do not rely on JavaScript timers, page refreshes, synthetic remote presses or hidden autoplay video as a hardware keep-alive. Amazon's Fire TV developer documentation describes the native Android `FLAG_KEEP_SCREEN_ON` activity flag (or a power-manager wake lock during playback) as the supported mechanism for a native app. A purpose-built kiosk/Fire TV wrapper or device-level admin setup is required when Silk will not honor Screen Wake Lock. Avoid changing unrelated Android TWA or Root App code.

This feature does not run on the Admin app, does not alter canonical prayer times, and continues to behave offline as long as the TV tab is alive. Use normal device QA to validate the specific Fire Stick model and Fire OS version.
