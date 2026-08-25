package de.donaumoschee.app.prayer;

import android.Manifest;
import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.PowerManager;

import androidx.core.content.ContextCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.annotation.RequiresApi;

import de.donaumoschee.app.storage.NativeStore;
import de.donaumoschee.app.adhan.AudioCache;
import de.donaumoschee.app.adhan.AdhanPlaybackService;

import org.json.JSONException;
import org.json.JSONArray;
import org.json.JSONObject;

import java.time.Instant;

public final class NativeStatus {
    private NativeStatus() {}

    public static boolean hasNotificationPermission(Context context) {
        return Build.VERSION.SDK_INT < 33 || ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED;
    }

    public static NotificationCapabilities notificationCapabilities(Context context) {
        boolean permission = hasNotificationPermission(context);
        boolean appEnabled = NotificationManagerCompat.from(context).areNotificationsEnabled();
        int reminderImportance = 3;
        int adhanImportance = 3;
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationManager manager = context.getSystemService(NotificationManager.class);
            reminderImportance = channelImportance(manager, PrayerNotifications.REMINDER_CHANNEL);
            adhanImportance = channelImportance(manager, AdhanPlaybackService.CHANNEL);
        }
        return NotificationCapabilities.evaluate(
                Build.VERSION.SDK_INT,
                permission,
                appEnabled,
                reminderImportance,
                adhanImportance
        );
    }

    @RequiresApi(26)
    private static int channelImportance(NotificationManager manager, String channelId) {
        if (manager == null) return 0;
        NotificationChannel channel = manager.getNotificationChannel(channelId);
        return channel == null ? -1000 : channel.getImportance();
    }

    public static boolean hasExactAlarmPermission(Context context) {
        AlarmManager manager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        return Build.VERSION.SDK_INT < 31 || manager.canScheduleExactAlarms();
    }

    public static BatteryOptimizationDiagnostics batteryOptimizationDiagnostics(Context context) {
        if (Build.VERSION.SDK_INT < 23) {
            return BatteryOptimizationDiagnostics.evaluate(Build.VERSION.SDK_INT, false);
        }
        PowerManager manager = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
        boolean exempt = manager != null && manager.isIgnoringBatteryOptimizations(context.getPackageName());
        return BatteryOptimizationDiagnostics.evaluate(Build.VERSION.SDK_INT, exempt);
    }

    public static JSONObject payload(Context context) throws JSONException {
        Instant now = Instant.now();
        PackageInfo packageInfo;
        try {
            packageInfo = context.getPackageManager().getPackageInfo(context.getPackageName(), 0);
        } catch (PackageManager.NameNotFoundException error) {
            throw new JSONException("Installed package metadata is unavailable");
        }
        long versionCode = Build.VERSION.SDK_INT >= 28 ? packageInfo.getLongVersionCode() : packageInfo.versionCode;
        String versionName = packageInfo.versionName == null ? "" : packageInfo.versionName;
        NativeStore store = new NativeStore(context);
        NativeConfig config = store.loadConfig(now);
        NotificationCapabilities notifications = notificationCapabilities(context);
        BatteryOptimizationDiagnostics battery = batteryOptimizationDiagnostics(context);
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
        boolean ready = NativeReadiness.isReady(
                notifications.notificationPermission(),
                notifications.notificationDeliveryEnabled(),
                notifications.reminderChannelEnabled(),
                notifications.adhanChannelEnabled(),
                exactAlarm,
                scheduleFresh,
                installed,
                audioReady,
                healthy
        );
        return new JSONObject()
                .put("native", true)
                .put("packageId", context.getPackageName())
                .put("versionCode", versionCode)
                .put("versionName", versionName)
                .put("capabilities", new JSONArray()
                        .put("authority-generation-v1")
                        .put("delivery-receipt-v2")
                        .put("native-secret-private-v2")
                        .put("permission-diagnostics-v2"))
                .put("receiptV2", true)
                .put("accountGeneration", store.accountGeneration())
                .put("notificationPermission", notifications.notificationPermission())
                .put("appNotificationsEnabled", notifications.appNotificationsEnabled())
                .put("notificationDeliveryEnabled", notifications.notificationDeliveryEnabled())
                .put("reminderChannelEnabled", notifications.reminderChannelEnabled())
                .put("adhanChannelEnabled", notifications.adhanChannelEnabled())
                .put("exactAlarmPermission", exactAlarm)
                .put("batteryOptimizationRelevant", battery.relevant())
                .put("batteryOptimizationExempt", battery.exempt())
                .put("scheduleFresh", scheduleFresh)
                .put("alarmScheduleInstalled", installed)
                .put("audioReady", audioReady)
                .put("engineHealthy", healthy)
                .put("nativeReady", ready)
                .put("scheduleValidUntil", config == null ? JSONObject.NULL : config.scheduleValidUntil.toString())
                .put("lastError", store.lastError())
                .put("installationId", store.installationId())
                .put("authorityId", store.authorityId());
    }
}
