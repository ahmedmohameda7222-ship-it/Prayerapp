package de.donaumoschee.app.adhan;

import android.content.Context;
import android.system.ErrnoException;
import android.system.Os;

import java.io.BufferedInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Locale;

public final class AudioCache {
    private static final long MAX_AUDIO_BYTES = 20L * 1024 * 1024;

    private AudioCache() {}

    public static File verifiedFile(Context context, String soundId) {
        if (!AdhanCatalog.isApproved(soundId)) return null;
        String expectedSha256 = AdhanCatalog.approvedSha256(soundId);
        if (expectedSha256 == null) return null;
        File audio = AdhanCatalog.audioFile(context.getFilesDir(), soundId);
        if (!audio.isFile() || audio.length() <= 0 || audio.length() > MAX_AUDIO_BYTES) return null;
        try {
            return expectedSha256.equals(sha256(audio)) ? audio : null;
        } catch (IOException error) {
            return null;
        }
    }

    public static boolean download(Context context, String soundId) {
        if (!AdhanCatalog.isApproved(soundId)) return false;
        String expectedSha256 = AdhanCatalog.approvedSha256(soundId);
        if (expectedSha256 == null) return false;
        HttpURLConnection connection = null;
        File target = AdhanCatalog.audioFile(context.getFilesDir(), soundId);
        File directory = target.getParentFile();
        if (directory == null || (!directory.isDirectory() && !directory.mkdirs())) return false;
        File temporary = new File(directory, soundId + ".download");
        try {
            connection = (HttpURLConnection) new URL(AdhanCatalog.approvedUrl(soundId)).openConnection();
            connection.setConnectTimeout(10_000);
            connection.setReadTimeout(30_000);
            connection.setInstanceFollowRedirects(false);
            connection.setRequestProperty("Accept", "audio/mpeg,audio/*;q=0.9");
            if (connection.getResponseCode() / 100 != 2) return false;
            String contentType = connection.getContentType();
            if (contentType == null || !contentType.toLowerCase(Locale.ROOT).startsWith("audio/")) return false;
            long declaredLength = connection.getContentLength();
            if (declaredLength > MAX_AUDIO_BYTES) return false;
            long total = 0;
            try (BufferedInputStream input = new BufferedInputStream(connection.getInputStream());
                 FileOutputStream output = new FileOutputStream(temporary, false)) {
                byte[] buffer = new byte[16_384];
                int count;
                while ((count = input.read(buffer)) != -1) {
                    total += count;
                    if (total > MAX_AUDIO_BYTES) throw new IOException("Adhan audio exceeds size limit");
                    output.write(buffer, 0, count);
                }
                output.getFD().sync();
            }
            if (total == 0) return false;
            if (!expectedSha256.equals(sha256(temporary))) return false;
            Os.rename(temporary.getAbsolutePath(), target.getAbsolutePath());
            return verifiedFile(context, soundId) != null;
        } catch (IOException | ErrnoException error) {
            return false;
        } finally {
            if (connection != null) connection.disconnect();
            if (temporary.exists()) temporary.delete();
        }
    }

    private static String sha256(File file) throws IOException {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            try (FileInputStream input = new FileInputStream(file)) {
                byte[] buffer = new byte[16_384];
                int count;
                while ((count = input.read(buffer)) != -1) digest.update(buffer, 0, count);
            }
            StringBuilder value = new StringBuilder(64);
            for (byte item : digest.digest()) value.append(String.format("%02x", item));
            return value.toString();
        } catch (NoSuchAlgorithmException error) {
            throw new IOException("SHA-256 unavailable", error);
        }
    }
}
