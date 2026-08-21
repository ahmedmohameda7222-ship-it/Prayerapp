package de.donaumoschee.app;

import de.donaumoschee.app.prayer.PrayerNotifications;
import de.donaumoschee.app.prayer.PrayerScheduler;
import de.donaumoschee.app.workers.NativeWork;

public final class Application extends android.app.Application {
    @Override
    public void onCreate() {
        super.onCreate();
        PrayerNotifications.createChannels(this);
        PrayerScheduler.reschedule(this);
        NativeWork.initialize(this);
    }
}
