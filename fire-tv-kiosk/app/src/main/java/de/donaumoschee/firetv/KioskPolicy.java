package de.donaumoschee.firetv;

import java.net.URI;
import java.net.URISyntaxException;

/** Keep a native TV WebView pinned to the exact official mosque-display origin. */
public final class KioskPolicy {
    public static final String DISPLAY_URL = "https://donaumoschee-tv.vercel.app/";
    private static final String TRUSTED_HOST = "donaumoschee-tv.vercel.app";

    private KioskPolicy() { }

    public static boolean isTrustedUrl(String raw) {
        if (raw == null) return false;
        try {
            URI uri = new URI(raw);
            return "https".equalsIgnoreCase(uri.getScheme())
                && TRUSTED_HOST.equalsIgnoreCase(uri.getHost())
                && (uri.getPort() == -1 || uri.getPort() == 443)
                && uri.getRawUserInfo() == null;
        } catch (URISyntaxException | IllegalArgumentException ignored) {
            return false;
        }
    }
}
