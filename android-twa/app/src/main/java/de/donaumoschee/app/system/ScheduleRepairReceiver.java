package de.donaumoschee.app.system;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.UserManager;
import android.os.Build;
import android.util.Log;

import de.donaumoschee.app.prayer.PrayerScheduler;
import de.donaumoschee.app.workers.NativeWork;

import java.util.Set;

public final class ScheduleRepairReceiver extends BroadcastReceiver {
    private static final String TAG = "DanubePrayer";
    private static final Set<String> ALLOWED_ACTIONS = Set.of(
            Intent.ACTION_BOOT_COMPLETED,
            Intent.ACTION_LOCKED_BOOT_COMPLETED,
            Intent.ACTION_MY_PACKAGE_REPLACED,
            Intent.ACTION_TIME_CHANGED,
            Intent.ACTION_TIMEZONE_CHANGED,
            "android.app.action.SCHEDULE_EXACT_ALARM_PERMISSION_STATE_CHANGED"
    );

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || !ALLOWED_ACTIONS.contains(intent.getAction())) return;
        UserManager userManager = context.getSystemService(UserManager.class);
        if (Build.VERSION.SDK_INT >= 24 && userManager != null && !userManager.isUserUnlocked()) return;
        Log.i(TAG, "alarm.repair action=" + intent.getAction());
        PrayerScheduler.reschedule(context);
        NativeWork.initialize(context);
        NativeWork.refreshNow(context);
    }
}
