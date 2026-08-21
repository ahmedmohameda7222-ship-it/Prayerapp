package de.donaumoschee.app.prayer;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.util.Log;

import de.donaumoschee.app.storage.NativeStore;

import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

public final class PrayerScheduler {
    private static final String TAG = "DanubePrayer";
    public static final String EXTRA_EVENT_ID = "event-id";
    public static final String EXTRA_KIND = "kind";
    public static final String EXTRA_PRAYER = "prayer";
    public static final String EXTRA_LEAD_MINUTES = "lead-minutes";
    public static final String EXTRA_ADHAN_SOUND_ID = "adhan-sound-id";

    private PrayerScheduler() {}

    public static boolean reschedule(Context context) {
        NativeStore store = new NativeStore(context);
        cancelStored(context, store);
        NativeConfig config = store.loadConfig(Instant.now());
        if (config == null || !NativeStatus.hasExactAlarmPermission(context)) {
            Log.w(TAG, "alarm.schedule skipped config=" + (config != null) + " exact=" + NativeStatus.hasExactAlarmPermission(context));
            store.setScheduleInstalled(false);
            return false;
        }
        try {
            List<AlarmEvent> events = AlarmPlanner.plan(config, Instant.now());
            AlarmManager manager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            Set<String> requestCodes = new HashSet<>();
            for (AlarmEvent event : events) {
                PendingIntent operation = operation(context, event);
                manager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, event.dueAt.toEpochMilli(), operation);
                requestCodes.add(event.requestCode() + "|" + event.eventId);
            }
            store.setScheduledRequestCodes(requestCodes);
            store.setScheduleInstalled(true);
            store.markEngineHealthy();
            Log.i(TAG, "alarm.schedule installed count=" + events.size());
            return true;
        } catch (RuntimeException error) {
            Log.e(TAG, "alarm.schedule failed=" + error.getClass().getSimpleName());
            store.markEngineError("alarm-schedule-failed");
            store.setScheduleInstalled(false);
            return false;
        }
    }

    public static boolean scheduleTest(Context context, String mode, Prayer prayer, String soundId, int delaySeconds) {
        if (!NativeStatus.hasExactAlarmPermission(context) || delaySeconds < 1 || delaySeconds > 60) return false;
        AlarmEvent.Kind kind = "adhan".equals(mode) ? AlarmEvent.Kind.ADHAN : AlarmEvent.Kind.REMINDER;
        int leadMinutes = kind == AlarmEvent.Kind.REMINDER ? 15 : 0;
        AlarmEvent event = new AlarmEvent(
                "test:" + UUID.randomUUID(), prayer, kind, Instant.now().plusSeconds(delaySeconds), leadMinutes, soundId
        );
        AlarmManager manager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        manager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, event.dueAt.toEpochMilli(), operation(context, event));
        Log.i(TAG, "alarm.test scheduled kind=" + kind + " prayer=" + prayer.key + " delaySeconds=" + delaySeconds);
        return true;
    }

    private static PendingIntent operation(Context context, AlarmEvent event) {
        Intent intent = new Intent(context, PrayerAlarmReceiver.class)
                .setAction("de.donaumoschee.app.PRAYER_EVENT")
                .setData(Uri.parse("danube://prayer-event/" + Uri.encode(event.eventId)))
                .putExtra(EXTRA_EVENT_ID, event.eventId)
                .putExtra(EXTRA_KIND, event.kind.name())
                .putExtra(EXTRA_PRAYER, event.prayer.key)
                .putExtra(EXTRA_LEAD_MINUTES, event.leadMinutes)
                .putExtra(EXTRA_ADHAN_SOUND_ID, event.adhanSoundId);
        return PendingIntent.getBroadcast(context, event.requestCode(), intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static void cancelStored(Context context, NativeStore store) {
        AlarmManager manager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        Set<String> stored = store.scheduledRequestCodes();
        for (String raw : stored) {
            try {
                String[] parts = raw.split("\\|", 2);
                if (parts.length != 2) continue;
                int requestCode = Integer.parseInt(parts[0]);
                Intent intent = new Intent(context, PrayerAlarmReceiver.class)
                        .setAction("de.donaumoschee.app.PRAYER_EVENT")
                        .setData(Uri.parse("danube://prayer-event/" + Uri.encode(parts[1])));
                PendingIntent existing = PendingIntent.getBroadcast(context, requestCode, intent, PendingIntent.FLAG_NO_CREATE | PendingIntent.FLAG_IMMUTABLE);
                if (existing != null) {
                    manager.cancel(existing);
                    existing.cancel();
                }
            } catch (NumberFormatException ignored) {
                // Ignore stale local metadata.
            }
        }
        if (!stored.isEmpty()) Log.i(TAG, "alarm.cancel staleCount=" + stored.size());
        store.setScheduledRequestCodes(Set.of());
    }
}
