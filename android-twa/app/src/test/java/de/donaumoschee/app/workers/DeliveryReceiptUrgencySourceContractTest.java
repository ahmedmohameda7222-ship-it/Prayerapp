package de.donaumoschee.app.workers;

import org.junit.Test;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.Assert.assertTrue;

public final class DeliveryReceiptUrgencySourceContractTest {
    private static String nativeWorkSource() throws IOException {
        Path project = Path.of(System.getProperty("user.dir"));
        Path direct = project.resolve("src/main/java/de/donaumoschee/app/workers/NativeWork.java");
        Path nested = project.resolve("app/src/main/java/de/donaumoschee/app/workers/NativeWork.java");
        Path source = Files.exists(direct) ? direct : nested;
        return new String(Files.readAllBytes(source), StandardCharsets.UTF_8);
    }

    @Test
    public void deliveryReceiptFlushUsesExpeditedWorkWithDurableFallback() throws IOException {
        String source = nativeWorkSource();
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
}
