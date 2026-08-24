package de.donaumoschee.app.workers;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.os.Build;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;
import androidx.work.ForegroundInfo;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

import de.donaumoschee.app.R;
import de.donaumoschee.app.diagnostics.DeliveryDiagnostics;
import de.donaumoschee.app.prayer.DeliveryReceiptQueue;
import de.donaumoschee.app.storage.NativeStore;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.IOException;
import java.time.Instant;
import java.util.List;
import java.util.Map;

public final class DeliveryReceiptWorker extends Worker {
    private static final String TAG = "DanubePrayer";
    private static final String ORIGIN = "https://donaumoschee.vercel.app";
    private static final String FOREGROUND_CHANNEL = "delivery-receipt-sync-v1";
    private static final int FOREGROUND_NOTIFICATION_ID = 41003;

    public DeliveryReceiptWorker(@NonNull Context context, @NonNull WorkerParameters params) {
        super(context, params);
    }

    @NonNull
    @Override
    public ForegroundInfo getForegroundInfo() {
        Context context = getApplicationContext();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager manager = context.getSystemService(NotificationManager.class);
            if (manager != null) {
                NotificationChannel channel = new NotificationChannel(
                        FOREGROUND_CHANNEL,
                        context.getString(R.string.app_name),
                        NotificationManager.IMPORTANCE_LOW
                );
                channel.setShowBadge(false);
                manager.createNotificationChannel(channel);
            }
        }

        return new ForegroundInfo(
                FOREGROUND_NOTIFICATION_ID,
                new NotificationCompat.Builder(context, FOREGROUND_CHANNEL)
                        .setSmallIcon(R.drawable.ic_notification_icon)
                        .setContentTitle(context.getString(R.string.app_name))
                        .setCategory(NotificationCompat.CATEGORY_SERVICE)
                        .setPriority(NotificationCompat.PRIORITY_LOW)
                        .setOngoing(true)
                        .setSilent(true)
                        .build()
        );
    }

    @NonNull
    @Override
    public Result doWork() {
        NativeStore store = new NativeStore(getApplicationContext());
        int generation = store.accountGeneration();
        List<DeliveryReceiptQueue.Receipt> receipts = store.pendingDeliveryReceipts(generation);
        if (receipts.isEmpty()) return Result.success();

        String authorityId = store.authorityId();
        if (authorityId.isEmpty()) {
            Log.i(TAG, "delivery.receipts deferred=no-authority generation=" + generation);
            return Result.success();
        }

        for (DeliveryReceiptQueue.Receipt receipt : receipts) {
            if (store.accountGeneration() != generation) return Result.success();
            try {
                JSONObject body = new JSONObject()
                        .put("eventId", receipt.eventId)
                        .put("kind", receipt.kind)
                        .put("deliveredAt", Instant.ofEpochMilli(receipt.deliveredAtMs).toString())
                        .put("accountGeneration", receipt.accountGeneration);
                NativeHttp.post(ORIGIN + "/api/android/native-authority/receipt", body, Map.of(
                        "X-Native-Installation-Id", store.installationId(),
                        "X-Native-Authority-Id", authorityId,
                        "Authorization", "Native " + store.credential()
                ));
                if (store.accountGeneration() != generation) return Result.success();
                if (!store.acknowledgeDeliveryReceipt(receipt.eventId, generation)) {
                    DeliveryDiagnostics.emit("receipt_retry_failure", "ack-persist-failed");
                    store.markEngineError("delivery-receipt-ack-persist-failed");
                    return Result.retry();
                }
            } catch (IOException | JSONException | RuntimeException error) {
                DeliveryDiagnostics.emit("receipt_retry_failure", "transport-or-parse-failed");
                Log.w(TAG, "delivery.receipts retry=" + error.getClass().getSimpleName());
                return Result.retry();
            }
        }
        return Result.success();
    }
}
