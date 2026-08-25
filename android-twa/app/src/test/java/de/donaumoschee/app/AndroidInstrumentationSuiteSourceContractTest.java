package de.donaumoschee.app;

import org.junit.Test;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

import static org.junit.Assert.assertTrue;

public final class AndroidInstrumentationSuiteSourceContractTest {
    private static Path repositoryRoot() {
        Path current = Path.of(System.getProperty("user.dir")).toAbsolutePath();
        for (Path cursor = current; cursor != null; cursor = cursor.getParent()) {
            if (Files.exists(cursor.resolve("android-twa/app/src/main"))) return cursor;
            if (cursor.getFileName() != null
                    && "android-twa".equals(cursor.getFileName().toString())
                    && Files.exists(cursor.resolve("app/src/main"))) {
                return cursor.getParent();
            }
        }
        throw new IllegalStateException("Repository root not found");
    }

    private static String source(String relativePath) throws IOException {
        return new String(
                Files.readAllBytes(repositoryRoot().resolve(relativePath)),
                StandardCharsets.UTF_8
        );
    }

    @Test
    public void androidTestSourceSetCoversCriticalRuntimeContracts() {
        List<String> requiredTests = List.of(
                "android-twa/app/src/androidTest/java/de/donaumoschee/app/Android17PlatformInstrumentationTest.java",
                "android-twa/app/src/androidTest/java/de/donaumoschee/app/bridge/BridgeHandlerInstrumentationTest.java",
                "android-twa/app/src/androidTest/java/de/donaumoschee/app/prayer/PrayerNotificationsInstrumentationTest.java",
                "android-twa/app/src/androidTest/java/de/donaumoschee/app/storage/NativeStoreInstrumentationTest.java",
                "android-twa/app/src/androidTest/java/de/donaumoschee/app/system/ManifestRepairIntegrationInstrumentationTest.java"
        );

        for (String requiredTest : requiredTests) {
            assertTrue("Missing instrumentation test: " + requiredTest,
                    Files.exists(repositoryRoot().resolve(requiredTest)));
        }
    }

    @Test
    public void instrumentationRunnerAndDependenciesAreConfigured() throws IOException {
        String gradle = source("android-twa/app/build.gradle");

        assertTrue(gradle.contains("testInstrumentationRunner 'androidx.test.runner.AndroidJUnitRunner'"));
        assertTrue(gradle.contains("androidTestImplementation 'androidx.test.ext:junit:"));
        assertTrue(gradle.contains("androidTestImplementation 'androidx.test:core:"));
        assertTrue(gradle.contains("androidTestImplementation 'androidx.test:runner:"));
    }

    @Test
    public void ciCompilesInstrumentationApkBeforeCandidateBuild() throws IOException {
        String workflow = source(".github/workflows/android-twa.yml");

        assertTrue(workflow.contains(":app:assembleDebugAndroidTest"));
    }
}
