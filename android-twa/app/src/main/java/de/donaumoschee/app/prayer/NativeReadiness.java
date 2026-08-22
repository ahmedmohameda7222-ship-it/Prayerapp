package de.donaumoschee.app.prayer;

public final class NativeReadiness {
    private NativeReadiness() {}

    public static boolean isReady(
            boolean notificationPermission,
            boolean notificationDeliveryEnabled,
            boolean reminderChannelEnabled,
            boolean adhanChannelEnabled,
            boolean exactAlarmPermission,
            boolean scheduleFresh,
            boolean alarmScheduleInstalled,
            boolean audioReady,
            boolean engineHealthy
    ) {
        return notificationPermission
                && notificationDeliveryEnabled
                && reminderChannelEnabled
                && adhanChannelEnabled
                && exactAlarmPermission
                && scheduleFresh
                && alarmScheduleInstalled
                && audioReady
                && engineHealthy;
    }
}
