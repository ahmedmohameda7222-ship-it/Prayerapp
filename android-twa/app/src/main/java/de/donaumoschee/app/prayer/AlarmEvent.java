package de.donaumoschee.app.prayer;

import java.time.Instant;

public final class AlarmEvent {
    public enum Kind { REMINDER, ADHAN }

    public final String eventId;
    public final Prayer prayer;
    public final Kind kind;
    public final Instant dueAt;
    public final int leadMinutes;
    public final String adhanSoundId;

    AlarmEvent(String eventId, Prayer prayer, Kind kind, Instant dueAt, int leadMinutes, String adhanSoundId) {
        this.eventId = eventId;
        this.prayer = prayer;
        this.kind = kind;
        this.dueAt = dueAt;
        this.leadMinutes = leadMinutes;
        this.adhanSoundId = adhanSoundId;
    }

    public int requestCode() {
        return eventId.hashCode() & 0x7fffffff;
    }
}
