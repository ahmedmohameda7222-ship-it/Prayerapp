package de.donaumoschee.app.system;

import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ActivityInfo;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;

import androidx.test.core.app.ApplicationProvider;
import androidx.test.ext.junit.runners.AndroidJUnit4;

import de.donaumoschee.app.prayer.PrayerAlarmReceiver;

import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;

import java.util.List;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

@RunWith(AndroidJUnit4.class)
public final class ManifestRepairIntegrationInstrumentationTest {
    private Context context;
    private PackageManager packageManager;

    @Before
    public void setUp() {
        context = ApplicationProvider.getApplicationContext();
        packageManager = context.getPackageManager();
    }

    @Test
    public void criticalPrayerReceiversRemainPrivateAndRepairReceiverIsDirectBootAware() throws Exception {
        ActivityInfo prayerAlarm = packageManager.getReceiverInfo(
                new ComponentName(context, PrayerAlarmReceiver.class),
                0
        );
        ActivityInfo repair = packageManager.getReceiverInfo(
                new ComponentName(context, ScheduleRepairReceiver.class),
                0
        );

        assertFalse(prayerAlarm.exported);
        assertFalse(repair.exported);
        assertTrue(repair.directBootAware);
    }

    @Test
    public void everyCriticalRepairBroadcastResolvesToScheduleRepairReceiver() {
        String[] actions = {
                Intent.ACTION_BOOT_COMPLETED,
                Intent.ACTION_LOCKED_BOOT_COMPLETED,
                Intent.ACTION_MY_PACKAGE_REPLACED,
                Intent.ACTION_TIME_CHANGED,
                Intent.ACTION_DATE_CHANGED,
                Intent.ACTION_TIMEZONE_CHANGED,
                "android.app.action.SCHEDULE_EXACT_ALARM_PERMISSION_STATE_CHANGED"
        };

        for (String action : actions) {
            Intent intent = new Intent(action).setPackage(context.getPackageName());
            List<ResolveInfo> receivers = packageManager.queryBroadcastReceivers(intent, 0);
            assertTrue(
                    "ScheduleRepairReceiver must resolve action " + action,
                    receivers.stream().anyMatch(info -> info.activityInfo != null
                            && ScheduleRepairReceiver.class.getName().equals(info.activityInfo.name))
            );
        }
    }
}
