package de.donaumoschee.app.prayer;

public final class NativeReadiness {
    private NativeReadiness() {}

    public static boolean isReady(
            boolean notificationPermission,
            boolean exactAlarmPermission,
            boolean scheduleFresh,
            boolean alarmScheduleInstalled,
            boolean audioReady,
            boolean engineHealthy
    ) {
        return notificationPermission
                && exactAlarmPermission
                && scheduleFresh
                && alarmScheduleInstalled
                && audioReady
                && engineHealthy;
    }
}
