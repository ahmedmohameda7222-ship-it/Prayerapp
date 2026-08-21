package de.donaumoschee.app.adhan;

import de.donaumoschee.app.prayer.Prayer;

import java.io.File;
import java.util.Map;
import java.util.Set;

public final class AdhanCatalog {
    private static final Set<String> FAJR_SOUNDS = Set.of("fajr-cairo", "fajr-makkah", "fajr-madinah");
    private static final Map<String, String> APPROVED_URLS = Map.ofEntries(
            Map.entry("abdul-basit-cairo", "https://www.ashefaa.com/ruqia/Azan/62.mp3"),
            Map.entry("mohamed-refaat-cairo", "https://www.ashefaa.com/ruqia/Azan/7.mp3"),
            Map.entry("mostafa-ismail-cairo", "https://www.ashefaa.com/ruqia/Azan/27.mp3"),
            Map.entry("mahmoud-hosary-cairo", "https://www.ashefaa.com/ruqia/Azan/22.mp3"),
            Map.entry("makkah", "https://www.ashefaa.com/ruqia/Azan/50.mp3"),
            Map.entry("madinah", "https://www.ashefaa.com/ruqia/Azan/58.mp3"),
            Map.entry("fajr-cairo", "https://www.ashefaa.com/ruqia/Azan/10.mp3"),
            Map.entry("fajr-makkah", "https://www.ashefaa.com/ruqia/Azan/48.mp3"),
            Map.entry("fajr-madinah", "https://www.ashefaa.com/ruqia/Azan/20.mp3")
    );

    private AdhanCatalog() {}

    public static boolean isApproved(String id) {
        return id != null && APPROVED_URLS.containsKey(id);
    }

    public static boolean isCompatible(Prayer prayer, String id) {
        if (prayer == null || !isApproved(id)) return false;
        return prayer == Prayer.FAJR ? FAJR_SOUNDS.contains(id) : !FAJR_SOUNDS.contains(id);
    }

    public static String approvedUrl(String id) {
        String value = APPROVED_URLS.get(id);
        if (value == null) throw new IllegalArgumentException("Unapproved Adhan sound");
        return value;
    }

    public static File audioFile(File filesDir, String id) {
        if (!isApproved(id)) throw new IllegalArgumentException("Unapproved Adhan sound");
        return new File(new File(filesDir, "adhan"), id + ".mp3");
    }
}
