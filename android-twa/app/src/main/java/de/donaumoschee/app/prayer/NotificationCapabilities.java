package de.donaumoschee.app.prayer;

public record NotificationCapabilities(
        boolean notificationPermission,
        boolean notificationDeliveryEnabled,
        boolean reminderChannelEnabled,
        boolean adhanChannelEnabled
) {
    private static final int API_NOTIFICATION_CHANNELS = 26;
    private static final int API_RUNTIME_NOTIFICATIONS = 33;
    private static final int IMPORTANCE_NONE = 0;

    public static NotificationCapabilities evaluate(
            int sdk,
            boolean runtimePermissionGranted,
            boolean appNotificationsEnabled,
            int reminderChannelImportance,
            int adhanChannelImportance
    ) {
        boolean permission = sdk < API_RUNTIME_NOTIFICATIONS || runtimePermissionGranted;
        boolean delivery = permission && appNotificationsEnabled;
        boolean reminderChannel = sdk < API_NOTIFICATION_CHANNELS || reminderChannelImportance != IMPORTANCE_NONE;
        boolean adhanChannel = sdk < API_NOTIFICATION_CHANNELS || adhanChannelImportance != IMPORTANCE_NONE;
        return new NotificationCapabilities(permission, delivery, reminderChannel, adhanChannel);
    }

    public boolean reminderDeliveryReady() {
        return notificationDeliveryEnabled && reminderChannelEnabled;
    }

    public boolean nativeDeliveryReady() {
        return reminderDeliveryReady() && adhanChannelEnabled;
    }
}
