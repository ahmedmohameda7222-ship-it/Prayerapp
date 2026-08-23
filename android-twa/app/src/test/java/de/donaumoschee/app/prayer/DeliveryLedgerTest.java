package de.donaumoschee.app.prayer;

import org.junit.Test;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;

public final class DeliveryLedgerTest {
    @Test
    public void duplicateActiveOrDeliveredEventCannotBeginAgain() {
        DeliveryLedger ledger = new DeliveryLedger(4);
        assertTrue(ledger.schedule("event-1", "REMINDER", 1_000L));
        assertTrue(ledger.begin("event-1", "REMINDER", 1_000L, 1_010L));
        assertFalse(ledger.begin("event-1", "REMINDER", 1_000L, 1_020L));
        assertTrue(ledger.markDelivered("event-1", 1_030L));
        assertFalse(ledger.begin("event-1", "REMINDER", 1_000L, 1_040L));
    }

    @Test
    public void failedEventMayRetryButDeliveredEventMayNot() {
        DeliveryLedger ledger = new DeliveryLedger(4);
        assertTrue(ledger.begin("event-2", "ADHAN", 2_000L, 2_010L));
        assertTrue(ledger.markFailed("event-2", "playback-failed", 2_020L));
        assertTrue(ledger.begin("event-2", "ADHAN", 2_000L, 2_030L));
        assertTrue(ledger.markDelivered("event-2", 2_040L));
        assertFalse(ledger.begin("event-2", "ADHAN", 2_000L, 2_050L));
    }

    @Test
    public void retentionEvictsOldTerminalRecordsWithoutDeletingFreshActiveEvents() {
        DeliveryLedger ledger = new DeliveryLedger(3);

        assertTrue(ledger.begin("old-delivered", "REMINDER", 100L, 110L));
        assertTrue(ledger.markDelivered("old-delivered", 120L));
        assertTrue(ledger.schedule("fresh-scheduled", "REMINDER", 200L));
        assertTrue(ledger.begin("fresh-firing", "ADHAN", 300L, 310L));

        assertTrue(ledger.schedule("new-event", "REMINDER", 400L));

        assertEquals(3, ledger.size());
        assertFalse(ledger.contains("old-delivered"));
        assertNotNull(ledger.record("fresh-scheduled"));
        assertEquals(DeliveryState.SCHEDULED, ledger.record("fresh-scheduled").state());
        assertEquals(DeliveryState.FIRING, ledger.record("fresh-firing").state());
        assertEquals(DeliveryState.SCHEDULED, ledger.record("new-event").state());
    }

    @Test
    public void retentionRejectsNewEventWhenEveryRetainedRecordIsStillActive() {
        DeliveryLedger ledger = new DeliveryLedger(2);
        assertTrue(ledger.schedule("scheduled", "REMINDER", 100L));
        assertTrue(ledger.begin("firing", "ADHAN", 200L, 210L));

        assertFalse(ledger.schedule("would-overflow", "REMINDER", 300L));
        assertEquals(2, ledger.size());
        assertTrue(ledger.contains("scheduled"));
        assertTrue(ledger.contains("firing"));
    }
}
