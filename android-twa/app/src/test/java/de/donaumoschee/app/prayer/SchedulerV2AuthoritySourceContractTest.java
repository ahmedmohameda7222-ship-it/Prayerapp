package de.donaumoschee.app.prayer;

import org.junit.Test;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.Assert.assertTrue;

public final class SchedulerV2AuthoritySourceContractTest {
    private static Path projectRoot() {
        Path cwd = Path.of(System.getProperty("user.dir"));
        return Files.exists(cwd.resolve("app/src/main")) ? cwd : cwd.resolve("android-twa");
    }

    private static String read(Path path) throws IOException {
        return new String(Files.readAllBytes(path), StandardCharsets.UTF_8);
    }

    private static String javaSource(String relativePath) throws IOException {
        return read(projectRoot().resolve("app/src/main/java").resolve(relativePath));
    }

    @Test
    public void repairReceiverIsActuallyRegisteredForDateChanges() throws IOException {
        String manifest = read(projectRoot().resolve("app/src/main/AndroidManifest.xml"));
        assertTrue(manifest.contains("android.intent.action.DATE_CHANGED"));
    }

    @Test
    public void nativeStatusAdvertisesReceiptV2AndCurrentGeneration() throws IOException {
        String status = javaSource("de/donaumoschee/app/prayer/NativeStatus.java");
        assertTrue(status.contains("delivery-receipt-v2"));
        assertTrue(status.contains(".put(\"accountGeneration\", store.accountGeneration())"));
    }

    @Test
    public void heartbeatSendsReceiptCapabilityAndNeverInventsGeneration() throws IOException {
        String worker = javaSource("de/donaumoschee/app/workers/NativeRefreshWorker.java");
        assertTrue(worker.contains(".put(\"receiptV2\", true)"));
        assertTrue(worker.contains(".put(\"accountGeneration\", generation)"));
    }
}
