package de.donaumoschee.app.bridge;

import de.donaumoschee.app.prayer.DeliveryRecord;
import org.junit.Test;

import java.lang.reflect.Method;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

public final class NativeTestDeliveryStatusTest {
    private Object from(DeliveryRecord record) throws Exception {
        Class<?> type = Class.forName("de.donaumoschee.app.bridge.NativeTestDeliveryStatus");
        Method from = type.getMethod("from", DeliveryRecord.class);
        return from.invoke(null, record);
    }

    private Object value(Object status, String method) throws Exception {
        return status.getClass().getMethod(method).invoke(status);
    }

    @Test
    public void scheduledAndFiringStatesAreNonTerminalAndNeverSuccessful() throws Exception {
        DeliveryRecord scheduled = DeliveryRecord.schedule("test:one", "REMINDER", 1_000L);
        Object scheduledStatus = from(scheduled);
        assertEquals("scheduled", value(scheduledStatus, "state"));
        assertFalse((boolean) value(scheduledStatus, "terminal"));
        assertFalse((boolean) value(scheduledStatus, "success"));

        Object firingStatus = from(scheduled.fire(1_100L));
        assertEquals("firing", value(firingStatus, "state"));
        assertFalse((boolean) value(firingStatus, "terminal"));
        assertFalse((boolean) value(firingStatus, "success"));
    }

    @Test
    public void deliveredIsTheOnlySuccessfulTerminalState() throws Exception {
        DeliveryRecord delivered = DeliveryRecord
                .schedule("test:two", "ADHAN", 2_000L)
                .fire(2_100L)
                .markDelivered(2_200L);
        Object status = from(delivered);

        assertEquals("delivered", value(status, "state"));
        assertTrue((boolean) value(status, "terminal"));
        assertTrue((boolean) value(status, "success"));
        assertEquals("", value(status, "failureCode"));
    }

    @Test
    public void failedIsTerminalButNeverSuccessfulAndPreservesFailureCode() throws Exception {
        DeliveryRecord failed = DeliveryRecord
                .schedule("test:three", "ADHAN", 3_000L)
                .fire(3_100L)
                .markFailed("adhan-playback-failed", 3_200L);
        Object status = from(failed);

        assertEquals("failed", value(status, "state"));
        assertTrue((boolean) value(status, "terminal"));
        assertFalse((boolean) value(status, "success"));
        assertEquals("adhan-playback-failed", value(status, "failureCode"));
    }
}