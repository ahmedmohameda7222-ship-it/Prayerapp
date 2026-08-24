package de.donaumoschee.app.bridge;

import org.junit.Test;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

public final class NativeTestDeliveryBridgeSourceContractTest {
    private static Path sourcePath(String relativePath) {
        Path project = Path.of(System.getProperty("user.dir"));
        Path direct = project.resolve("src/main/java").resolve(relativePath);
        Path nested = project.resolve("app/src/main/java").resolve(relativePath);
        return Files.exists(direct) ? direct : nested;
    }

    private static String source(String relativePath) throws IOException {
        return Files.readString(sourcePath(relativePath), StandardCharsets.UTF_8);
    }

    @Test
    public void schedulerReturnsTheDurableTestEventIdentity() throws IOException {
        String scheduler = source("de/donaumoschee/app/prayer/PrayerScheduler.java");
        int start = scheduler.indexOf("public static String scheduleTest");
        int end = scheduler.indexOf("public static void cancelAll", start);

        assertTrue(start >= 0);
        assertTrue(end > start);
        String method = scheduler.substring(start, end);
        assertTrue(method.contains("return event.eventId"));
        assertFalse(method.contains("return true;"));
    }

    @Test
    public void bridgeSeparatesScheduleAcceptanceFromDeliveryResult() throws IOException {
        String bridge = source("de/donaumoschee/app/bridge/BridgeHandler.java");

        assertTrue(bridge.contains("case \"native.test.status\": testStatus(envelope.payload); break;"));
        assertTrue(bridge.contains("send(\"native.test.accepted\""));
        assertTrue(bridge.contains("store.deliveryRecord(eventId)"));
        assertTrue(bridge.contains("NativeTestDeliveryStatus.from(record)"));
        assertFalse(bridge.contains(".put(\"success\", scheduled)"));
    }

    @Test
    public void bridgeOnlyAllowsStatusLookupForNativeTestEvents() throws IOException {
        String bridge = source("de/donaumoschee/app/bridge/BridgeHandler.java");

        assertTrue(bridge.contains("eventId.startsWith(\"test:\")"));
        assertTrue(bridge.contains("throw new JSONException(\"Invalid test event id\")"));
    }
}