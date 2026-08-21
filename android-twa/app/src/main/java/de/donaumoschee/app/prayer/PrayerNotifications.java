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

public final class PrayerNotifications {
    public static final String REMINDER_CHANNEL = "prayer-reminders-v1";

    private PrayerNotifications() {}

    public static void createChannels(Context context) {
        if (Build.VERSION.SDK_INT < 26) return;
        NotificationManager manager = context.getSystemService(NotificationManager.class);
        NotificationChannel reminders = new NotificationChannel(
                REMINDER_CHANNEL,
                context.getString(R.string.channel_prayer_reminders),
                NotificationManager.IMPORTANCE_HIGH
        );
        reminders.setDescription(context.getString(R.string.channel_prayer_reminders_description));
        manager.createNotificationChannel(reminders);
    }

    public static void showReminder(Context context, String eventId, Prayer prayer, int leadMinutes) {
        if (!NativeStatus.hasNotificationPermission(context)) return;
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
        } catch (SecurityException ignored) {
            // Permission can be revoked between the explicit check and notify().
        }
    }
}
