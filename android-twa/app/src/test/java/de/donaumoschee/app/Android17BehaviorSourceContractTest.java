package de.donaumoschee.app;

import org.junit.Test;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

public final class Android17BehaviorSourceContractTest {
    private static Path repositoryRoot() {
        Path current = Path.of(System.getProperty("user.dir")).toAbsolutePath();
        for (Path cursor = current; cursor != null; cursor = cursor.getParent()) {
            if (Files.exists(cursor.resolve("android-twa/app/src/main"))) return cursor;
            if (cursor.getFileName() != null
                    && "android-twa".equals(cursor.getFileName().toString())
                    && Files.exists(cursor.resolve("app/src/main"))) return cursor.getParent();
        }
        throw new IllegalStateException("Repository root not found");
    }

    private static String source(String path) throws IOException {
        return Files.readString(repositoryRoot().resolve(path), StandardCharsets.UTF_8);
    }

    @Test
    public void manifestKeepsLeastPrivilegeForAndroid17() throws IOException {
        String manifest = source("android-twa/app/src/main/AndroidManifest.xml");
        for (String required : List.of(
                "android.permission.INTERNET",
                "android.permission.POST_NOTIFICATIONS",
                "android.permission.SCHEDULE_EXACT_ALARM",
                "android.permission.RECEIVE_BOOT_COMPLETED",
                "android.permission.FOREGROUND_SERVICE",
                "android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK",
                "android.permission.WAKE_LOCK"
        )) assertTrue(required, manifest.contains(required));

        for (String forbidden : List.of(
                "android.permission.ACCESS_LOCAL_NETWORK",
                "android.permission.READ_SMS",
                "android.permission.RECEIVE_SMS",
                "android.permission.READ_CONTACTS",
                "android.permission.READ_CALL_LOG",
                "android.permission.MANAGE_EXTERNAL_STORAGE",
                "android.permission.WRITE_EXTERNAL_STORAGE",
                "android.permission.BIND_ACCESSIBILITY_SERVICE"
        )) assertFalse(forbidden, manifest.contains(forbidden));

        assertTrue(manifest.contains("android:allowBackup=\"false\""));
        assertTrue(manifest.contains("android:usesCleartextTraffic=\"false\""));
    }

    @Test
    public void adhanUsesExactAlarmMediaForegroundServiceAndAlarmAudio() throws IOException {
        String manifest = source("android-twa/app/src/main/AndroidManifest.xml");
        String service = source("android-twa/app/src/main/java/de/donaumoschee/app/adhan/AdhanPlaybackService.java");
        String receiver = source("android-twa/app/src/main/java/de/donaumoschee/app/prayer/PrayerAlarmReceiver.java");
        String scheduler = source("android-twa/app/src/main/java/de/donaumoschee/app/prayer/PrayerScheduler.java");
        String repair = source("android-twa/app/src/main/java/de/donaumoschee/app/system/ScheduleRepairReceiver.java");

        assertTrue(manifest.contains("android:foregroundServiceType=\"mediaPlayback\""));
        assertTrue(service.contains("extends MediaSessionService"));
        assertTrue(service.contains("setUsage(C.USAGE_ALARM)"));
        assertTrue(service.contains("AudioCache.verifiedFile(this, soundId)"));
        assertTrue(receiver.contains("ContextCompat.startForegroundService(context, playback)"));
        assertTrue(scheduler.contains("setExactAndAllowWhileIdle"));
        assertFalse(repair.contains("AdhanPlaybackService"));
    }
}
