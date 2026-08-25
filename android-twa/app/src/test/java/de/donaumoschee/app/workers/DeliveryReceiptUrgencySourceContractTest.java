package de.donaumoschee.app.workers;

import org.junit.Test;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.Assert.assertTrue;

public final class DeliveryReceiptUrgencySourceContractTest {
    private static String javaSource(String relativePath) throws IOException {
        Path project = Path.of(System.getProperty("user.dir"));
        Path direct = project.resolve("src/main/java").resolve(relativePath);
        Path nested = project.resolve("app/src/main/java").resolve(relativePath);
        Path source = Files.exists(direct) ? direct : nested;
        return new String(Files.readAllBytes(source), StandardCharsets.UTF_8);
    }

    @Test
    public void deliveryReceiptFlushUsesExpeditedWorkWithDurableFallback() throws IOException {
        String source = javaSource("de/donaumoschee/app/workers/NativeWork.java");
        int start = source.indexOf("public static void flushReceipts");
        int end = source.indexOf("public static void flushAuthorityRevocation", start);
        assertTrue(start >= 0);
        assertTrue(end > start);
        String flush = source.substring(start, end);

        assertTrue(source.contains("import androidx.work.OutOfQuotaPolicy;"));
        assertTrue(flush.contains("setRequiredNetworkType(NetworkType.CONNECTED)"));
        assertTrue(flush.contains(".setExpedited(OutOfQuotaPolicy.RUN_AS_NON_EXPEDITED_WORK_REQUEST)"));
        assertTrue(flush.contains("ExistingWorkPolicy.KEEP"));
    }

    @Test
    public void expeditedReceiptWorkerProvidesPreAndroid12ForegroundInfo() throws IOException {
        String worker = javaSource("de/donaumoschee/app/workers/DeliveryReceiptWorker.java");

        assertTrue(worker.contains("import androidx.work.ForegroundInfo;"));
        assertTrue(worker.contains("public ForegroundInfo getForegroundInfo()"));
        assertTrue(worker.contains("new ForegroundInfo("));
        assertTrue(worker.contains("NotificationChannel"));
        assertTrue(worker.contains("NotificationCompat.Builder"));
    }
}
