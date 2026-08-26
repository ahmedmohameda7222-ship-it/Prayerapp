package de.donaumoschee.app.prayer;

import org.junit.Test;

import java.lang.reflect.Method;

import static org.junit.Assert.assertEquals;
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
        NotificationCapabilities state = NotificationCapabilities.evaluate(37, true, false, ENABLED, ENABLED);
        assertFalse(state.notificationDeliveryEnabled());
        assertFalse(state.adhanDeliveryReady());
        assertFalse(state.nativeDeliveryReady());
    }

    @Test
    public void appNotificationSettingIsReportedIndependentlyFromRuntimePermission() throws Exception {
        NotificationCapabilities state = NotificationCapabilities.evaluate(37, false, true, ENABLED, ENABLED);
        Method method = state.getClass().getMethod("appNotificationsEnabled");
        assertEquals(Boolean.TRUE, method.invoke(state));
        assertFalse(state.notificationPermission());
        assertFalse(state.notificationDeliveryEnabled());
    }

    @Test
    public void disabledReminderChannelBlocksNativeAuthorityWithoutBlockingAdhanCapability() {
        NotificationCapabilities state = NotificationCapabilities.evaluate(37, true, true, DISABLED, ENABLED);
        assertFalse(state.reminderChannelEnabled());
        assertTrue(state.adhanDeliveryReady());
        assertFalse(state.nativeDeliveryReady());
    }

    @Test
    public void disabledAdhanChannelBlocksAdhanAndNativeAuthority() {
        NotificationCapabilities state = NotificationCapabilities.evaluate(37, true, true, ENABLED, DISABLED);
        assertFalse(state.adhanChannelEnabled());
        assertFalse(state.adhanDeliveryReady());
        assertFalse(state.nativeDeliveryReady());
    }

    @Test
    public void missingReminderChannelIsNotTreatedAsEnabled() {
        NotificationCapabilities state = NotificationCapabilities.evaluate(37, true, true, MISSING, ENABLED);
        assertFalse(state.reminderChannelEnabled());
        assertFalse(state.reminderDeliveryReady());
        assertFalse(state.nativeDeliveryReady());
    }

    @Test
    public void missingAdhanChannelIsNotTreatedAsEnabled() {
        NotificationCapabilities state = NotificationCapabilities.evaluate(37, true, true, ENABLED, MISSING);
        assertFalse(state.adhanChannelEnabled());
        assertFalse(state.adhanDeliveryReady());
        assertFalse(state.nativeDeliveryReady());
    }

    @Test
    public void allNotificationCapabilitiesEnabledAllowsNativeDelivery() {
        NotificationCapabilities state = NotificationCapabilities.evaluate(37, true, true, ENABLED, ENABLED);
        assertTrue(state.notificationPermission());
        assertTrue(state.notificationDeliveryEnabled());
        assertTrue(state.reminderChannelEnabled());
        assertTrue(state.adhanChannelEnabled());
        assertTrue(state.adhanDeliveryReady());
        assertTrue(state.nativeDeliveryReady());
    }

    @Test
    public void batteryOptimizationIsOnlyRelevantFromApi23AndDoesNotBecomeAReadinessGate() throws Exception {
        Class<?> diagnostics = Class.forName("de.donaumoschee.app.prayer.BatteryOptimizationDiagnostics");
        Method evaluate = diagnostics.getMethod("evaluate", int.class, boolean.class);

        Object pre23 = evaluate.invoke(null, 22, false);
        assertEquals(Boolean.FALSE, pre23.getClass().getMethod("relevant").invoke(pre23));
        assertEquals(Boolean.TRUE, pre23.getClass().getMethod("exempt").invoke(pre23));

        Object optimized = evaluate.invoke(null, 37, false);
        assertEquals(Boolean.TRUE, optimized.getClass().getMethod("relevant").invoke(optimized));
        assertEquals(Boolean.FALSE, optimized.getClass().getMethod("exempt").invoke(optimized));
    }
}
