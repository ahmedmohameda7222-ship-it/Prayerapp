package de.donaumoschee.app.bridge;

import android.content.Context;
import android.content.Intent;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;

import de.donaumoschee.app.NativePermissionActivity;
import de.donaumoschee.app.adhan.AdhanCatalog;
import de.donaumoschee.app.adhan.AdhanPlaybackService;
import de.donaumoschee.app.prayer.DeliveryRecord;
import de.donaumoschee.app.prayer.NativeStatus;
import de.donaumoschee.app.prayer.Prayer;
import de.donaumoschee.app.prayer.PrayerNotifications;
import de.donaumoschee.app.prayer.PrayerScheduler;
import de.donaumoschee.app.settings.NativeSettingsLauncher;
import de.donaumoschee.app.storage.NativeStore;
import de.donaumoschee.app.workers.NativeAuthorityClient;
import de.donaumoschee.app.workers.NativeWork;

import org.json.JSONException;
import org.json.JSONObject;

import java.time.Instant;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public final class BridgeHandler {
    private static final String TAG = "DanubePrayer";
    private static final ExecutorService AUTHORITY_EXECUTOR = Executors.newSingleThreadExecutor();
    public interface Sender { void send(String message); }

    private final Context context;
    private final Sender sender;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    public BridgeHandler(Context context, Sender sender) {
        this.context = context;
        this.sender = sender;
    }

    public void sendReady() { send("native.ready", status()); }
    public void sendStatus() { send("native.status", status()); }

    public void handle(String message) {
        try {
            BridgeProtocol.Envelope envelope = BridgeProtocol.parseInbound(message);
            switch (envelope.type) {
                case "web.configure": configure(envelope.payload); break;
                case "web.bridge.ready": sendStatus(); break;
                case "native.permissions.request": requestPermissions(envelope.payload); break;
                case "native.settings.open": openSettings(envelope.payload); break;
                case "native.status.request": sendStatus(); break;
                case "native.test.schedule": scheduleTest(envelope.payload); break;
                case "native.test.status": testStatus(envelope.payload); break;
                case "native.authority.enroll": enrollAuthority(envelope.payload); break;
                case "native.authority.bind": bindAuthority(envelope.payload); break;
                case "native.authority.clear": clearAuthority(); break;
                case "native.update.required": requireUpdate(); break;
                case "native.account.reset": resetAccount(); break;
                default: throw new JSONException("Unsupported message type");
            }
        } catch (JSONException | RuntimeException error) {
            Log.w(TAG, "bridge.message rejected=" + error.getClass().getSimpleName());
            sendError("invalid-message");
        }
    }

    private void configure(JSONObject payload) throws JSONException {
        NativeStore store = new NativeStore(context);
        store.saveConfig(payload, Instant.now());
        PrayerNotifications.createChannels(context);
        boolean installed = PrayerScheduler.reschedule(context);
        Log.i(TAG, "bridge.config synchronized installed=" + installed);
        NativeWork.initialize(context);
        NativeWork.cacheAudio(context);
        NativeWork.refreshNow(context);
        send("native.configure.result", new JSONObject().put("success", installed).put("status", status()));
    }

    private void requestPermissions(JSONObject payload) throws JSONException {
        String mode = payload.optString("mode", "both");
        if (!mode.equals("notification") && !mode.equals("exactAlarm") && !mode.equals("both")) throw new JSONException("Invalid permission mode");
        context.startActivity(new Intent(context, NativePermissionActivity.class)
                .putExtra(NativePermissionActivity.EXTRA_MODE, mode)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
    }

    private void openSettings(JSONObject payload) {
        String target = payload.optString("target", "");
        NativeSettingsLauncher.open(context, target);
    }

    private void scheduleTest(JSONObject payload) throws JSONException {
        String mode = payload.optString("mode", "");
        if (!mode.equals("adhan") && !mode.equals("reminder")) throw new JSONException("Invalid test mode");
        Prayer prayer;
        try { prayer = Prayer.fromKey(payload.optString("prayer", "")); }
        catch (IllegalArgumentException error) { throw new JSONException("Invalid prayer"); }
        String soundId = payload.optString("adhanSoundId", "");
        if (!AdhanCatalog.isCompatible(prayer, soundId)) throw new JSONException("Invalid sound");
        int delaySeconds = payload.optInt("delaySeconds", 10);
        String eventId = PrayerScheduler.scheduleTest(context, mode, prayer, soundId, delaySeconds);
        send("native.test.accepted", new JSONObject()
                .put("accepted", eventId != null)
                .put("eventId", eventId == null ? JSONObject.NULL : eventId)
                .put("mode", mode)
                .put("prayer", prayer.key)
                .put("delaySeconds", delaySeconds));
    }

    private void testStatus(JSONObject payload) throws JSONException {
        String eventId = payload.optString("eventId", "");
        if (!eventId.startsWith("test:")) throw new JSONException("Invalid test event id");
        NativeStore store = new NativeStore(context);
        DeliveryRecord record = store.deliveryRecord(eventId);
        NativeTestDeliveryStatus deliveryStatus = NativeTestDeliveryStatus.from(record);
        send("native.test.status", deliveryStatus.toJson());
    }

    private void enrollAuthority(JSONObject payload) throws JSONException {
        String accountAccessToken = payload.optString("accessToken", "");
        String browserId = payload.optString("browserId", "");
        String endpoint = payload.isNull("endpoint") ? null : payload.optString("endpoint", null);
        if (accountAccessToken.isBlank() || accountAccessToken.length() > 16_384) throw new JSONException("Invalid account token");
        if (browserId.isBlank() || browserId.length() > 128) throw new JSONException("Invalid browser id");
        if (endpoint != null && endpoint.length() > 4096) throw new JSONException("Invalid push endpoint");

        NativeStore store = new NativeStore(context);
        int generation = store.accountGeneration();
        AUTHORITY_EXECUTOR.execute(() -> {
            try {
                JSONObject enrolled = NativeAuthorityClient.enroll(
                        context,
                        accountAccessToken,
                        browserId,
                        endpoint,
                        generation
                );
                if (store.accountGeneration() != generation) {
                    sendAuthorityEnrollmentResult(false, null, "stale-generation");
                    return;
                }
                String authorityId = enrolled.optString("authorityId", "");
                if (!store.bindAuthorityIdIfGeneration(authorityId, generation)) {
                    sendAuthorityEnrollmentResult(false, null, "authority-bind-failed");
                    return;
                }
                sendAuthorityEnrollmentResult(true, authorityId, null);
            } catch (Exception error) {
                Log.w(TAG, "native.authority enrollment failed=" + error.getClass().getSimpleName());
                sendAuthorityEnrollmentResult(false, null, "enrollment-failed");
            }
        });
    }

    private void sendAuthorityEnrollmentResult(boolean success, String authorityId, String code) {
        mainHandler.post(() -> {
            try {
                JSONObject payload = new JSONObject()
                        .put("success", success)
                        .put("authorityId", authorityId == null ? JSONObject.NULL : authorityId)
                        .put("code", code == null ? JSONObject.NULL : code)
                        .put("status", status());
                send("native.authority.enroll.result", payload);
            } catch (JSONException ignored) { }
        });
    }

    private void bindAuthority(JSONObject payload) throws JSONException {
        String authorityId = payload.optString("authorityId", "");
        NativeStore store = new NativeStore(context);
        if (!store.bindAuthorityId(authorityId)) throw new JSONException("Invalid authority id");
        send("native.authority.result", new JSONObject().put("success", true).put("status", status()));
    }

    private void clearAuthority() throws JSONException {
        NativeStore store = new NativeStore(context);
        if (!store.clearAuthorityId()) throw new JSONException("Could not clear authority id");
        send("native.authority.result", new JSONObject().put("success", true).put("status", status()));
    }

    private void requireUpdate() throws JSONException {
        NativeWork.cancelPrayerRefresh(context);
        NativeStore store = new NativeStore(context);
        store.resetAccountStateAndQueueAuthorityRevocation();
        PrayerScheduler.cancelAll(context);
        store.setScheduleInstalled(false);
        store.markEngineError("required-update");
        NativeWork.flushAuthorityRevocation(context);
        context.stopService(new Intent(context, AdhanPlaybackService.class));
        send("native.update.required.result", new JSONObject().put("success", true).put("status", status()));
    }

    private void resetAccount() throws JSONException {
        NativeWork.cancelPrayerRefresh(context);
        NativeStore store = new NativeStore(context);
        int generation = store.resetAccountStateAndQueueAuthorityRevocation();
        PrayerScheduler.cancelAll(context);
        store.clearAccountState();
        NativeWork.flushAuthorityRevocation(context);
        context.stopService(new Intent(context, AdhanPlaybackService.class));
        Log.i(TAG, "bridge.account reset generation=" + generation);
        send("native.account.reset.result", new JSONObject().put("success", true).put("status", status()));
    }

    private JSONObject status() {
        try { return NativeStatus.payload(context); }
        catch (JSONException error) { return new JSONObject(); }
    }

    private void sendError(String code) {
        try { send("native.error", new JSONObject().put("code", code)); }
        catch (JSONException ignored) { }
    }

    private void send(String type, JSONObject payload) {
        try { sender.send(BridgeProtocol.outbound(type, payload)); }
        catch (JSONException ignored) { }
    }
}
