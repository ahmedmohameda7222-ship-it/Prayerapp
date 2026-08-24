package de.donaumoschee.app.prayer;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.os.Build;

import androidx.test.core.app.ApplicationProvider;
import androidx.test.ext.junit.runners.AndroidJUnit4;

import de.donaumoschee.app.adhan.AdhanPlaybackService;

import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotEquals;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertFalse;
import static org.junit.Assume.assumeTrue;

@RunWith(AndroidJUnit4.class)
public final class PrayerNotificationsInstrumentationTest {
    private static final String PREFERENCES = "native-prayer-engine-v1";

    private Context context;
    private NotificationManager manager;

    @Before
    public void setUp() {
        context = ApplicationProvider.getApplicationContext();
        manager = context.getSystemService(NotificationManager.class);
        context.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE)
                .edit()
                .clear()
                .commit();
        if (Build.VERSION.SDK_INT >= 26 && manager != null) {
            manager.deleteNotificationChannel(PrayerNotifications.REMINDER_CHANNEL);
            manager.deleteNotificationChannel(AdhanPlaybackService.CHANNEL);
        }
    }

    @After
    public void tearDown() {
        if (Build.VERSION.SDK_INT >= 26 && manager != null) {
            manager.deleteNotificationChannel(PrayerNotifications.REMINDER_CHANNEL);
            manager.deleteNotificationChannel(AdhanPlaybackService.CHANNEL);
        }
    }

    @Test
    public void createChannelsRegistersIndependentReminderAndAdhanPolicies() {
        assumeTrue(Build.VERSION.SDK_INT >= 26);
        assertNotNull(manager);

        PrayerNotifications.createChannels(context);
        PrayerNotifications.createChannels(context);

        NotificationChannel reminder = manager.getNotificationChannel(PrayerNotifications.REMINDER_CHANNEL);
        NotificationChannel adhan = manager.getNotificationChannel(AdhanPlaybackService.CHANNEL);

        assertNotNull(reminder);
        assertNotNull(adhan);
        assertEquals(NotificationManager.IMPORTANCE_HIGH, reminder.getImportance());
        assertEquals(NotificationManager.IMPORTANCE_LOW, adhan.getImportance());
        assertNotEquals(reminder.getId(), adhan.getId());
        assertFalse(reminder.getName().toString().isBlank());
        assertFalse(adhan.getName().toString().isBlank());
    }
}
