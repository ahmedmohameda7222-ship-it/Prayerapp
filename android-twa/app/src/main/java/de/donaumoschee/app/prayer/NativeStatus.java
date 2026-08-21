package de.donaumoschee.app.prayer;

import android.Manifest;
import android.app.AlarmManager;
import android.content.Context;
import android.content.pm.PackageManager;
import android.os.Build;

import androidx.core.content.ContextCompat;

import de.donaumoschee.app.storage.NativeStore;
import de.donaumoschee.app.adhan.AudioCache;

import org.json.JSONException;
import org.json.JSONObject;

import java.time.Instant;

public final class NativeStatus {
    private NativeStatus() {}

    public static boolean hasNotificationPermission(Context context) {
        return Build.VERSION.SDK_INT < 33 || ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED;
    }

    public static boolean hasExactAlarmPermission(Context context) {
        AlarmManager manager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        return Build.VERSION.SDK_INT < 31 || manager.canScheduleExactAlarms();
    }

    public static JSONObject payload(Context context) throws JSONException {
        Instant now = Instant.now();
        NativeStore store = new NativeStore(context);
        NativeConfig config = store.loadConfig(now);
        boolean notification = hasNotificationPermission(context);
        boolean exactAlarm = hasExactAlarmPermission(context);
        boolean scheduleFresh = config != null && config.scheduleValidUntil.isAfter(now);
        boolean installed = store.scheduleInstalled();
        boolean audioReady = true;
        if (config != null) {
            for (NativeConfig.Reminder reminder : config.reminders.values()) {
                if (reminder.enabled && AudioCache.verifiedFile(context, reminder.adhanSoundId) == null) audioReady = false;
            }
        }
        boolean healthy = store.engineHealthy();
        boolean ready = NativeReadiness.isReady(notification, exactAlarm, scheduleFresh, installed, audioReady, healthy);
        return new JSONObject()
                .put("native", true)
                .put("packageId", context.getPackageName())
                .put("notificationPermission", notification)
                .put("exactAlarmPermission", exactAlarm)
                .put("scheduleFresh", scheduleFresh)
                .put("alarmScheduleInstalled", installed)
                .put("audioReady", audioReady)
                .put("engineHealthy", healthy)
                .put("nativeReady", ready)
                .put("scheduleValidUntil", config == null ? JSONObject.NULL : config.scheduleValidUntil.toString())
                .put("lastError", store.lastError())
                .put("installationId", store.installationId())
                .put("credential", store.credential());
    }
}
