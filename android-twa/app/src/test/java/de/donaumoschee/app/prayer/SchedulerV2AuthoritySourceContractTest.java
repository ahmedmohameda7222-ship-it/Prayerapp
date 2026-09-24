package de.donaumoschee.app.prayer;

import org.junit.Test;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.Assert.assertTrue;

public final class SchedulerV2AuthoritySourceContractTest {
    private static Path project() {
        return Path.of(System.getProperty("user.dir"));
    }

    private static String read(Path path) throws IOException {
        return new String(Files.readAllBytes(path), StandardCharsets.UTF_8);
    }

    private static String javaSource(String relativePath) throws IOException {
        Path direct = project().resolve("src/main/java").resolve(relativePath);
        Path nested = project().resolve("app/src/main/java").resolve(relativePath);
        return read(Files.exists(direct) ? direct : nested);
    }

    private static String manifestSource() throws IOException {
        Path direct = project().resolve("src/main/AndroidManifest.xml");
        Path nested = project().resolve("app/src/main/AndroidManifest.xml");
        return read(Files.exists(direct) ? direct : nested);
    }

    @Test
    public void repairReceiverIsActuallyRegisteredForDateChanges() throws IOException {
        String manifest = manifestSource();
        assertTrue(manifest.contains("android.intent.action.DATE_CHANGED"));
    }

    @Test
    public void rescheduleValidatesPersistedConfigBeforeCancellingInstalledAlarms() throws IOException {
        String scheduler = javaSource("de/donaumoschee/app/prayer/PrayerScheduler.java");
        int loadConfig = scheduler.indexOf("NativeConfig config = store.loadConfig(Instant.now());");
        int cancelStored = scheduler.indexOf("if (!cancelStored(context, store, generation)) return false;");

        assertTrue(loadConfig >= 0);
        assertTrue(cancelStored > loadConfig);
        assertTrue(scheduler.contains("alarm.schedule preserve-existing reason=config-unavailable"));
        assertTrue(scheduler.contains("scheduleCurrentGeneration(context, store, generation, config)"));
    }

    @Test
    public void configReplacementAndAlarmInstallationShareOneSchedulerLock() throws IOException {
        String scheduler = javaSource("de/donaumoschee/app/prayer/PrayerScheduler.java");
        String bridge = javaSource("de/donaumoschee/app/bridge/BridgeHandler.java");
        String worker = javaSource("de/donaumoschee/app/workers/NativeRefreshWorker.java");

        assertTrue(scheduler.contains("private static final Object SCHEDULE_LOCK = new Object();"));
        assertTrue(scheduler.contains("replaceConfigAndReschedule("));
        assertTrue(scheduler.contains("synchronized (SCHEDULE_LOCK)"));
        assertTrue(scheduler.contains("store.saveConfigIfGeneration(config.source, now, generation)"));
        assertTrue(bridge.contains("PrayerScheduler.replaceConfigAndReschedule(context, payload, Instant.now())"));
        assertTrue(!bridge.contains("store.saveConfig(payload"));
        assertTrue(worker.contains("PrayerScheduler.replaceConfigAndReschedule("));
        assertTrue(!worker.contains("store.saveConfigIfGeneration(config"));
    }

    @Test
    public void workerRejectsStaleConfigSnapshotsBeforeReplacingAlarms() throws IOException {
        String scheduler = javaSource("de/donaumoschee/app/prayer/PrayerScheduler.java");
        String worker = javaSource("de/donaumoschee/app/workers/NativeRefreshWorker.java");
        String store = javaSource("de/donaumoschee/app/storage/NativeStore.java");

        assertTrue(store.contains("public String rawConfigSnapshot()"));
        assertTrue(worker.contains("String configSnapshot = store.rawConfigSnapshot();"));
        assertTrue(worker.contains("new JSONObject(configSnapshot)"));
        assertTrue(worker.contains("configSnapshot,"));
        assertTrue(scheduler.contains("String expectedConfigSnapshot"));
        assertTrue(scheduler.contains("String currentConfigSnapshot = store.rawConfigSnapshot();"));
        assertTrue(scheduler.contains("expectedConfigSnapshot.equals(currentConfigSnapshot)"));
    }

    @Test
    public void staleWorkerSnapshotPreservesLatestHealthyScheduleReadiness() throws IOException {
        String scheduler = javaSource("de/donaumoschee/app/prayer/PrayerScheduler.java");
        String worker = javaSource("de/donaumoschee/app/workers/NativeRefreshWorker.java");

        assertTrue(scheduler.contains("public final boolean staleConfigSnapshot;"));
        assertTrue(scheduler.contains("new ConfigInstallResult(false, false, true)"));
        assertTrue(worker.contains("replacement.staleConfigSnapshot"));
        assertTrue(worker.contains("scheduleRefreshed = PrayerScheduler.reschedule(getApplicationContext(), generation);"));
        assertTrue(worker.contains("sendHeartbeat(store, scheduleRefreshed, generation);"));
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
