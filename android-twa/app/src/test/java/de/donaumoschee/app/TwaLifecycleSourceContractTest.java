package de.donaumoschee.app;

import org.junit.Test;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

public final class TwaLifecycleSourceContractTest {
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
        Path root = projectRoot();
        return new String(Files.readAllBytes(root.resolve(relativePath)), StandardCharsets.UTF_8);
    }

    @Test
    public void launcherUsesTwaCapableProviderSelectionAndExplicitFallback() throws IOException {
        String launcher = source("app/src/main/java/de/donaumoschee/app/LauncherActivity.java");

        assertTrue(launcher.contains("TwaProviderPicker.pickProvider"));
        assertTrue(launcher.contains("TwaProviderPicker.LaunchMode.TRUSTED_WEB_ACTIVITY"));
        assertTrue(launcher.contains("TwaProviderPicker.LaunchMode.CUSTOM_TAB"));
        assertTrue(launcher.contains("CustomTabsClient.bindCustomTabsServicePreservePriority"));
        assertTrue(launcher.contains("buildCustomTabsIntent"));
        assertTrue(launcher.contains("setPackage(provider)"));
        assertTrue(launcher.contains("SessionStore.makeSessionId(getTaskId())"));
        assertTrue(launcher.contains("client.newSession(callback, sessionId)"));
    }

    @Test
    public void launcherPersistsProviderTrustAndSuppliesBrowserFocusIntent() throws IOException {
        String launcher = source("app/src/main/java/de/donaumoschee/app/LauncherActivity.java");
        String manifest = source("app/src/main/AndroidManifest.xml");

        assertTrue(launcher.contains("new SharedPreferencesTokenStore"));
        assertTrue(launcher.contains("Token.create(provider"));
        assertTrue(launcher.contains("FocusActivity.addToIntent"));
        assertTrue(manifest.contains("android.permission.REORDER_TASKS"));
        assertTrue(manifest.contains("com.google.androidbrowserhelper.trusted.FocusActivity"));
        assertTrue(manifest.contains("android:name=\"com.google.androidbrowserhelper.trusted.FocusActivity\"\n            android:exported=\"true\""));
    }

    @Test
    public void launcherUsesRestartAndDuplicateLaunchStateInsteadOfResumeFinish() throws IOException {
        String launcher = source("app/src/main/java/de/donaumoschee/app/LauncherActivity.java");

        assertTrue(launcher.contains("activeLauncherActivities"));
        assertTrue(launcher.contains("protected void onRestart()"));
        assertTrue(launcher.contains("if (browserLaunched)"));
        assertTrue(launcher.contains("protected void onSaveInstanceState"));
        assertTrue(launcher.contains("BROWSER_WAS_LAUNCHED_KEY"));
        assertTrue(launcher.contains("restartInNewTask()"));
        assertTrue(launcher.contains("Intent.FLAG_ACTIVITY_NEW_TASK"));
        assertTrue(launcher.contains("~Intent.FLAG_ACTIVITY_NEW_DOCUMENT"));
        assertFalse(launcher.contains("if (twaLaunched) {\n            finish();\n            return;\n        }"));
    }

    @Test
    public void verifiedPostMessageAndDigitalAssetLinksContractRemainsPresent() throws IOException {
        String launcher = source("app/src/main/java/de/donaumoschee/app/LauncherActivity.java");
        String strings = source("app/src/main/res/values/strings.xml");
        Path repository = projectRoot().getParent();
        String assetLinks = new String(
                Files.readAllBytes(repository.resolve("public/.well-known/assetlinks.json")),
                StandardCharsets.UTF_8
        );

        assertTrue(launcher.contains("requestPostMessageChannel"));
        assertTrue(launcher.contains("onPostMessage"));
        assertTrue(launcher.contains("session.postMessage"));
        assertTrue(strings.contains("delegate_permission/common.handle_all_urls"));
        assertTrue(strings.contains("https://donaumoschee.vercel.app"));
        assertTrue(assetLinks.contains("delegate_permission/common.handle_all_urls"));
        assertTrue(assetLinks.contains("delegate_permission/common.use_as_origin"));
        assertTrue(assetLinks.contains("de.donaumoschee.app"));
        assertTrue(assetLinks.contains("E9:98:4B:DB:36:FF:2F:8F:A5:58:29:5C:5C:06:6F:BA:ED:3A:BD:BD:CC:80:1C:83:5D:AE:1B:DD:4C:D7:0E:92"));
    }
}
