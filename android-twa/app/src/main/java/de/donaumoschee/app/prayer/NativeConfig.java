package de.donaumoschee.app.prayer;

import de.donaumoschee.app.adhan.AdhanCatalog;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Collections;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;

public final class NativeConfig {
    public static final ZoneId ZONE = ZoneId.of("Europe/Berlin");
    public final String revision;
    public final Instant scheduleValidUntil;
    public final List<ScheduleRow> rows;
    public final Map<Prayer, Reminder> reminders;
    public final JSONObject source;

    private NativeConfig(
            String revision,
            Instant scheduleValidUntil,
            List<ScheduleRow> rows,
            Map<Prayer, Reminder> reminders,
            JSONObject source
    ) {
        this.revision = revision;
        this.scheduleValidUntil = scheduleValidUntil;
        this.rows = Collections.unmodifiableList(rows);
        this.reminders = Collections.unmodifiableMap(reminders);
        this.source = source;
    }

    public static NativeConfig parse(JSONObject object, Instant now) throws JSONException {
        if (object == null || object.optInt("schemaVersion", -1) != 1) throw new JSONException("Invalid config schema");
        if (!"Europe/Berlin".equals(object.optString("timeZone"))) throw new JSONException("Invalid time zone");
        String revision = object.optString("revision", "");
        if (revision.length() == 0 || revision.length() > 128) throw new JSONException("Invalid revision");
        Instant validUntil;
        try {
            validUntil = Instant.parse(object.getString("scheduleValidUntil"));
        } catch (RuntimeException error) {
            throw new JSONException("Invalid schedule expiry");
        }
        if (!validUntil.isAfter(now) || validUntil.isAfter(now.plusSeconds(45L * 24 * 60 * 60))) {
            throw new JSONException("Schedule expiry outside allowed range");
        }

        JSONArray rowArray = object.optJSONArray("rows");
        if (rowArray == null || rowArray.length() == 0 || rowArray.length() > 31) throw new JSONException("Invalid rows");
        List<ScheduleRow> rows = new ArrayList<>();
        LocalDate previous = null;
        for (int index = 0; index < rowArray.length(); index++) {
            JSONObject row = rowArray.getJSONObject(index);
            LocalDate date;
            try {
                date = LocalDate.parse(row.getString("date"));
            } catch (RuntimeException error) {
                throw new JSONException("Invalid prayer date");
            }
            if (previous != null && !date.isAfter(previous)) throw new JSONException("Prayer rows must be ordered and unique");
            previous = date;
            String scheduleId = row.optString("id", "");
            if (scheduleId.length() > 128) throw new JSONException("Invalid prayer schedule id");
            EnumMap<Prayer, LocalTime> times = new EnumMap<>(Prayer.class);
            EnumMap<Prayer, String> revisions = new EnumMap<>(Prayer.class);
            for (Prayer prayer : Prayer.values()) {
                try {
                    String rawTime = row.getString(prayer.key);
                    times.put(prayer, LocalTime.parse(rawTime));
                    revisions.put(prayer, rawTime);
                } catch (RuntimeException error) {
                    throw new JSONException("Invalid prayer time");
                }
            }
            rows.add(new ScheduleRow(scheduleId, date, times, revisions));
        }

        EnumMap<Prayer, Reminder> reminders = new EnumMap<>(Prayer.class);
        JSONArray reminderArray = object.optJSONArray("reminders");
        if (reminderArray == null || reminderArray.length() > Prayer.values().length) throw new JSONException("Invalid reminders");
        for (int index = 0; index < reminderArray.length(); index++) {
            JSONObject item = reminderArray.getJSONObject(index);
            Prayer prayer;
            try {
                prayer = Prayer.fromKey(item.getString("prayer"));
            } catch (RuntimeException error) {
                throw new JSONException("Invalid reminder prayer");
            }
            int leadMinutes = item.optInt("leadMinutes", -1);
            if (leadMinutes != 0 && leadMinutes != 5 && leadMinutes != 10 && leadMinutes != 15) {
                throw new JSONException("Invalid reminder lead");
            }
            String soundId = item.optString("adhanSoundId", "");
            if (!AdhanCatalog.isCompatible(prayer, soundId)) throw new JSONException("Incompatible Adhan sound");
            if (reminders.put(prayer, new Reminder(item.optBoolean("enabled", false), leadMinutes, soundId)) != null) {
                throw new JSONException("Duplicate reminder prayer");
            }
        }
        return new NativeConfig(revision, validUntil, rows, reminders, new JSONObject(object.toString()));
    }

    public static final class ScheduleRow {
        public final String id;
        public final LocalDate date;
        private final Map<Prayer, LocalTime> times;
        private final Map<Prayer, String> revisions;

        private ScheduleRow(String id, LocalDate date, Map<Prayer, LocalTime> times, Map<Prayer, String> revisions) {
            this.id = id;
            this.date = date;
            this.times = times;
            this.revisions = revisions;
        }

        public LocalTime time(Prayer prayer) {
            return times.get(prayer);
        }

        public String prayerRevision(Prayer prayer) {
            return revisions.get(prayer);
        }
    }

    public static final class Reminder {
        public final boolean enabled;
        public final int leadMinutes;
        public final String adhanSoundId;

        private Reminder(boolean enabled, int leadMinutes, String adhanSoundId) {
            this.enabled = enabled;
            this.leadMinutes = leadMinutes;
            this.adhanSoundId = adhanSoundId;
        }
    }
}
