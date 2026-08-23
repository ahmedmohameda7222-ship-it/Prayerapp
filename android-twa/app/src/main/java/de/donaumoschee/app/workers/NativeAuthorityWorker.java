package de.donaumoschee.app.workers;

import android.content.Context;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

import de.donaumoschee.app.storage.NativeStore;

import org.json.JSONException;

import java.io.IOException;
import java.util.Map;

public final class NativeAuthorityWorker extends Worker {
    private static final String TAG = "DanubePrayer";
    private static final String ORIGIN = "https://donaumoschee.vercel.app";

    public NativeAuthorityWorker(@NonNull Context context, @NonNull WorkerParameters params) {
        super(context, params);
    }

    @NonNull
    @Override
    public Result doWork() {
        NativeStore store = new NativeStore(getApplicationContext());
        NativeStore.PendingAuthorityRevocation pending = store.pendingAuthorityRevocation();
        if (pending == null) return Result.success();
        if (store.accountGeneration() != pending.targetGeneration) {
            Log.i(TAG, "native.authority revocation deferred=stale-generation target=" + pending.targetGeneration);
            return Result.success();
        }
        try {
            NativeHttp.delete(ORIGIN + "/api/android/native-authority/heartbeat", Map.of(
                    "X-Native-Installation-Id", store.installationId(),
                    "X-Native-Authority-Id", pending.authorityId,
                    "Authorization", "Native " + store.credential()
            ));
            if (store.accountGeneration() != pending.targetGeneration) return Result.success();
            if (!store.acknowledgeAuthorityRevocation(pending.authorityId, pending.targetGeneration)) return Result.retry();
            Log.i(TAG, "native.authority revoked generation=" + pending.targetGeneration);
            return Result.success();
        } catch (IOException | JSONException | RuntimeException error) {
            Log.w(TAG, "native.authority revocation retry=" + error.getClass().getSimpleName());
            return Result.retry();
        }
    }
}
