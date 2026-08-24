package de.donaumoschee.app.workers;

import android.content.Context;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

import de.donaumoschee.app.adhan.AdhanCatalog;
import de.donaumoschee.app.adhan.AudioCache;
import de.donaumoschee.app.prayer.NativeConfig;
import de.donaumoschee.app.storage.NativeStore;

import java.time.Instant;
import java.util.HashSet;
import java.util.Set;

public final class AudioCacheWorker extends Worker {
    private static final String TAG = "DanubePrayer";
    public AudioCacheWorker(@NonNull Context context, @NonNull WorkerParameters params) {
        super(context, params);
    }

    @NonNull
    @Override
    public Result doWork() {
        NativeConfig config = new NativeStore(getApplicationContext()).loadConfig(Instant.now());
        if (config == null) return Result.success();
        Set<String> soundIds = new HashSet<>();
        for (NativeConfig.Reminder reminder : config.reminders.values()) if (reminder.enabled) soundIds.add(reminder.adhanSoundId);
        boolean complete = true;
        for (String soundId : soundIds) {
            if (!AdhanCatalog.hasPinnedAudio(soundId)) {
                Log.w(TAG, "adhan.cache unavailable soundId=" + soundId);
                continue;
            }
            if (AudioCache.verifiedFile(getApplicationContext(), soundId) == null) {
                complete &= AudioCache.download(getApplicationContext(), soundId);
            }
        }
        if (complete) {
            Log.i(TAG, "adhan.cache fetch-complete sounds=" + soundIds.size());
            NativeWork.refreshNow(getApplicationContext());
            return Result.success();
        }
        Log.w(TAG, "adhan.cache retry sounds=" + soundIds.size());
        return Result.retry();
    }
}
