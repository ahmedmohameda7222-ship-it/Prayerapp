package de.donaumoschee.app.settings;

import org.junit.Test;

import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

public final class NativeSettingsRoutesTest {
    private static final String PACKAGE = "de.donaumoschee.app";

    private Object resolve(String target, int sdk) throws Exception {
        Class<?> routes = Class.forName("de.donaumoschee.app.settings.NativeSettingsRoutes");
        Method resolve = routes.getMethod("resolve", String.class, int.class, String.class);
        return resolve.invoke(null, target, sdk, PACKAGE);
    }

    private Object value(Object route, String method) throws Exception {
        return route.getClass().getMethod(method).invoke(route);
    }

    @Test
    public void notificationPermissionUsesRuntimeRequestOnAndroid13Plus() throws Exception {
        Object route = resolve("notification-permission", 36);
        assertEquals("permission", value(route, "kind"));
        assertEquals("notification", value(route, "permissionMode"));
        assertNull(value(route, "action"));
    }

    @Test
    public void appNotificationsUseSingleAppSettingsWithSafeLegacyFallback() throws Exception {
        Object route = resolve("app-notifications", 36);
        assertEquals("settings", value(route, "kind"));
        assertEquals("android.settings.APP_NOTIFICATION_SETTINGS", value(route, "action"));
        assertEquals(PACKAGE, value(route, "appPackage"));
        assertNull(value(route, "data"));

        Object legacy = resolve("app-notifications", 25);
        assertEquals("android.settings.APPLICATION_DETAILS_SETTINGS", value(legacy, "action"));
        assertEquals("package:" + PACKAGE, value(legacy, "data"));
    }

    @Test
    public void reminderAndAdhanChannelsOpenTheirOwnChannelSettings() throws Exception {
        Object reminder = resolve("reminder-channel", 36);
        assertEquals("android.settings.CHANNEL_NOTIFICATION_SETTINGS", value(reminder, "action"));
        assertEquals(PACKAGE, value(reminder, "appPackage"));
        assertEquals("prayer-reminders-v1", value(reminder, "channelId"));

        Object adhan = resolve("adhan-channel", 36);
        assertEquals("android.settings.CHANNEL_NOTIFICATION_SETTINGS", value(adhan, "action"));
        assertEquals(PACKAGE, value(adhan, "appPackage"));
        assertEquals("adhan-playback-v1", value(adhan, "channelId"));
    }

    @Test
    public void exactAlarmUsesPackageScopedSpecialAccessScreen() throws Exception {
        Object route = resolve("exact-alarm", 36);
        assertEquals("android.settings.REQUEST_SCHEDULE_EXACT_ALARM", value(route, "action"));
        assertEquals("package:" + PACKAGE, value(route, "data"));
    }

    @Test
    public void batteryOptimizationUsesGeneralAdvisoryScreenWithoutDirectExemptionRequest() throws Exception {
        Object route = resolve("battery-optimization", 36);
        assertEquals("android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS", value(route, "action"));
        assertNull(value(route, "data"));
        assertNull(value(route, "appPackage"));
        assertTrue(!"android.settings.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS".equals(value(route, "action")));
    }

    @Test
    public void unsupportedTargetIsRejectedInsteadOfOpeningAnUnrelatedScreen() throws Exception {
        try {
            resolve("unknown-target", 36);
        } catch (InvocationTargetException error) {
            assertTrue(error.getCause() instanceof IllegalArgumentException);
            return;
        }
        throw new AssertionError("Unsupported target must be rejected");
    }
}