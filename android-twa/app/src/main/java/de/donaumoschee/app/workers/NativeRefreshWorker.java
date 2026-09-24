package de.donaumoschee.app.workers;

import android.content.Context;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

import de.donaumoschee.app.diagnostics.DeliveryDiagnostics;
import de.donaumoschee.app.prayer.NativeStatus;
import de.donaumoschee.app.prayer.PrayerScheduler;
import de.donaumoschee.app.storage.NativeStore;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.IOException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
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
        String configSnapshot = store.rawConfigSnapshot();
        if (configSnapshot == null) {
            Log.i(TAG, "schedule.refresh skipped=no-config generation=" + generation);
            return Result.success();
        }
        JSONObject config;
        try {
            config = new JSONObject(configSnapshot);
        } catch (JSONException error) {
            Log.w(TAG, "schedule.refresh skipped=invalid-config generation=" + generation);
            return Result.retry();
        }

        PrayerScheduler.ConfigInstallResult refreshResult =
                refreshSchedule(store, config, configSnapshot, generation);
        boolean scheduleRefreshed = refreshResult != null && refreshResult.configSaved;
        if (store.accountGeneration() != generation) {
            Log.i(TAG, "schedule.refresh stale-before-reschedule generation=" + generation);
            return Result.success();
        }
        if (refreshResult != null && refreshResult.staleConfigSnapshot) {
            scheduleRefreshed = PrayerScheduler.reschedule(getApplicationContext(), generation);
            if (!scheduleRefreshed) {
                DeliveryDiagnostics.emit("schedule_refresh_failure", "stale-config-reschedule-failed");
            }
        } else if (!scheduleRefreshed) {
            DeliveryDiagnostics.emit("schedule_refresh_failure", "refresh-failed");
            PrayerScheduler.reschedule(getApplicationContext(), generation);
        }

        Log.i(TAG, "schedule.refresh success=" + scheduleRefreshed + " generation=" + generation);
        if (store.accountGeneration() != generation) {
            Log.i(TAG, "schedule.refresh stale-after-reschedule generation=" + generation);
            return Result.success();
        }

        sendHeartbeat(store, scheduleRefreshed, generation);
        return scheduleRefreshed ? Result.success() : Result.retry();
    }

    private PrayerScheduler.ConfigInstallResult refreshSchedule(
            NativeStore store,
            JSONObject config,
            String configSnapshot,
            int generation
    ) {
        try {
            String today = LocalDate.now(ZoneOffset.UTC).minusDays(1).toString();
            JSONObject response = NativeHttp.get(ORIGIN + "/api/android/prayer-schedule?from=" + today + "&days=31");
            if (store.accountGeneration() != generation) return null;
            if (response.optInt("schemaVersion", -1) != 1) return null;
            String timeZone = response.optString("timeZone", "").trim();
            if (timeZone.isEmpty() || timeZone.length() > 128) return null;
            JSONArray rows = response.getJSONArray("rows");
            Instant validUntil = Instant.parse(response.getString("scheduleValidUntil"));
            config.put("timeZone", timeZone);
            config.put("rows", rows);
            config.put("scheduleValidUntil", validUntil.toString());
            return PrayerScheduler.replaceConfigAndReschedule(
                    getApplicationContext(),
                    config,
                    Instant.now(),
                    generation,
                    configSnapshot
            );
        } catch (IOException | JSONException | RuntimeException error) {
            return null;
        }
    }

    private void sendHeartbeat(NativeStore store, boolean syncSucceeded, int generation) {
        if (store.accountGeneration() != generation || store.rawConfig() == null) return;
        try {
            JSONObject status = NativeStatus.payload(getApplicationContext());
            if (store.accountGeneration() != generation) return;
            Object scheduleValidUntil = status.opt("scheduleValidUntil");
            JSONObject body = new JSONObject()
                    .put("receiptV2", true)
                    .put("accountGeneration", generation)
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
