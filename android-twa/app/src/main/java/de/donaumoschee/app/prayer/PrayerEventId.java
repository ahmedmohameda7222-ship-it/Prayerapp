package de.donaumoschee.app.prayer;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDate;
import java.util.Locale;

public final class PrayerEventId {
    private PrayerEventId() {}

    public static String create(
            String scheduleId,
            String scheduleRevision,
            LocalDate date,
            Prayer prayer,
            AlarmEvent.Kind kind,
            int leadMinutes
    ) {
        String canonical = String.join("|",
                "v2",
                scheduleId,
                scheduleRevision,
                date.toString(),
                prayer.key,
                kind.name().toLowerCase(Locale.ROOT),
                Integer.toString(leadMinutes)
        );
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(canonical.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder(digest.length * 2);
            for (byte value : digest) hex.append(String.format(Locale.ROOT, "%02x", value & 0xff));
            return "p2:" + hex;
        } catch (NoSuchAlgorithmException error) {
            throw new IllegalStateException("SHA-256 unavailable", error);
        }
    }
}
