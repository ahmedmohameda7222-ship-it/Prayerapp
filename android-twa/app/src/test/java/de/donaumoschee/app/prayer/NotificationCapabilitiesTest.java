package de.donaumoschee.app.prayer;

import org.junit.Test;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

public final class NotificationCapabilitiesTest {
    private static final int ENABLED = 3;
    private static final int DISABLED = 0;

    @Test
    public void pre33GlobalDisableBlocksDeliveryDespiteImplicitRuntimePermission() {
        NotificationCapabilities state = NotificationCapabilities.evaluate(32, true, false, ENABLED, ENABLED);
        assertTrue(state.notificationPermission());
        assertFalse(state.notificationDeliveryEnabled());
        assertFalse(state.nativeDeliveryReady());
    }

    @Test
    public void api33RuntimeDenialBlocksDelivery() {
        NotificationCapabilities state = NotificationCapabilities.evaluate(33, false, true, ENABLED, ENABLED);
        assertFalse(state.notificationPermission());
        assertFalse(state.notificationDeliveryEnabled());
        assertFalse(state.nativeDeliveryReady());
    }

    @Test
    public void globalAppDisableBlocksDelivery() {
        NotificationCapabilities state = NotificationCapabilities.evaluate(36, true, false, ENABLED, ENABLED);
        assertFalse(state.notificationDeliveryEnabled());
        assertFalse(state.nativeDeliveryReady());
    }

    @Test
    public void disabledReminderChannelBlocksNativeAuthority() {
        NotificationCapabilities state = NotificationCapabilities.evaluate(36, true, true, DISABLED, ENABLED);
        assertFalse(state.reminderChannelEnabled());
        assertFalse(state.nativeDeliveryReady());
    }

    @Test
    public void disabledAdhanChannelBlocksNativeAuthority() {
        NotificationCapabilities state = NotificationCapabilities.evaluate(36, true, true, ENABLED, DISABLED);
        assertFalse(state.adhanChannelEnabled());
        assertFalse(state.nativeDeliveryReady());
    }

    @Test
    public void allNotificationCapabilitiesEnabledAllowsNativeDelivery() {
        NotificationCapabilities state = NotificationCapabilities.evaluate(36, true, true, ENABLED, ENABLED);
        assertTrue(state.notificationPermission());
        assertTrue(state.notificationDeliveryEnabled());
        assertTrue(state.reminderChannelEnabled());
        assertTrue(state.adhanChannelEnabled());
        assertTrue(state.nativeDeliveryReady());
    }
}
