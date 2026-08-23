package de.donaumoschee.app.prayer;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
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
    public static final String EXTRA_ACCOUNT_GENERATION = "account-generation";
    public static final String EXTRA_DUE_AT_MS = "due-at-ms";

    private PrayerScheduler() {}

    public static boolean reschedule(Context context) {
        NativeStore store = new NativeStore(context);
        int generation = store.accountGeneration();
        if (!cancelStored(context, store, generation)) return false;
        return scheduleCurrentGeneration(context, store, generation);
    }

    public static boolean reschedule(Context context, int expectedGeneration) {
        NativeStore store = new NativeStore(context);
        if (store.accountGeneration() != expectedGeneration) return false;
        if (!cancelStored(context, store, expectedGeneration)) return false;
        if (store.accountGeneration() != expectedGeneration) return false;
        return scheduleCurrentGeneration(context, store, expectedGeneration);
    }

    private static boolean scheduleCurrentGeneration(Context context, NativeStore store, int generation) {
        if (store.accountGeneration() != generation) return false;
        NativeConfig config = store.loadConfig(Instant.now());
        if (config == null || !NativeStatus.hasExactAlarmPermission(context)) {
            Log.w(TAG, "alarm.schedule skipped config=" + (config != null) + " exact=" + NativeStatus.hasExactAlarmPermission(context));
            store.markScheduleFailureIfGeneration("alarm-schedule-unavailable", generation);
            return false;
        }

        Set<String> installedByThisCall = new HashSet<>();
        try {
            List<AlarmEvent> events = AlarmPlanner.plan(config, Instant.now());
            AlarmManager manager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            for (AlarmEvent event : events) {
                if (store.accountGeneration() != generation) {
                    cancelRequests(context, store, installedByThisCall);
                    return false;
                }
                if (!store.markDeliveryScheduled(event.eventId, event.kind.name(), event.dueAt.toEpochMilli())) {
                    cancelRequests(context, store, installedByThisCall);
                    store.markScheduleFailureIfGeneration("delivery-state-unavailable", generation);
                    return false;
                }
                installedByThisCall.add(encodeScheduledRequest(generation, event));
                PendingIntent operation = operation(context, event, generation);
                manager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, event.dueAt.toEpochMilli(), operation);
            }
            if (
                    store.accountGeneration() != generation
                    || !store.addScheduledRequestCodesIfGeneration(installedByThisCall, generation)
                    || !store.markScheduleInstalledIfGeneration(generation)
            ) {
                cancelRequests(context, store, installedByThisCall);
                store.markScheduleFailureIfGeneration("alarm-schedule-finalize-failed", generation);
                return false;
            }
            Log.i(TAG, "alarm.schedule installed count=" + events.size() + " generation=" + generation);
            return true;
        } catch (RuntimeException error) {
            cancelRequests(context, store, installedByThisCall);
            Log.e(TAG, "alarm.schedule failed=" + error.getClass().getSimpleName());
            store.markScheduleFailureIfGeneration("alarm-schedule-failed", generation);
            return false;
        }
    }

    public static boolean scheduleTest(Context context, String mode, Prayer prayer, String soundId, int delaySeconds) {
        if (!NativeStatus.hasExactAlarmPermission(context) || delaySeconds < 1 || delaySeconds > 60) return false;
        NativeStore store = new NativeStore(context);
        int generation = store.accountGeneration();
        AlarmEvent.Kind kind = "adhan".equals(mode) ? AlarmEvent.Kind.ADHAN : AlarmEvent.Kind.REMINDER;
        int leadMinutes = kind == AlarmEvent.Kind.REMINDER ? 15 : 0;
        AlarmEvent event = new AlarmEvent(
                "test:" + UUID.randomUUID(), prayer, kind, Instant.now().plusSeconds(delaySeconds), leadMinutes, soundId
        );
        if (!store.markDeliveryScheduled(event.eventId, event.kind.name(), event.dueAt.toEpochMilli())) return false;
        Set<String> requestCodes = Set.of(encodeScheduledRequest(generation, event));
        try {
            AlarmManager manager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            PendingIntent operation = operation(context, event, generation);
            manager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, event.dueAt.toEpochMilli(), operation);
        } catch (RuntimeException error) {
            cancelRequests(context, store, requestCodes);
            Log.e(TAG, "alarm.test schedule-failed=" + error.getClass().getSimpleName());
            return false;
        }
        if (!store.addScheduledRequestCodesIfGeneration(requestCodes, generation)) {
            cancelRequests(context, store, requestCodes);
            return false;
        }
        Log.i(TAG, "alarm.test scheduled kind=" + kind + " prayer=" + prayer.key + " delaySeconds=" + delaySeconds + " generation=" + generation);
        return true;
    }

    public static void cancelAll(Context context) {
        NativeStore store = new NativeStore(context);
        cancelStored(context, store, null);
        store.setScheduleInstalled(false);
    }

    private static PendingIntent operation(Context context, AlarmEvent event, int generation) {
        Intent intent = new Intent(context, PrayerAlarmReceiver.class)
                .setAction("de.donaumoschee.app.PRAYER_EVENT")
                .setData(eventUri(generation, event.eventId))
                .putExtra(EXTRA_EVENT_ID, event.eventId)
                .putExtra(EXTRA_KIND, event.kind.name())
                .putExtra(EXTRA_PRAYER, event.prayer.key)
                .putExtra(EXTRA_LEAD_MINUTES, event.leadMinutes)
                .putExtra(EXTRA_ADHAN_SOUND_ID, event.adhanSoundId)
                .putExtra(EXTRA_ACCOUNT_GENERATION, generation)
                .putExtra(EXTRA_DUE_AT_MS, event.dueAt.toEpochMilli());
        return PendingIntent.getBroadcast(context, event.requestCode(), intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static Uri eventUri(int generation, String eventId) {
        return Uri.parse("danube://prayer-event/" + generation + "/" + Uri.encode(eventId));
    }

    private static String encodeScheduledRequest(int generation, AlarmEvent event) {
        return generation + "|" + event.requestCode() + "|" + event.eventId;
    }

    private static boolean cancelStored(Context context, NativeStore store, Integer generationFilter) {
        Set<String> stored = store.scheduledRequestCodes();
        Set<String> retained = new HashSet<>();
        int cancelled = 0;
        boolean deliveryStateUpdated = true;
        for (String raw : stored) {
            ScheduledRequest request = parseScheduledRequest(raw);
            if (request == null) {
                if (generationFilter != null) retained.add(raw);
                continue;
            }
            boolean shouldCancel = generationFilter == null || request.legacy || request.generation == generationFilter;
            if (shouldCancel) {
                boolean cancelledCleanly = cancelRequest(context, store, request);
                if (!cancelledCleanly) {
                    retained.add(raw);
                    deliveryStateUpdated = false;
                }
                cancelled += 1;
            } else {
                retained.add(raw);
            }
        }
        if (cancelled > 0) Log.i(TAG, "alarm.cancel count=" + cancelled + " generation=" + generationFilter);
        boolean metadataUpdated;
        if (generationFilter == null) {
            store.setScheduledRequestCodes(retained);
            metadataUpdated = true;
        } else {
            metadataUpdated = store.setScheduledRequestCodesIfGeneration(retained, generationFilter);
        }
        if (!deliveryStateUpdated) store.markEngineError("delivery-cancellation-persist-failed");
        return deliveryStateUpdated && metadataUpdated;
    }

    private static boolean cancelRequests(Context context, NativeStore store, Set<String> requests) {
        boolean success = true;
        for (String raw : requests) {
            ScheduledRequest request = parseScheduledRequest(raw);
            if (request != null && !cancelRequest(context, store, request)) success = false;
        }
        if (!success) store.markEngineError("delivery-cancellation-persist-failed");
        return success;
    }

    private static boolean cancelRequest(Context context, NativeStore store, ScheduledRequest request) {
        AlarmManager manager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        Uri data = request.legacy
                ? Uri.parse("danube://prayer-event/" + Uri.encode(request.eventId))
                : eventUri(request.generation, request.eventId);
        Intent intent = new Intent(context, PrayerAlarmReceiver.class)
                .setAction("de.donaumoschee.app.PRAYER_EVENT")
                .setData(data);
        PendingIntent existing = PendingIntent.getBroadcast(
                context,
                request.requestCode,
                intent,
                PendingIntent.FLAG_NO_CREATE | PendingIntent.FLAG_IMMUTABLE
        );
        if (existing != null) {
            manager.cancel(existing);
            existing.cancel();
        }
        return store.cancelDeliveryScheduled(request.eventId, "alarm-cancelled", System.currentTimeMillis());
    }

    private static ScheduledRequest parseScheduledRequest(String raw) {
        try {
            String[] parts = raw.split("\\|", 3);
            if (parts.length == 2) {
                return new ScheduledRequest(-1, Integer.parseInt(parts[0]), parts[1], true);
            }
            if (parts.length == 3) {
                return new ScheduledRequest(Integer.parseInt(parts[0]), Integer.parseInt(parts[1]), parts[2], false);
            }
        } catch (NumberFormatException ignored) {
            // Ignore corrupt local metadata.
        }
        return null;
    }

    private static final class ScheduledRequest {
        final int generation;
        final int requestCode;
        final String eventId;
        final boolean legacy;

        ScheduledRequest(int generation, int requestCode, String eventId, boolean legacy) {
            this.generation = generation;
            this.requestCode = requestCode;
            this.eventId = eventId;
            this.legacy = legacy;
        }
    }
}
