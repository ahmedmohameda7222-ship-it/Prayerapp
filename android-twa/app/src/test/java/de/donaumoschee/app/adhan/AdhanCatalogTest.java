package de.donaumoschee.app.adhan;

import de.donaumoschee.app.prayer.Prayer;

import org.junit.Test;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

public final class AdhanCatalogTest {
    @Test
    public void acceptsOnlyCompatibleCatalogHttpsSources() {
        assertTrue(AdhanCatalog.isCompatible(Prayer.FAJR, "fajr-cairo"));
        assertTrue(AdhanCatalog.isCompatible(Prayer.DHUHR, "abdul-basit-cairo"));
        assertFalse(AdhanCatalog.isCompatible(Prayer.FAJR, "abdul-basit-cairo"));
        assertFalse(AdhanCatalog.isCompatible(Prayer.ISHA, "fajr-madinah"));
        assertFalse(AdhanCatalog.isApproved("https://evil.example/adhan.mp3"));
        assertEquals("https://www.ashefaa.com/ruqia/Azan/19.mp3", AdhanCatalog.approvedUrl("fajr-madinah"));
        assertEquals(AdhanCatalog.SoundKind.FAJR, AdhanCatalog.approvedKind("fajr-madinah"));
        assertEquals(9, AdhanCatalog.approvedSounds().size());
    }
}
