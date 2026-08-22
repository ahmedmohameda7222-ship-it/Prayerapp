package de.donaumoschee.app.bridge;

import android.content.Context;
import android.content.Intent;
import android.util.Log;

import de.donaumoschee.app.NativePermissionActivity;
import de.donaumoschee.app.adhan.AdhanCatalog;
import de.donaumoschee.app.adhan.AdhanPlaybackService;
import de.donaumoschee.app.prayer.NativeStatus;
import de.donaumoschee.app.prayer.Prayer;
import de.donaumoschee.app.prayer.PrayerScheduler;
import de.donaumoschee.app.storage.NativeStore;
import de.donaumoschee.app.workers.NativeWork;

import org.json.JSONException;
import org.json.JSONObject;

import java.time.Instant;

public final class BridgeHandler {
    private static final String TAG = "DanubePrayer";
    public interface Sender { void send(String message); }

    private final Context context;
    private final Sender sender;

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
                case "native.permissions.request": requestPermissions(envelope.payload); break;
                case "native.status.request": sendStatus(); break;
                case "native.test.schedule": scheduleTest(envelope.payload); break;
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

    private void scheduleTest(JSONObject payload) throws JSONException {
        String mode = payload.optString("mode", "");
        if (!mode.equals("adhan") && !mode.equals("reminder")) throw new JSONException("Invalid test mode");
        Prayer prayer;
        try { prayer = Prayer.fromKey(payload.optString("prayer", "")); }
        catch (IllegalArgumentException error) { throw new JSONException("Invalid prayer"); }
        String soundId = payload.optString("adhanSoundId", "");
        if (!AdhanCatalog.isCompatible(prayer, soundId)) throw new JSONException("Invalid sound");
        int delaySeconds = payload.optInt("delaySeconds", 10);
        boolean scheduled = PrayerScheduler.scheduleTest(context, mode, prayer, soundId, delaySeconds);
        send("native.test.result", new JSONObject()
                .put("success", scheduled).put("mode", mode).put("prayer", prayer.key).put("delaySeconds", delaySeconds));
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
        store.advanceAccountGeneration();
        PrayerScheduler.cancelAll(context);
        store.setScheduleInstalled(false);
        store.markEngineError("required-update");
        context.stopService(new Intent(context, AdhanPlaybackService.class));
        send("native.update.required.result", new JSONObject().put("success", true).put("status", status()));
    }

    private void resetAccount() throws JSONException {
        NativeWork.cancelPrayerRefresh(context);
        NativeStore store = new NativeStore(context);
        int generation = store.resetAccountState();
        PrayerScheduler.cancelAll(context);
        store.clearAccountState();
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
