package de.donaumoschee.app;

import android.Manifest;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.util.Log;

import androidx.activity.ComponentActivity;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;

import de.donaumoschee.app.prayer.NativeStatus;
import de.donaumoschee.app.prayer.PrayerScheduler;
import de.donaumoschee.app.workers.NativeWork;

public final class NativePermissionActivity extends ComponentActivity {
    private static final String TAG = "DanubePrayer";
    public static final String EXTRA_MODE = "permission-mode";
    private String mode;
    private final ActivityResultLauncher<String> notificationPermissionLauncher = registerForActivityResult(
            new ActivityResultContracts.RequestPermission(),
            ignored -> continueAfterNotification()
    );
    private final ActivityResultLauncher<Intent> exactAlarmSettingsLauncher = registerForActivityResult(
            new ActivityResultContracts.StartActivityForResult(),
            ignored -> finishAndRepair()
    );

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        mode = getIntent().getStringExtra(EXTRA_MODE);
        if (mode == null) mode = "both";
        if ((mode.equals("notification") || mode.equals("both")) && Build.VERSION.SDK_INT >= 33 && !NativeStatus.hasNotificationPermission(this)) {
            notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS);
        } else {
            continueAfterNotification();
        }
    }

    private void continueAfterNotification() {
        if ((mode.equals("exactAlarm") || mode.equals("both")) && Build.VERSION.SDK_INT >= 31 && !NativeStatus.hasExactAlarmPermission(this)) {
            exactAlarmSettingsLauncher.launch(new Intent(
                    Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM,
                    Uri.parse("package:" + getPackageName())
            ));
            return;
        }
        finishAndRepair();
    }

    private void finishAndRepair() {
        boolean exactAlarmPermission = NativeStatus.hasExactAlarmPermission(this);
        Log.i(TAG, "permission.result notification=" + NativeStatus.hasNotificationPermission(this) + " exact=" + exactAlarmPermission);
        PrayerScheduler.reschedule(this);
        NativeWork.refreshNow(this);
        finish();
    }
}
