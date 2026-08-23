package de.donaumoschee.app.prayer;

import org.junit.Test;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

public final class NotificationCapabilitiesTest {
    private static final int ENABLED = 3;
    private static final int DISABLED = 0;
    private static final int MISSING = -1000;

    @Test
    public void pre33GlobalDisableBlocksDeliveryDespiteImplicitRuntimePermission() {
        NotificationCapabilities state = NotificationCapabilities.evaluate(32, true, false, ENABLED, ENABLED);
        assertTrue(state.notificationPermission());
        assertFalse(state.notificationDeliveryEnabled());
        assertFalse(state.adhanDeliveryReady());
        assertFalse(state.nativeDeliveryReady());
    }

    @Test
    public void api33RuntimeDenialBlocksDelivery() {
        NotificationCapabilities state = NotificationCapabilities.evaluate(33, false, true, ENABLED, ENABLED);
        assertFalse(state.notificationPermission());
        assertFalse(state.notificationDeliveryEnabled());
        assertFalse(state.adhanDeliveryReady());
        assertFalse(state.nativeDeliveryReady());
    }

    @Test
    public void globalAppDisableBlocksDelivery() {
        NotificationCapabilities state = NotificationCapabilities.evaluate(36, true, false, ENABLED, ENABLED);
        assertFalse(state.notificationDeliveryEnabled());
        assertFalse(state.adhanDeliveryReady());
        assertFalse(state.nativeDeliveryReady());
    }

    @Test
    public void disabledReminderChannelBlocksNativeAuthorityWithoutBlockingAdhanCapability() {
        NotificationCapabilities state = NotificationCapabilities.evaluate(36, true, true, DISABLED, ENABLED);
        assertFalse(state.reminderChannelEnabled());
        assertTrue(state.adhanDeliveryReady());
        assertFalse(state.nativeDeliveryReady());
    }

    @Test
    public void disabledAdhanChannelBlocksAdhanAndNativeAuthority() {
        NotificationCapabilities state = NotificationCapabilities.evaluate(36, true, true, ENABLED, DISABLED);
        assertFalse(state.adhanChannelEnabled());
        assertFalse(state.adhanDeliveryReady());
        assertFalse(state.nativeDeliveryReady());
    }

    @Test
    public void missingReminderChannelIsNotTreatedAsEnabled() {
        NotificationCapabilities state = NotificationCapabilities.evaluate(36, true, true, MISSING, ENABLED);
        assertFalse(state.reminderChannelEnabled());
        assertFalse(state.reminderDeliveryReady());
        assertFalse(state.nativeDeliveryReady());
    }

    @Test
    public void missingAdhanChannelIsNotTreatedAsEnabled() {
        NotificationCapabilities state = NotificationCapabilities.evaluate(36, true, true, ENABLED, MISSING);
        assertFalse(state.adhanChannelEnabled());
        assertFalse(state.adhanDeliveryReady());
        assertFalse(state.nativeDeliveryReady());
    }

    @Test
    public void allNotificationCapabilitiesEnabledAllowsNativeDelivery() {
        NotificationCapabilities state = NotificationCapabilities.evaluate(36, true, true, ENABLED, ENABLED);
        assertTrue(state.notificationPermission());
        assertTrue(state.notificationDeliveryEnabled());
        assertTrue(state.reminderChannelEnabled());
        assertTrue(state.adhanChannelEnabled());
        assertTrue(state.adhanDeliveryReady());
        assertTrue(state.nativeDeliveryReady());
    }
}
