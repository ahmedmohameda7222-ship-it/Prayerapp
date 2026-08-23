package de.donaumoschee.app.prayer;

import org.junit.Test;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

public final class DeliveryRecordTest {
    @Test
    public void deliveryMustPassThroughFiringBeforeItCanBeDelivered() {
        DeliveryRecord firing = DeliveryRecord.begin("event-1", "REMINDER", 1_000L, 1_050L);

        assertEquals(DeliveryState.FIRING, firing.state());
        assertEquals(1_000L, firing.dueAtMs());
        assertEquals(1_050L, firing.attemptedAtMs());
        assertEquals(0L, firing.deliveredAtMs());
        assertEquals("", firing.failureCode());

        DeliveryRecord delivered = firing.markDelivered(1_060L);
        assertEquals(DeliveryState.DELIVERED, delivered.state());
        assertEquals(1_060L, delivered.deliveredAtMs());
        assertFalse(delivered.canBeginAgain());
    }

    @Test
    public void failedAttemptRecordsReasonAndCanBeRetried() {
        DeliveryRecord firing = DeliveryRecord.begin("event-2", "ADHAN", 2_000L, 2_010L);
        DeliveryRecord failed = firing.markFailed("audio-playback-failed", 2_020L);

        assertEquals(DeliveryState.FAILED, failed.state());
        assertEquals("audio-playback-failed", failed.failureCode());
        assertTrue(failed.canBeginAgain());

        DeliveryRecord retry = failed.restart(2_030L);
        assertEquals(DeliveryState.FIRING, retry.state());
        assertEquals(2_030L, retry.attemptedAtMs());
        assertEquals("", retry.failureCode());
    }

    @Test(expected = IllegalStateException.class)
    public void deliveredRecordCannotBeFailedAfterSuccess() {
        DeliveryRecord.begin("event-3", "REMINDER", 3_000L, 3_010L)
                .markDelivered(3_020L)
                .markFailed("late-failure", 3_030L);
    }
}
