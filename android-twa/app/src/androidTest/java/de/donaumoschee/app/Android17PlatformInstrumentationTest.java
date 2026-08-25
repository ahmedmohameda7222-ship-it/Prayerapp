package de.donaumoschee.app;

import android.content.ComponentName;
import android.content.Context;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.ServiceInfo;
import android.os.Build;

import androidx.test.core.app.ApplicationProvider;
import androidx.test.ext.junit.runners.AndroidJUnit4;

import de.donaumoschee.app.adhan.AdhanPlaybackService;

import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;

import java.util.Arrays;
import java.util.List;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

@RunWith(AndroidJUnit4.class)
public final class Android17PlatformInstrumentationTest {
    private Context context;
    private PackageManager packageManager;

    @Before
    public void setUp() {
        context = ApplicationProvider.getApplicationContext();
        packageManager = context.getPackageManager();
    }

    @Test
    public void installedCandidateTargets37AndRetainsMin23() throws Exception {
        ApplicationInfo info = packageManager.getApplicationInfo(context.getPackageName(), 0);
        assertEquals(37, info.targetSdkVersion);
        if (Build.VERSION.SDK_INT >= 24) assertEquals(23, info.minSdkVersion);
    }

    @Test
    public void installedManifestKeepsLeastPrivilege() throws Exception {
        PackageInfo info = packageManager.getPackageInfo(
                context.getPackageName(), PackageManager.GET_PERMISSIONS);
        List<String> permissions = info.requestedPermissions == null
                ? List.of() : Arrays.asList(info.requestedPermissions);
        assertTrue(permissions.contains("android.permission.SCHEDULE_EXACT_ALARM"));
        assertTrue(permissions.contains("android.permission.POST_NOTIFICATIONS"));
        assertTrue(permissions.contains("android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK"));
        assertFalse(permissions.contains("android.permission.ACCESS_LOCAL_NETWORK"));
        assertFalse(permissions.contains("android.permission.READ_SMS"));
        assertFalse(permissions.contains("android.permission.MANAGE_EXTERNAL_STORAGE"));
    }

    @Test
    public void adhanServiceIsPrivateMediaPlaybackForegroundService() throws Exception {
        ServiceInfo service = packageManager.getServiceInfo(
                new ComponentName(context, AdhanPlaybackService.class), 0);
        assertFalse(service.exported);
        if (Build.VERSION.SDK_INT >= 28) {
            assertTrue((service.foregroundServiceType
                    & ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK) != 0);
        }
    }
}
