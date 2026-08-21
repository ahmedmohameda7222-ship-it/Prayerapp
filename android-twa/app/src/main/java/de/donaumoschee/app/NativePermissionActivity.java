package de.donaumoschee.app;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.util.Log;

import de.donaumoschee.app.prayer.NativeStatus;
import de.donaumoschee.app.prayer.PrayerScheduler;
import de.donaumoschee.app.workers.NativeWork;

public final class NativePermissionActivity extends Activity {
    private static final String TAG = "DanubePrayer";
    public static final String EXTRA_MODE = "permission-mode";
    private static final int NOTIFICATION_REQUEST = 72;
    private String mode;
    private boolean waitingForExactSettings;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        mode = getIntent().getStringExtra(EXTRA_MODE);
        if (mode == null) mode = "both";
        if ((mode.equals("notification") || mode.equals("both")) && Build.VERSION.SDK_INT >= 33 && !NativeStatus.hasNotificationPermission(this)) {
            requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, NOTIFICATION_REQUEST);
        } else {
            continueAfterNotification();
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == NOTIFICATION_REQUEST) continueAfterNotification();
    }

    private void continueAfterNotification() {
        if ((mode.equals("exactAlarm") || mode.equals("both")) && Build.VERSION.SDK_INT >= 31 && !NativeStatus.hasExactAlarmPermission(this)) {
            waitingForExactSettings = true;
            startActivity(new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, Uri.parse("package:" + getPackageName())));
            return;
        }
        finishAndRepair();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (waitingForExactSettings) {
            waitingForExactSettings = false;
            finishAndRepair();
        }
    }

    private void finishAndRepair() {
        Log.i(TAG, "permission.result notification=" + NativeStatus.hasNotificationPermission(this) + " exact=" + NativeStatus.hasExactAlarmPermission(this));
        PrayerScheduler.reschedule(this);
        NativeWork.refreshNow(this);
        finish();
    }
}
