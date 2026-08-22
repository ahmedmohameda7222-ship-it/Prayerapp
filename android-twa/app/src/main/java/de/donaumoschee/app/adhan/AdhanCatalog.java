package de.donaumoschee.app.adhan;

import de.donaumoschee.app.prayer.Prayer;

import java.io.File;
import java.util.Collections;
import java.util.Map;

public final class AdhanCatalog {
    public enum SoundKind { REGULAR, FAJR }

    public record ApprovedSound(String url, SoundKind kind) {}

    private static final Map<String, ApprovedSound> APPROVED_SOUNDS = Map.ofEntries(
            Map.entry("abdul-basit-cairo", new ApprovedSound("https://www.ashefaa.com/ruqia/Azan/62.mp3", SoundKind.REGULAR)),
            Map.entry("mohamed-refaat-cairo", new ApprovedSound("https://www.ashefaa.com/ruqia/Azan/7.mp3", SoundKind.REGULAR)),
            Map.entry("mostafa-ismail-cairo", new ApprovedSound("https://www.ashefaa.com/ruqia/Azan/27.mp3", SoundKind.REGULAR)),
            Map.entry("mahmoud-hosary-cairo", new ApprovedSound("https://www.ashefaa.com/ruqia/Azan/22.mp3", SoundKind.REGULAR)),
            Map.entry("makkah", new ApprovedSound("https://www.ashefaa.com/ruqia/Azan/50.mp3", SoundKind.REGULAR)),
            Map.entry("madinah", new ApprovedSound("https://www.ashefaa.com/ruqia/Azan/58.mp3", SoundKind.REGULAR)),
            Map.entry("fajr-cairo", new ApprovedSound("https://www.ashefaa.com/ruqia/Azan/10.mp3", SoundKind.FAJR)),
            Map.entry("fajr-makkah", new ApprovedSound("https://www.ashefaa.com/ruqia/Azan/48.mp3", SoundKind.FAJR)),
            Map.entry("fajr-madinah", new ApprovedSound("https://www.ashefaa.com/ruqia/Azan/19.mp3", SoundKind.FAJR))
    );

    private AdhanCatalog() {}

    public static boolean isApproved(String id) {
        return id != null && APPROVED_SOUNDS.containsKey(id);
    }

    public static boolean isCompatible(Prayer prayer, String id) {
        if (prayer == null || !isApproved(id)) return false;
        return prayer == Prayer.FAJR
                ? approvedKind(id) == SoundKind.FAJR
                : approvedKind(id) == SoundKind.REGULAR;
    }

    public static String approvedUrl(String id) {
        ApprovedSound value = APPROVED_SOUNDS.get(id);
        if (value == null) throw new IllegalArgumentException("Unapproved Adhan sound");
        return value.url();
    }

    public static SoundKind approvedKind(String id) {
        ApprovedSound value = APPROVED_SOUNDS.get(id);
        if (value == null) throw new IllegalArgumentException("Unapproved Adhan sound");
        return value.kind();
    }

    public static Map<String, ApprovedSound> approvedSounds() {
        return Collections.unmodifiableMap(APPROVED_SOUNDS);
    }

    public static File audioFile(File filesDir, String id) {
        if (!isApproved(id)) throw new IllegalArgumentException("Unapproved Adhan sound");
        return new File(new File(filesDir, "adhan"), id + ".mp3");
    }
}
