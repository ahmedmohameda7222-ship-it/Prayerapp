package de.donaumoschee.firetv;

import org.junit.Test;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.charset.StandardCharsets;
import static org.junit.Assert.*;

public class NativeKioskContractTest {
    private String source(String name) throws Exception {
        return Files.readString(Path.of("src/main/", name), StandardCharsets.UTF_8);
    }

    @Test public void keepsTheScreenOnWhileTheKioskActivityIsVisible() throws Exception {
        String code = source("java/de/donaumoschee/firetv/MainActivity.java");
        assertTrue(code.contains("getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)"));
        assertTrue(code.contains("getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)"));
        assertTrue(code.contains("protected void onResume()"));
        assertTrue(code.contains("protected void onPause()"));
        assertFalse(code.contains("PowerManager.WakeLock"));
        assertFalse(code.contains("dispatchKeyEvent(new"));
    }

    @Test public void loadsTheRealSiteAndRejectsWebNavigationOutsidePinnedHost() throws Exception {
        String code = source("java/de/donaumoschee/firetv/MainActivity.java");
        assertTrue(code.contains("webView.loadUrl(KioskPolicy.DISPLAY_URL)"));
        assertTrue(code.contains("!KioskPolicy.isTrustedUrl("));
        assertTrue(code.contains("setJavaScriptEnabled(true)"));
        assertTrue(code.contains("setDomStorageEnabled(true)"));
        assertTrue(code.contains("setAllowFileAccess(false)"));
        assertTrue(code.contains("MIXED_CONTENT_NEVER_ALLOW"));
        assertTrue(code.contains("handler.cancel()"));
    }

    @Test public void isAnIndependentTvLauncherAndDoesNotClaimAutoStart() throws Exception {
        String manifest = source("AndroidManifest.xml");
        assertTrue(manifest.contains("android.intent.category.LEANBACK_LAUNCHER"));
        assertTrue(manifest.contains("android.hardware.touchscreen"));
        assertTrue(manifest.contains("android:required=\"false\""));
        assertTrue(manifest.contains("android:screenOrientation=\"landscape\""));
        assertTrue(manifest.contains("android:exported=\"true\""));
        assertFalse(manifest.contains("RECEIVE_BOOT_COMPLETED"));
        assertFalse(manifest.contains("android.permission.WAKE_LOCK"));
    }
}
