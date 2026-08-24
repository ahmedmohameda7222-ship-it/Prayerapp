package de.donaumoschee.app.adhan;

import org.junit.Test;

import java.io.BufferedInputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;
import java.util.LinkedHashMap;
import java.util.Map;

public final class AdhanHashProbeTest {
    @Test
    public void printApprovedSourceHashes() throws Exception {
        Map<String, String> sources = new LinkedHashMap<>();
        sources.put("abdul-basit-cairo", "https://www.ashefaa.com/ruqia/Azan/62.mp3");
        sources.put("mohamed-refaat-cairo", "https://www.ashefaa.com/ruqia/Azan/7.mp3");
        sources.put("mostafa-ismail-cairo", "https://www.ashefaa.com/ruqia/Azan/27.mp3");
        sources.put("mahmoud-hosary-cairo", "https://www.ashefaa.com/ruqia/Azan/22.mp3");
        sources.put("makkah", "https://www.ashefaa.com/ruqia/Azan/50.mp3");
        sources.put("madinah", "https://www.ashefaa.com/ruqia/Azan/58.mp3");
        sources.put("fajr-cairo", "https://www.ashefaa.com/ruqia/Azan/10.mp3");
        sources.put("fajr-makkah", "https://www.ashefaa.com/ruqia/Azan/48.mp3");
        sources.put("fajr-madinah", "https://www.ashefaa.com/ruqia/Azan/19.mp3");

        StringBuilder report = new StringBuilder("ADHAN_HASH_PROBE\n");
        for (Map.Entry<String, String> item : sources.entrySet()) {
            HttpURLConnection connection = (HttpURLConnection) new URL(item.getValue()).openConnection();
            connection.setConnectTimeout(15_000);
            connection.setReadTimeout(45_000);
            connection.setInstanceFollowRedirects(true);
            connection.setRequestProperty("User-Agent", "Prayerapp-recovery-hash-probe/1.0");
            connection.setRequestProperty("Accept", "audio/mpeg,audio/*;q=0.9,*/*;q=0.1");
            int status = connection.getResponseCode();
            if (status / 100 != 2) throw new AssertionError(item.getKey() + " HTTP " + status);
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            long size = 0;
            try (BufferedInputStream input = new BufferedInputStream(connection.getInputStream())) {
                byte[] buffer = new byte[16_384];
                int count;
                while ((count = input.read(buffer)) != -1) {
                    size += count;
                    if (size > 20L * 1024 * 1024) throw new AssertionError(item.getKey() + " exceeds size limit");
                    digest.update(buffer, 0, count);
                }
            } finally {
                connection.disconnect();
            }
            StringBuilder hash = new StringBuilder(64);
            for (byte value : digest.digest()) hash.append(String.format("%02x", value));
            report.append(item.getKey()).append('|')
                    .append(size).append('|')
                    .append(hash).append('|')
                    .append(connection.getContentType()).append('\n');
        }
        throw new AssertionError(report.toString());
    }
}
