package de.donaumoschee.app.prayer;

import org.json.JSONObject;
import org.junit.Test;

import java.lang.reflect.Method;
import java.util.List;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;
import static org.junit.Assert.fail;

public final class DeliveryReceiptQueueTest {
    private static final String EVENT_A = "p2:" + "a".repeat(64);
    private static final String EVENT_B = "p2:" + "b".repeat(64);

    @Test
    public void queuesCanonicalReceiptsPerGenerationAndAcknowledgesIdempotently() {
        try {
            Class<?> queueClass = Class.forName("de.donaumoschee.app.prayer.DeliveryReceiptQueue");
            Object queue = queueClass.getConstructor(int.class).newInstance(4);
            Method enqueue = queueClass.getMethod("enqueue", String.class, String.class, long.class, int.class);
            Method pending = queueClass.getMethod("pending", int.class);
            Method acknowledge = queueClass.getMethod("acknowledge", String.class, int.class);

            assertTrue((Boolean) enqueue.invoke(queue, EVENT_A, "reminder", 1000L, 7));
            assertTrue((Boolean) enqueue.invoke(queue, EVENT_A, "reminder", 1000L, 7));
            assertFalse((Boolean) enqueue.invoke(queue, "legacy:event", "reminder", 1000L, 7));
            assertFalse((Boolean) enqueue.invoke(queue, EVENT_B, "invalid", 1000L, 7));

            assertEquals(1, ((List<?>) pending.invoke(queue, 7)).size());
            assertTrue(((List<?>) pending.invoke(queue, 8)).isEmpty());
            assertFalse((Boolean) acknowledge.invoke(queue, EVENT_A, 8));
            assertTrue((Boolean) acknowledge.invoke(queue, EVENT_A, 7));
            assertTrue(((List<?>) pending.invoke(queue, 7)).isEmpty());
        } catch (ReflectiveOperationException error) {
            fail("Receipt queue contract missing: " + error);
        }
    }

    @Test
    public void receiptQueueRoundTripsWithoutCrossGenerationLeakage() {
        try {
            Class<?> queueClass = Class.forName("de.donaumoschee.app.prayer.DeliveryReceiptQueue");
            Object queue = queueClass.getConstructor(int.class).newInstance(4);
            Method enqueue = queueClass.getMethod("enqueue", String.class, String.class, long.class, int.class);
            Method pending = queueClass.getMethod("pending", int.class);
            Method toJson = queueClass.getMethod("toJson");
            Method fromJson = queueClass.getMethod("fromJson", JSONObject.class, int.class);

            assertTrue((Boolean) enqueue.invoke(queue, EVENT_A, "adhan", 2000L, 3));
            assertTrue((Boolean) enqueue.invoke(queue, EVENT_B, "reminder", 3000L, 4));
            JSONObject encoded = (JSONObject) toJson.invoke(queue);
            Object decoded = fromJson.invoke(null, encoded, 4);

            assertEquals(1, ((List<?>) pending.invoke(decoded, 3)).size());
            assertEquals(1, ((List<?>) pending.invoke(decoded, 4)).size());
        } catch (ReflectiveOperationException error) {
            fail("Receipt queue persistence contract missing: " + error);
        }
    }
}
