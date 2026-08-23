package de.donaumoschee.app.workers;

import android.content.Context;

import androidx.work.Constraints;
import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.ExistingWorkPolicy;
import androidx.work.NetworkType;
import androidx.work.OneTimeWorkRequest;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;

import java.util.concurrent.TimeUnit;

public final class NativeWork {
    private static final String PERIODIC_REFRESH = "native-prayer-refresh-v1";
    private static final String IMMEDIATE_REFRESH = "native-prayer-refresh-now-v1";
    private static final String AUDIO_CACHE = "native-prayer-audio-cache-v1";
    private static final String RECEIPT_FLUSH = "native-prayer-receipt-flush-v2";
    private static final String AUTHORITY_REVOCATION = "native-authority-revocation-v2";

    private NativeWork() {}

    public static void initialize(Context context) {
        Constraints network = new Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build();
        PeriodicWorkRequest periodic = new PeriodicWorkRequest.Builder(NativeRefreshWorker.class, 6, TimeUnit.HOURS)
                .setConstraints(network)
                .build();
        WorkManager.getInstance(context).enqueueUniquePeriodicWork(PERIODIC_REFRESH, ExistingPeriodicWorkPolicy.UPDATE, periodic);
    }

    public static void refreshNow(Context context) {
        Constraints network = new Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build();
        WorkManager.getInstance(context).enqueueUniqueWork(
                IMMEDIATE_REFRESH,
                ExistingWorkPolicy.KEEP,
                new OneTimeWorkRequest.Builder(NativeRefreshWorker.class).setConstraints(network).build()
        );
    }

    public static void flushReceipts(Context context) {
        Constraints network = new Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build();
        WorkManager.getInstance(context).enqueueUniqueWork(
                RECEIPT_FLUSH,
                ExistingWorkPolicy.KEEP,
                new OneTimeWorkRequest.Builder(DeliveryReceiptWorker.class).setConstraints(network).build()
        );
    }

    public static void flushAuthorityRevocation(Context context) {
        Constraints network = new Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build();
        WorkManager.getInstance(context).enqueueUniqueWork(
                AUTHORITY_REVOCATION,
                ExistingWorkPolicy.REPLACE,
                new OneTimeWorkRequest.Builder(NativeAuthorityWorker.class).setConstraints(network).build()
        );
    }

    public static void cancelPrayerRefresh(Context context) {
        WorkManager manager = WorkManager.getInstance(context);
        manager.cancelUniqueWork(IMMEDIATE_REFRESH);
        manager.cancelUniqueWork(PERIODIC_REFRESH);
        manager.cancelUniqueWork(RECEIPT_FLUSH);
    }

    public static void cacheAudio(Context context) {
        Constraints network = new Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build();
        WorkManager.getInstance(context).enqueueUniqueWork(
                AUDIO_CACHE,
                ExistingWorkPolicy.REPLACE,
                new OneTimeWorkRequest.Builder(AudioCacheWorker.class).setConstraints(network).build()
        );
    }
}
