package de.donaumoschee.app.prayer;

import java.time.Duration;
import java.time.Instant;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;

public final class AlarmPlanner {
    private static final Duration HORIZON = Duration.ofDays(7);

    private AlarmPlanner() {}

    public static List<AlarmEvent> plan(NativeConfig config, Instant now) {
        Instant through = now.plus(HORIZON);
        List<AlarmEvent> events = new ArrayList<>();
        for (NativeConfig.ScheduleRow row : config.rows) {
            for (Prayer prayer : Prayer.values()) {
                NativeConfig.Reminder reminder = config.reminders.get(prayer);
                if (reminder == null || !reminder.enabled) continue;
                Instant adhanAt = ZonedDateTime.of(row.date, row.time(prayer), NativeConfig.ZONE).toInstant();
                addIfFuture(events, config, row, prayer, reminder, AlarmEvent.Kind.ADHAN, adhanAt, 0, now, through);
                if (reminder.leadMinutes > 0) {
                    addIfFuture(events, config, row, prayer, reminder, AlarmEvent.Kind.REMINDER,
                            adhanAt.minusSeconds(reminder.leadMinutes * 60L), reminder.leadMinutes, now, through);
                }
            }
        }
        events.sort(Comparator.comparing(event -> event.dueAt));
        return events;
    }

    private static void addIfFuture(
            List<AlarmEvent> events,
            NativeConfig config,
            NativeConfig.ScheduleRow row,
            Prayer prayer,
            NativeConfig.Reminder reminder,
            AlarmEvent.Kind kind,
            Instant dueAt,
            int leadMinutes,
            Instant now,
            Instant through
    ) {
        if (!dueAt.isAfter(now) || dueAt.isAfter(through)) return;
        String eventId = config.revision + ":" + row.date + ":" + prayer.key + ":" + kind.name().toLowerCase(Locale.ROOT) + ":" + leadMinutes;
        events.add(new AlarmEvent(eventId, prayer, kind, dueAt, leadMinutes, reminder.adhanSoundId));
    }
}
