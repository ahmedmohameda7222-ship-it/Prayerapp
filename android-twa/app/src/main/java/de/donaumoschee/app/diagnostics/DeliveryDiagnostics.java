package de.donaumoschee.app.diagnostics;

import android.util.Log;

import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;

public final class DeliveryDiagnostics {
    private static final String TAG = "DanubePrayerTelemetry";
    private static final Set<String> KNOWN_SIGNALS = Set.of(
            "schedule_refresh_failure",
            "receipt_retry_failure",
            "native_unhealthy",
            "adhan_playback_failure"
    );
    private static final Pattern SAFE_CODE = Pattern.compile("[a-z0-9][a-z0-9._-]{0,63}");

    private DeliveryDiagnostics() {}

    public static boolean isKnownSignal(String signal) {
        return signal != null && KNOWN_SIGNALS.contains(signal);
    }

    public static String sanitizeCode(String code) {
        if (code == null || code.isBlank()) return "none";
        String canonical = code.trim().toLowerCase(Locale.ROOT);
        return SAFE_CODE.matcher(canonical).matches() ? canonical : "redacted";
    }

    public static void emit(String signal, String code) {
        String safeSignal = isKnownSignal(signal) ? signal : "unknown";
        Log.w(TAG, "signal=" + safeSignal + " code=" + sanitizeCode(code));
    }
}
