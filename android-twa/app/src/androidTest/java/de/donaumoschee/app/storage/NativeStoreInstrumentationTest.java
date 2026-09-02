package de.donaumoschee.app.storage;

import android.content.Context;
import android.content.SharedPreferences;

import androidx.test.core.app.ApplicationProvider;
import androidx.test.ext.junit.runners.AndroidJUnit4;

import de.donaumoschee.app.prayer.DeliveryReceiptQueue;
import de.donaumoschee.app.prayer.DeliveryRecord;
import de.donaumoschee.app.prayer.DeliveryState;

import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;

import java.util.List;
import java.util.Set;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

@RunWith(AndroidJUnit4.class)
public final class NativeStoreInstrumentationTest {
    private static final String PREFERENCES = "native-prayer-engine-v1";
    private static final String EVENT_ID = "p2:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    private static final long DUE_AT_MS = 1_700_000_000_000L;

    private Context context;

    @Before
    public void setUp() {
        context = ApplicationProvider.getApplicationContext();
        clearNativeState();
    }

    @After
    public void tearDown() {
        clearNativeState();
    }

    @Test
    public void deliveredReceiptPersistsAcrossStoreInstancesUntilAcknowledged() {
        NativeStore store = new NativeStore(context);
        int generation = store.accountGeneration();

        assertTrue(store.markDeliveryScheduled(EVENT_ID, "REMINDER", DUE_AT_MS));
        assertTrue(store.beginDelivery(EVENT_ID, "REMINDER", DUE_AT_MS, DUE_AT_MS + 1_000L));
        assertTrue(store.markDeliveryDelivered(EVENT_ID, DUE_AT_MS + 2_000L));

        NativeStore reopened = new NativeStore(context);
        DeliveryRecord record = reopened.deliveryRecord(EVENT_ID);
        assertNotNull(record);
        assertEquals(DeliveryState.DELIVERED, record.state());

        List<DeliveryReceiptQueue.Receipt> pending = reopened.pendingDeliveryReceipts(generation);
        assertEquals(1, pending.size());
        assertEquals(EVENT_ID, pending.get(0).eventId);
        assertEquals("reminder", pending.get(0).kind);
        assertEquals(generation, pending.get(0).accountGeneration);

        assertTrue(reopened.acknowledgeDeliveryReceipt(EVENT_ID, generation));
        assertTrue(new NativeStore(context).pendingDeliveryReceipts(generation).isEmpty());
    }

    @Test
    public void accountResetSequenceClearsAccountScopedStateAndPreservesRevocationProof() {
        NativeStore store = new NativeStore(context);
        int originalGeneration = store.accountGeneration();
        String authorityId = "123e4567-e89b-12d3-a456-426614174000";

        assertTrue(store.bindAuthorityId(authorityId));
        store.setScheduledRequestCodes(Set.of(originalGeneration + "|17|" + EVENT_ID));
        assertTrue(store.markDeliveryScheduled(EVENT_ID, "REMINDER", DUE_AT_MS));
        assertTrue(store.beginDelivery(EVENT_ID, "REMINDER", DUE_AT_MS, DUE_AT_MS + 1_000L));
        assertTrue(store.markDeliveryDelivered(EVENT_ID, DUE_AT_MS + 2_000L));

        int nextGeneration = store.resetAccountStateAndQueueAuthorityRevocation();
        store.clearAccountState();

        NativeStore reopened = new NativeStore(context);
        assertEquals(originalGeneration + 1, nextGeneration);
        assertEquals(nextGeneration, reopened.accountGeneration());
        assertEquals("", reopened.authorityId());
        assertNull(reopened.deliveryRecord(EVENT_ID));
        assertTrue(reopened.pendingDeliveryReceipts(originalGeneration).isEmpty());
        assertTrue(reopened.pendingDeliveryReceipts(nextGeneration).isEmpty());
        assertTrue(reopened.scheduledRequestCodes().isEmpty());

        NativeStore.PendingAuthorityRevocation pending = reopened.pendingAuthorityRevocation();
        assertNotNull(pending);
        assertEquals(authorityId, pending.authorityId);
        assertEquals(nextGeneration, pending.targetGeneration);
    }

    @Test
    public void plaintextCredentialMigratesWithoutRotationAndLegacyValueIsRemoved() {
        String legacyCredential = "legacy-native-authority-credential";
        SharedPreferences preferences = context.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE);
        assertTrue(preferences.edit().putString("credential", legacyCredential).commit());

        NativeStore store = new NativeStore(context);
        assertEquals(legacyCredential, store.credential());
        assertFalse(preferences.contains("credential"));
        assertTrue(preferences.contains("credential-encrypted-v1"));
        assertTrue(preferences.contains("credential-encrypted-v1-iv"));
        assertEquals(legacyCredential, new NativeStore(context).credential());
    }

    private void clearNativeState() {
        context.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE)
                .edit()
                .clear()
                .commit();
    }
}
