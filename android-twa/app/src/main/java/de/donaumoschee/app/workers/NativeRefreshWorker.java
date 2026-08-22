package de.donaumoschee.app.workers;

import android.content.Context;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

import de.donaumoschee.app.prayer.NativeStatus;
import de.donaumoschee.app.prayer.PrayerScheduler;
import de.donaumoschee.app.storage.NativeStore;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.IOException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Map;

public final class NativeRefreshWorker extends Worker {
    private static final String TAG = "DanubePrayer";
    private static final String ORIGIN = "https://donaumoschee.vercel.app";

    public NativeRefreshWorker(@NonNull Context context, @NonNull WorkerParameters params) {
        super(context, params);
    }

    @NonNull
    @Override
    public Result doWork() {
        NativeStore store = new NativeStore(getApplicationContext());
        int generation = store.accountGeneration();
        JSONObject config = store.rawConfig();
        if (config == null) {
            Log.i(TAG, "schedule.refresh skipped=no-config generation=" + generation);
            return Result.success();
        }

        boolean scheduleRefreshed = refreshSchedule(store, config, generation);
        if (store.accountGeneration() != generation) {
            Log.i(TAG, "schedule.refresh stale-before-reschedule generation=" + generation);
            return Result.success();
        }

        Log.i(TAG, "schedule.refresh success=" + scheduleRefreshed + " generation=" + generation);
        PrayerScheduler.reschedule(getApplicationContext(), generation);
        if (store.accountGeneration() != generation) {
            Log.i(TAG, "schedule.refresh stale-after-reschedule generation=" + generation);
            return Result.success();
        }

        sendHeartbeat(store, scheduleRefreshed, generation);
        return scheduleRefreshed ? Result.success() : Result.retry();
    }

    private boolean refreshSchedule(NativeStore store, JSONObject config, int generation) {
        try {
            String today = LocalDate.now(ZoneId.of("Europe/Berlin")).toString();
            JSONObject response = NativeHttp.get(ORIGIN + "/api/android/prayer-schedule?from=" + today + "&days=31");
            if (store.accountGeneration() != generation) return false;
            if (response.optInt("schemaVersion", -1) != 1 || !"Europe/Berlin".equals(response.optString("timeZone"))) return false;
            JSONArray rows = response.getJSONArray("rows");
            String through = response.getString("through");
            Instant validUntil = LocalDate.parse(through).plusDays(1).atStartOfDay(ZoneId.of("Europe/Berlin")).toInstant();
            config.put("rows", rows);
            config.put("scheduleValidUntil", validUntil.toString());
            return store.saveConfigIfGeneration(config, Instant.now(), generation);
        } catch (IOException | JSONException | RuntimeException error) {
            return false;
        }
    }

    private void sendHeartbeat(NativeStore store, boolean syncSucceeded, int generation) {
        if (store.accountGeneration() != generation || store.rawConfig() == null) return;
        try {
            JSONObject status = NativeStatus.payload(getApplicationContext());
            if (store.accountGeneration() != generation) return;
            Object scheduleValidUntil = status.opt("scheduleValidUntil");
            JSONObject body = new JSONObject()
                    .put("notificationPermission", status.getBoolean("notificationPermission"))
                    .put("notificationDeliveryEnabled", status.getBoolean("notificationDeliveryEnabled"))
                    .put("reminderChannelEnabled", status.getBoolean("reminderChannelEnabled"))
                    .put("adhanChannelEnabled", status.getBoolean("adhanChannelEnabled"))
                    .put("exactAlarmPermission", status.getBoolean("exactAlarmPermission"))
                    .put("scheduleFresh", syncSucceeded && status.getBoolean("scheduleFresh"))
                    .put("alarmScheduleInstalled", status.getBoolean("alarmScheduleInstalled"))
                    .put("audioReady", status.getBoolean("audioReady"))
                    .put("engineHealthy", status.getBoolean("engineHealthy"))
                    .put("scheduleValidUntil", scheduleValidUntil instanceof String ? scheduleValidUntil : Instant.EPOCH.toString());
            if (store.accountGeneration() != generation) return;
            String authorityId = store.authorityId();
            if (authorityId.isEmpty()) {
                Log.i(TAG, "native.heartbeat skipped=no-authority generation=" + generation);
                return;
            }
            NativeHttp.post(ORIGIN + "/api/android/native-authority/heartbeat", body, Map.of(
                    "X-Native-Installation-Id", store.installationId(),
                    "X-Native-Authority-Id", authorityId,
                    "Authorization", "Native " + store.credential()
            ));
        } catch (IOException | JSONException ignored) {
            // Lease expiry intentionally fails open when the server cannot be reached.
            Log.w(TAG, "native.heartbeat failed-open=" + ignored.getClass().getSimpleName());
        }
    }
}
