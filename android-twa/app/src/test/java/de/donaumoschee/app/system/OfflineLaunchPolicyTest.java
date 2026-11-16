package de.donaumoschee.app.system;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

public class OfflineLaunchPolicyTest {
    @Test
    public void firstLaunchWithoutValidatedConnectivityShowsNativeRetryScreen() {
        assertTrue(OfflineLaunchPolicy.shouldShowOfflineFallback(false, false));
    }

    @Test
    public void previouslyOpenedAppStillLaunchesTwaOfflineToUseBrowserServiceWorkerCache() {
        assertFalse(OfflineLaunchPolicy.shouldShowOfflineFallback(true, false));
    }

    @Test
    public void freshOnlineLaunchUsesTwa() {
        assertFalse(OfflineLaunchPolicy.shouldShowOfflineFallback(false, true));
    }
}
