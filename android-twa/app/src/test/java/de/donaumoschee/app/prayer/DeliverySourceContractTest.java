package de.donaumoschee.app.prayer;

import org.junit.Test;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

public final class DeliverySourceContractTest {
    private static String source(String relativePath) throws IOException {
        Path project = Path.of(System.getProperty("user.dir"));
        Path direct = project.resolve("src/main/java").resolve(relativePath);
        Path nested = project.resolve("app/src/main/java").resolve(relativePath);
        Path file = Files.exists(direct) ? direct : nested;
        return new String(Files.readAllBytes(file), StandardCharsets.UTF_8);
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
        int methodEnd = scheduler.indexOf("public static boolean scheduleTest", methodStart);
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
        int methodEnd = scheduler.indexOf("public static boolean scheduleTest", methodStart);
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
        int methodStart = scheduler.indexOf("public static boolean scheduleTest");
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
