package de.donaumoschee.app.prayer;

import org.junit.Test;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

public final class DeliverySourceContractTest {
    private static Path sourcePath(String relativePath) {
        Path project = Path.of(System.getProperty("user.dir"));
        Path direct = project.resolve("src/main/java").resolve(relativePath);
        Path nested = project.resolve("app/src/main/java").resolve(relativePath);
        return Files.exists(direct) ? direct : nested;
    }

    private static String source(String relativePath) throws IOException {
        return new String(Files.readAllBytes(sourcePath(relativePath)), StandardCharsets.UTF_8);
    }

    private static boolean sourceExists(String relativePath) {
        return Files.exists(sourcePath(relativePath));
    }

    @Test
    public void schedulerPersistsScheduledDeliveryBeforeAlarmCanFire() throws IOException {
        String scheduler = source("de/donaumoschee/app/prayer/PrayerScheduler.java");

        assertTrue(scheduler.contains("EXTRA_DUE_AT_MS"));
        assertTrue(scheduler.contains("markDeliveryScheduled("));
        assertTrue(scheduler.contains("event.dueAt.toEpochMilli()"));
    }

    @Test
    public void schedulerTracksRollbackBeforeExactAlarmInstallCanThrow() throws IOException {
        String scheduler = source("de/donaumoschee/app/prayer/PrayerScheduler.java");
        int methodStart = scheduler.indexOf("private static boolean scheduleCurrentGeneration");
        int methodEnd = scheduler.indexOf("public static String scheduleTest", methodStart);
        assertTrue(methodStart >= 0);
        assertTrue(methodEnd > methodStart);

        String scheduleMethod = scheduler.substring(methodStart, methodEnd);
        int scheduled = scheduleMethod.indexOf("markDeliveryScheduled(");
        int tracked = scheduleMethod.indexOf("installedByThisCall.add(encodeScheduledRequest(generation, event))");
        int install = scheduleMethod.indexOf("manager.setExactAndAllowWhileIdle(");

        assertTrue(scheduled >= 0);
        assertTrue(tracked > scheduled);
        assertTrue(install > tracked);
    }

    @Test
    public void schedulerFailsClosedWhenScheduleFinalizationCannotPersist() throws IOException {
        String scheduler = source("de/donaumoschee/app/prayer/PrayerScheduler.java");
        int methodStart = scheduler.indexOf("private static boolean scheduleCurrentGeneration");
        int methodEnd = scheduler.indexOf("public static String scheduleTest", methodStart);
        assertTrue(methodStart >= 0);
        assertTrue(methodEnd > methodStart);

        String scheduleMethod = scheduler.substring(methodStart, methodEnd);
        int finalize = scheduleMethod.indexOf("!store.addScheduledRequestCodesIfGeneration");
        int failClosed = scheduleMethod.indexOf(
                "store.markScheduleFailureIfGeneration(\"alarm-schedule-finalize-failed\", generation)",
                finalize
        );

        assertTrue(finalize >= 0);
        assertTrue(failClosed > finalize);
    }

    @Test
    public void testAlarmTracksRollbackBeforeInstallAndCleansRuntimeFailure() throws IOException {
        String scheduler = source("de/donaumoschee/app/prayer/PrayerScheduler.java");
        int methodStart = scheduler.indexOf("public static String scheduleTest");
        int methodEnd = scheduler.indexOf("public static void cancelAll", methodStart);
        assertTrue(methodStart >= 0);
        assertTrue(methodEnd > methodStart);

        String testMethod = scheduler.substring(methodStart, methodEnd);
        int scheduled = testMethod.indexOf("markDeliveryScheduled(");
        int tracked = testMethod.indexOf("Set<String> requestCodes = Set.of(encodeScheduledRequest(generation, event))");
        int install = testMethod.indexOf("manager.setExactAndAllowWhileIdle(");

        assertTrue(scheduled >= 0);
        assertTrue(tracked > scheduled);
        assertTrue(install > tracked);
        assertTrue(testMethod.contains("catch (RuntimeException error)"));
        assertTrue(testMethod.contains("cancelRequests(context, store, requestCodes)"));
    }

    @Test
    public void schedulerPersistsCancellationWhenStoredAlarmIsRemoved() throws IOException {
        String scheduler = source("de/donaumoschee/app/prayer/PrayerScheduler.java");
        String store = source("de/donaumoschee/app/storage/NativeStore.java");

        assertTrue(store.contains("cancelDeliveryScheduled("));
        assertTrue(scheduler.contains("store.cancelDeliveryScheduled(request.eventId"));
        assertTrue(scheduler.contains("cancelRequest(context, store, request)"));
    }

