package de.donaumoschee.app.prayer;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

import androidx.core.content.ContextCompat;

import de.donaumoschee.app.adhan.AdhanCatalog;
import de.donaumoschee.app.adhan.AdhanPlaybackService;
import de.donaumoschee.app.storage.NativeStore;

public final class PrayerAlarmReceiver extends BroadcastReceiver {
    private static final String TAG = "DanubePrayer";
    @Override
    public void onReceive(Context context, Intent intent) {
        String eventId = intent.getStringExtra(PrayerScheduler.EXTRA_EVENT_ID);
        String prayerValue = intent.getStringExtra(PrayerScheduler.EXTRA_PRAYER);
        String kind = intent.getStringExtra(PrayerScheduler.EXTRA_KIND);
        String soundId = intent.getStringExtra(PrayerScheduler.EXTRA_ADHAN_SOUND_ID);
        int eventGeneration = intent.getIntExtra(PrayerScheduler.EXTRA_ACCOUNT_GENERATION, -1);
        if (eventId == null || prayerValue == null || kind == null || !AdhanCatalog.isApproved(soundId)) return;

        NativeStore store = new NativeStore(context);
        if (store.accountGeneration() != eventGeneration) {
            Log.i(TAG, "alarm.fire ignored-stale generation=" + eventGeneration);
            return;
        }

        Prayer prayer;
        try {
            prayer = Prayer.fromKey(prayerValue);
        } catch (IllegalArgumentException error) {
            return;
        }
        if (!store.markDelivered(eventId)) return;
        Log.i(TAG, "alarm.fire kind=" + kind + " prayer=" + prayer.key + " generation=" + eventGeneration);
        if (AlarmEvent.Kind.REMINDER.name().equals(kind)) {
            PrayerNotifications.showReminder(context, eventId, prayer, intent.getIntExtra(PrayerScheduler.EXTRA_LEAD_MINUTES, 15));
            return;
        }
        if (!AlarmEvent.Kind.ADHAN.name().equals(kind)
                || !NativeStatus.notificationCapabilities(context).adhanDeliveryReady()) return;
        Intent playback = new Intent(context, AdhanPlaybackService.class)
                .setAction(AdhanPlaybackService.ACTION_PLAY)
                .putExtra(PrayerScheduler.EXTRA_EVENT_ID, eventId)
                .putExtra(PrayerScheduler.EXTRA_PRAYER, prayer.key)
                .putExtra(PrayerScheduler.EXTRA_ADHAN_SOUND_ID, soundId);
        ContextCompat.startForegroundService(context, playback);
    }
}
