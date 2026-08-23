package de.donaumoschee.app.prayer;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

import de.donaumoschee.app.LauncherActivity;
import de.donaumoschee.app.R;
import de.donaumoschee.app.adhan.AdhanPlaybackService;

public final class PrayerNotifications {
    public static final String REMINDER_CHANNEL = "prayer-reminders-v1";

    private PrayerNotifications() {}

    public static void createChannels(Context context) {
        if (Build.VERSION.SDK_INT < 26) return;
        NotificationManager manager = context.getSystemService(NotificationManager.class);
        if (manager == null) return;

        NotificationChannel reminders = new NotificationChannel(
                REMINDER_CHANNEL,
                context.getString(R.string.channel_prayer_reminders),
                NotificationManager.IMPORTANCE_HIGH
        );
        reminders.setDescription(context.getString(R.string.channel_prayer_reminders_description));
        manager.createNotificationChannel(reminders);

        NotificationChannel adhan = new NotificationChannel(
                AdhanPlaybackService.CHANNEL,
                context.getString(R.string.channel_adhan_playback),
                NotificationManager.IMPORTANCE_LOW
        );
        manager.createNotificationChannel(adhan);
    }

    public static boolean showReminder(Context context, String eventId, Prayer prayer, int leadMinutes) {
        if (!NativeStatus.notificationCapabilities(context).reminderDeliveryReady()) return false;
        Intent launch = new Intent(context, LauncherActivity.class).setData(android.net.Uri.parse("https://donaumoschee.vercel.app/?reminder=" + prayer.key + "#prayer-times"));
        PendingIntent content = PendingIntent.getActivity(context, prayer.ordinal(), launch, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, REMINDER_CHANNEL)
                .setSmallIcon(R.drawable.ic_notification_icon)
                .setContentTitle(context.getString(R.string.prayer_reminder_title))
                .setContentText(context.getString(R.string.prayer_reminder_body, leadMinutes, prayer.displayName(context)))
                .setContentIntent(content)
                .setAutoCancel(true)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setCategory(NotificationCompat.CATEGORY_REMINDER);
        try {
            NotificationManagerCompat.from(context).notify(eventId.hashCode(), builder.build());
            return true;
        } catch (SecurityException ignored) {
            // Permission can be revoked between the explicit check and notify().
            return false;
        }
    }
}