    @Test
    public void deliveryLedgerPersistenceFailureRevokesEngineHealth() throws IOException {
        String store = source("de/donaumoschee/app/storage/NativeStore.java");
        int methodStart = store.indexOf("private boolean persistDeliveryLedgerLocked");
        int methodEnd = store.indexOf("private boolean legacyDeliveredLocked", methodStart);
        assertTrue(methodStart >= 0);
        assertTrue(methodEnd > methodStart);

        String persistMethod = store.substring(methodStart, methodEnd);
        assertTrue(persistMethod.contains("boolean persisted ="));
        assertTrue(persistMethod.contains("if (!persisted)"));
        assertTrue(persistMethod.contains("putBoolean(ENGINE_HEALTHY, false)"));
        assertTrue(persistMethod.contains("delivery-ledger-persist-failed"));
    }

    @Test
    public void deliveredLedgerAndReceiptQueuePersistTogether() throws IOException {
        String store = source("de/donaumoschee/app/storage/NativeStore.java");
        int methodStart = store.indexOf("public boolean markDeliveryDelivered");
        int methodEnd = store.indexOf("public boolean markDeliveryFailed", methodStart);
        assertTrue(methodStart >= 0);
        assertTrue(methodEnd > methodStart);

        String deliveredMethod = store.substring(methodStart, methodEnd);
        assertTrue(store.contains("DELIVERY_RECEIPTS"));
        assertTrue(store.contains("DeliveryReceiptQueue"));
        assertTrue(deliveredMethod.contains("ledger.markDelivered"));
        assertTrue(deliveredMethod.contains("receiptQueue.enqueue"));
        assertTrue(deliveredMethod.contains("persistDeliveredAndReceiptQueueLocked"));
        assertTrue(store.contains("pendingDeliveryReceipts("));
        assertTrue(store.contains("acknowledgeDeliveryReceipt("));
    }

    @Test
    public void accountResetAndClearDropOldGenerationReceipts() throws IOException {
        String store = source("de/donaumoschee/app/storage/NativeStore.java");
        assertTrue(store.contains(".remove(DELIVERY_RECEIPTS)"));
        assertTrue(store.contains("advanceAccountGenerationLocked"));
    }

    @Test
    public void receiptWorkerAndRepairHooksExist() throws IOException {
        assertTrue(sourceExists("de/donaumoschee/app/workers/DeliveryReceiptWorker.java"));
        String nativeWork = source("de/donaumoschee/app/workers/NativeWork.java");
        String repair = source("de/donaumoschee/app/system/ScheduleRepairReceiver.java");
        String receiver = source("de/donaumoschee/app/prayer/PrayerAlarmReceiver.java");
        String adhan = source("de/donaumoschee/app/adhan/AdhanPlaybackService.java");

        assertTrue(nativeWork.contains("flushReceipts("));
        assertTrue(repair.contains("Intent.ACTION_DATE_CHANGED"));
        assertTrue(repair.contains("NativeWork.flushReceipts(context)"));
        assertTrue(receiver.contains("NativeWork.flushReceipts(context)"));
        assertTrue(adhan.contains("NativeWork.flushReceipts(AdhanPlaybackService.this)"));
    }

    @Test
    public void applicationCreatesBothReminderAndAdhanChannelsUpFront() throws IOException {
        String notifications = source("de/donaumoschee/app/prayer/PrayerNotifications.java");

        assertTrue(notifications.contains("AdhanPlaybackService.CHANNEL"));
        assertTrue(notifications.contains("channel_adhan_playback"));
        assertTrue(notifications.contains("createNotificationChannel(adhan"));
    }

    @Test
    public void receiverDoesNotClaimReminderDeliveryBeforeNotificationSucceeds() throws IOException {
        String receiver = source("de/donaumoschee/app/prayer/PrayerAlarmReceiver.java");

        assertFalse(receiver.contains("markDelivered(eventId)"));
        int begin = receiver.indexOf("beginDelivery(");
        int notify = receiver.indexOf("PrayerNotifications.showReminder(");
        int delivered = receiver.indexOf("markDeliveryDelivered(");
        int failed = receiver.indexOf("markDeliveryFailed(");

        assertTrue(begin >= 0);
        assertTrue(notify > begin);
        assertTrue(delivered > notify);
        assertTrue(failed > notify);
    }

    @Test
    public void receiverFailsClosedWhenAdhanFailureStateCannotPersist() throws IOException {
        String receiver = source("de/donaumoschee/app/prayer/PrayerAlarmReceiver.java");

        assertTrue(receiver.contains("unsupported-delivery-failure-persist-failed"));
        assertTrue(receiver.contains("adhan-delivery-unavailable-persist-failed"));
        assertTrue(receiver.contains("adhan-service-start-failure-persist-failed"));
    }

    @Test
    public void adhanServiceAcknowledgesActualPlaybackAndFailure() throws IOException {
        String service = source("de/donaumoschee/app/adhan/AdhanPlaybackService.java");

        assertTrue(service.contains("onIsPlayingChanged"));
        assertTrue(service.contains("markDeliveryDelivered("));
        assertTrue(service.contains("markDeliveryFailed("));
    }
}
