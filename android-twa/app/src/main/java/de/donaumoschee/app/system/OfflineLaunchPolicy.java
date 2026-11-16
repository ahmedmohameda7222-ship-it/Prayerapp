package de.donaumoschee.app.system;

/**
 * An installed TWA uses the browser's Service Worker cache on later launches.
 * Only the very first, uninitialized launch needs a native no-network screen.
 */
public final class OfflineLaunchPolicy {
    private OfflineLaunchPolicy() {}

    public static boolean shouldShowOfflineFallback(
            boolean hasOpenedWithNetwork, boolean hasValidatedNetwork) {
        return !hasOpenedWithNetwork && !hasValidatedNetwork;
    }
}
