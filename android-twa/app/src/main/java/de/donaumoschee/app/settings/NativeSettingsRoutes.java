package de.donaumoschee.app.settings;

public final class NativeSettingsRoutes {
    private static final String ACTION_APP_NOTIFICATION_SETTINGS = "android.settings.APP_NOTIFICATION_SETTINGS";
    private static final String ACTION_CHANNEL_NOTIFICATION_SETTINGS = "android.settings.CHANNEL_NOTIFICATION_SETTINGS";
    private static final String ACTION_APPLICATION_DETAILS_SETTINGS = "android.settings.APPLICATION_DETAILS_SETTINGS";
    private static final String ACTION_REQUEST_SCHEDULE_EXACT_ALARM = "android.settings.REQUEST_SCHEDULE_EXACT_ALARM";
    private static final String ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS = "android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS";
    private static final String REMINDER_CHANNEL = "prayer-reminders-v1";
    private static final String ADHAN_CHANNEL = "adhan-playback-v1";

    private NativeSettingsRoutes() { }

    public record Route(
            String kind,
            String permissionMode,
            String action,
            String data,
            String appPackage,
            String channelId
    ) { }

    public static Route resolve(String target, int sdk, String packageName) {
        if (target == null || packageName == null || packageName.isBlank()) {
            throw new IllegalArgumentException("Invalid settings route");
        }
        return switch (target) {
            case "notification-permission" -> sdk >= 33
                    ? permission("notification")
                    : appDetails(packageName);
            case "app-notifications" -> sdk >= 26
                    ? settings(ACTION_APP_NOTIFICATION_SETTINGS, null, packageName, null)
                    : appDetails(packageName);
            case "reminder-channel" -> sdk >= 26
                    ? settings(ACTION_CHANNEL_NOTIFICATION_SETTINGS, null, packageName, REMINDER_CHANNEL)
                    : appDetails(packageName);
            case "adhan-channel" -> sdk >= 26
                    ? settings(ACTION_CHANNEL_NOTIFICATION_SETTINGS, null, packageName, ADHAN_CHANNEL)
                    : appDetails(packageName);
            case "exact-alarm" -> sdk >= 31
                    ? settings(ACTION_REQUEST_SCHEDULE_EXACT_ALARM, packageUri(packageName), null, null)
                    : appDetails(packageName);
            case "battery-optimization" -> sdk >= 23
                    ? settings(ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS, null, null, null)
                    : appDetails(packageName);
            default -> throw new IllegalArgumentException("Unsupported settings target");
        };
    }

    public static Route appDetails(String packageName) {
        if (packageName == null || packageName.isBlank()) {
            throw new IllegalArgumentException("Invalid package name");
        }
        return settings(ACTION_APPLICATION_DETAILS_SETTINGS, packageUri(packageName), null, null);
    }

    private static Route permission(String mode) {
        return new Route("permission", mode, null, null, null, null);
    }

    private static Route settings(String action, String data, String appPackage, String channelId) {
        return new Route("settings", null, action, data, appPackage, channelId);
    }

    private static String packageUri(String packageName) {
        return "package:" + packageName;
    }
}
