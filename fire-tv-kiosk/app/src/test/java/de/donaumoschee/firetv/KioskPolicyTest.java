package de.donaumoschee.firetv;

import org.junit.Test;
import static org.junit.Assert.*;

public class KioskPolicyTest {
    @Test public void alwaysLoadsTheOfficialTvUrl() {
        assertEquals("https://donaumoschee-tv.vercel.app/", KioskPolicy.DISPLAY_URL);
        assertTrue(KioskPolicy.isTrustedUrl(KioskPolicy.DISPLAY_URL));
    }

    @Test public void refusesUntrustedDestinationsAndNonHttpsSchemes() {
        assertTrue(KioskPolicy.isTrustedUrl("https://donaumoschee-tv.vercel.app/?diagnostics=1"));
        assertFalse(KioskPolicy.isTrustedUrl("http://donaumoschee-tv.vercel.app/"));
        assertFalse(KioskPolicy.isTrustedUrl("https://donaumoschee-tv.vercel.app.evil.example/"));
        assertFalse(KioskPolicy.isTrustedUrl("https://evil.example/"));
        assertFalse(KioskPolicy.isTrustedUrl("javascript:alert(1)"));
        assertFalse(KioskPolicy.isTrustedUrl("file:///sdcard/secret.txt"));
        assertFalse(KioskPolicy.isTrustedUrl("content://provider/something"));
        assertFalse(KioskPolicy.isTrustedUrl("https://attacker@donaumoschee-tv.vercel.app/"));
        assertFalse(KioskPolicy.isTrustedUrl("https://donaumoschee-tv.vercel.app:8443/"));
        assertFalse(KioskPolicy.isTrustedUrl(null));
    }

    @Test public void supportsNormalHttpsPortAndSubpaths() {
        assertTrue(KioskPolicy.isTrustedUrl("https://donaumoschee-tv.vercel.app:443/"));
        assertTrue(KioskPolicy.isTrustedUrl("https://donaumoschee-tv.vercel.app/testing?x=1"));
    }
}
