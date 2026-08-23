package de.donaumoschee.app.workers;

import android.content.Context;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

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

    public DeliveryReceiptWorker(@NonNull Context context, @NonNull WorkerParameters params) {
        super(context, params);
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
                    store.markEngineError("delivery-receipt-ack-persist-failed");
                    return Result.retry();
                }
            } catch (IOException | JSONException | RuntimeException error) {
                Log.w(TAG, "delivery.receipts retry=" + error.getClass().getSimpleName());
                return Result.retry();
            }
        }
        return Result.success();
    }
}
