package de.donaumoschee.app.adhan;

import android.content.Context;

import java.io.BufferedInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Locale;

public final class AudioCache {
    private static final long MAX_AUDIO_BYTES = 20L * 1024 * 1024;

    private AudioCache() {}

    public static File verifiedFile(Context context, String soundId) {
        File audio = AdhanCatalog.audioFile(context.getFilesDir(), soundId);
        File digest = new File(audio.getPath() + ".sha256");
        if (!audio.isFile() || !digest.isFile() || audio.length() <= 0 || audio.length() > MAX_AUDIO_BYTES) return null;
        try {
            String expected = new String(readBounded(digest, 128), StandardCharsets.US_ASCII).trim();
            return expected.equals(sha256(audio)) ? audio : null;
        } catch (IOException error) {
            return null;
        }
    }

    public static boolean download(Context context, String soundId) {
        if (!AdhanCatalog.isApproved(soundId)) return false;
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
            String hash = sha256(temporary);
            if (target.exists() && !target.delete()) return false;
            if (!temporary.renameTo(target)) return false;
            File digest = new File(target.getPath() + ".sha256");
            try (FileOutputStream output = new FileOutputStream(digest, false)) {
                output.write(hash.getBytes(StandardCharsets.US_ASCII));
                output.getFD().sync();
            }
            return verifiedFile(context, soundId) != null;
        } catch (IOException error) {
            return false;
        } finally {
            if (connection != null) connection.disconnect();
            if (temporary.exists()) temporary.delete();
        }
    }

    private static byte[] readBounded(File file, int maxBytes) throws IOException {
        if (file.length() > maxBytes) throw new IOException("File too large");
        byte[] bytes = new byte[(int) file.length()];
        try (FileInputStream input = new FileInputStream(file)) {
            int offset = 0;
            while (offset < bytes.length) {
                int count = input.read(bytes, offset, bytes.length - offset);
                if (count < 0) break;
                offset += count;
            }
            if (offset != bytes.length) throw new IOException("Incomplete read");
        }
        return bytes;
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
