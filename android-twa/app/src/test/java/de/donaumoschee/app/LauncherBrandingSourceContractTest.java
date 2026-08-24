package de.donaumoschee.app;

import org.junit.Test;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

public final class LauncherBrandingSourceContractTest {
    private static Path projectRoot() {
        Path current = Path.of(System.getProperty("user.dir")).toAbsolutePath();
        for (Path cursor = current; cursor != null; cursor = cursor.getParent()) {
            if (Files.exists(cursor.resolve("android-twa/app/src/main"))) {
                return cursor.resolve("android-twa");
            }
            if (cursor.getFileName() != null
                    && "android-twa".equals(cursor.getFileName().toString())
                    && Files.exists(cursor.resolve("app/src/main"))) {
                return cursor;
            }
        }
        throw new IllegalStateException("Android project root not found");
    }

    private static String source(String relativePath) throws IOException {
        return new String(
                Files.readAllBytes(projectRoot().resolve(relativePath)),
                StandardCharsets.UTF_8
        );
    }

    @Test
    public void manifestUsesDedicatedLauncherMipmapResources() throws IOException {
        String manifest = source("app/src/main/AndroidManifest.xml");

        assertTrue(manifest.contains("android:icon=\"@mipmap/ic_launcher\""));
        assertTrue(manifest.contains("android:roundIcon=\"@mipmap/ic_launcher_round\""));
        assertFalse(manifest.contains("android:icon=\"@drawable/app_icon\""));
        assertFalse(manifest.contains("android:roundIcon=\"@drawable/app_icon\""));
    }

    @Test
    public void adaptiveIconsSeparateBrandBackgroundFromSafeForeground() throws IOException {
        String standard = source("app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml");
        String round = source("app/src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml");
        String foreground = source("app/src/main/res/drawable/app_icon_foreground.xml");
        String legacy = source("app/src/main/res/mipmap-anydpi/ic_launcher.xml");
        String legacyRound = source("app/src/main/res/mipmap-anydpi/ic_launcher_round.xml");

        for (String adaptive : new String[] {standard, round}) {
            assertTrue(adaptive.contains("<adaptive-icon"));
            assertTrue(adaptive.contains("android:drawable=\"@color/twa_background_color\""));
            assertTrue(adaptive.contains("android:drawable=\"@drawable/app_icon_foreground\""));
        }
        assertTrue(foreground.contains("android:width=\"72dp\""));
        assertTrue(foreground.contains("android:height=\"72dp\""));
        assertTrue(foreground.contains("android:src=\"@drawable/app_icon\""));
        assertTrue(legacy.contains("android:src=\"@drawable/app_icon\""));
        assertTrue(legacyRound.contains("android:src=\"@drawable/app_icon\""));
    }

    @Test
    public void splashUsesOneSafeBrandMarkInsteadOfFullLauncherComposition() throws IOException {
        String splash = source("app/src/main/res/drawable/splash.xml");

        assertTrue(splash.contains("android:drawable=\"@color/twa_background_color\""));
        assertTrue(splash.contains("android:drawable=\"@drawable/app_icon_foreground\""));
        assertFalse(splash.contains("android:src=\"@drawable/app_icon\""));
        assertFalse(splash.contains("<bitmap"));
    }
}
