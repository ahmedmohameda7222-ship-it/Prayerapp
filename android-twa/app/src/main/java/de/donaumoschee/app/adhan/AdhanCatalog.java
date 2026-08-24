package de.donaumoschee.app.adhan;

import de.donaumoschee.app.prayer.Prayer;

import java.io.File;
import java.util.Collections;
import java.util.Map;

public final class AdhanCatalog {
    public enum SoundKind { REGULAR, FAJR }

    public record ApprovedSound(String url, SoundKind kind, String sha256) {}

    private static final Map<String, ApprovedSound> APPROVED_SOUNDS = Map.ofEntries(
            Map.entry("abdul-basit-cairo", new ApprovedSound(
                    "https://www.ashefaa.com/ruqia/Azan/62.mp3",
                    SoundKind.REGULAR,
                    "26989f59db7a11400478d91b40bf9684a0eaf8d02eaae04f814b7137d6f336a6"
            )),
            Map.entry("mohamed-refaat-cairo", new ApprovedSound(
                    "https://www.ashefaa.com/ruqia/Azan/7.mp3",
                    SoundKind.REGULAR,
                    "ee054cce38ef75fdb43f1fbb67504300afe575dd3dfe2ae7250c391bf6a60159"
            )),
            Map.entry("mostafa-ismail-cairo", new ApprovedSound(
                    "https://www.ashefaa.com/ruqia/Azan/27.mp3",
                    SoundKind.REGULAR,
                    "b5c42734f61498af03d33f439225737da20c8cd303cee0b904679fe545704ec3"
            )),
            Map.entry("mahmoud-hosary-cairo", new ApprovedSound(
                    "https://www.ashefaa.com/ruqia/Azan/22.mp3",
                    SoundKind.REGULAR,
                    "fde397de2a5e07fc52c44d7f7d2fecc8e50c75141f2e98b538408e91843a568d"
            )),
            Map.entry("makkah", new ApprovedSound(
                    "https://www.ashefaa.com/ruqia/Azan/50.mp3",
                    SoundKind.REGULAR,
                    "a25ea28777c7e3871758c51ade558a1fa3d2a8e4274f79aeced14b42437ed5f5"
            )),
            Map.entry("madinah", new ApprovedSound(
                    "https://www.ashefaa.com/ruqia/Azan/58.mp3",
                    SoundKind.REGULAR,
                    "ed46ade566b30bee108e08f4dbc1a5341f7a2111eaf7de240686e3669af6ee65"
            )),
            Map.entry("fajr-cairo", new ApprovedSound(
                    "https://www.ashefaa.com/ruqia/Azan/10.mp3",
                    SoundKind.FAJR,
                    "27b6018f25cb3b227bb1089108721d94c63cbae4ce8ee13848dd81b50ff20112"
            )),
            Map.entry("fajr-makkah", new ApprovedSound(
                    "https://www.ashefaa.com/ruqia/Azan/48.mp3",
                    SoundKind.FAJR,
                    "7048e6b80e95ae72834cdb650ddb10fc2179e38b356cb78112700d1646db454c"
            )),
            // Keep this legacy id recognizable so stored configuration can round-trip safely.
            // The provider's published /Azan/19.mp3 source currently returns 404, so no bytes are trusted.
            Map.entry("fajr-madinah", new ApprovedSound(
                    "https://www.ashefaa.com/ruqia/Azan/19.mp3",
                    SoundKind.FAJR,
                    ""
            ))
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

    public static String approvedSha256(String id) {
        ApprovedSound value = APPROVED_SOUNDS.get(id);
        return value == null ? null : value.sha256();
    }

    public static boolean hasPinnedAudio(String id) {
        String hash = approvedSha256(id);
        return hash != null && hash.matches("^[0-9a-f]{64}$");
    }

    public static Map<String, ApprovedSound> approvedSounds() {
        return Collections.unmodifiableMap(APPROVED_SOUNDS);
    }

    public static File audioFile(File filesDir, String id) {
        if (!isApproved(id)) throw new IllegalArgumentException("Unapproved Adhan sound");
        return new File(new File(filesDir, "adhan"), id + ".mp3");
    }
}
