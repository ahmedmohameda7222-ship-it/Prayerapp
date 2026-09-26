package de.donaumoschee.app.prayer;

import org.json.JSONObject;
import org.junit.Test;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotEquals;
import static org.junit.Assert.assertTrue;

public final class AlarmPlannerTest {
    private static final String SCHEDULE_ID = "123e4567-e89b-12d3-a456-426614174000";

    @Test
    public void plansDeterministicReminderAndAdhanWithoutSunrise() throws Exception {
        Instant now = Instant.parse("2026-08-22T08:00:00Z");
        NativeConfig config = config("r1", "2026-08-22", "13:30", "dhuhr", true, 10, "abdul-basit-cairo", now);

        List<AlarmEvent> first = AlarmPlanner.plan(config, now);
        List<AlarmEvent> second = AlarmPlanner.plan(config, now);
        assertEquals(2, first.size());
        assertEquals(first.get(0).eventId, second.get(0).eventId);
        assertNotEquals(first.get(0).eventId, first.get(1).eventId);
        assertEquals(AlarmEvent.Kind.REMINDER, first.get(0).kind);
        assertEquals(AlarmEvent.Kind.ADHAN, first.get(1).kind);
    }

    @Test
    public void canonicalIdsMatchServerFixtures() throws Exception {
        Instant now = Instant.parse("2026-08-22T08:00:00Z");
        List<AlarmEvent> events = AlarmPlanner.plan(config("r1", "2026-08-22", "13:30", "dhuhr", true, 10, "abdul-basit-cairo", now), now);
        assertEquals("p3:f85f1c9e113eab99f1a364601d5f68449a18eb3f884d9fa7d82b5a9d125476e5", events.get(0).eventId);
        assertEquals("p3:3b4c2074ea5b9d9a0a080df5e9550a48e76b0b0d12a241f136ac449ed80a1b8b", events.get(1).eventId);
    }

    @Test
    public void plansBeyondSevenDaysInsideFourteenDayHorizon() throws Exception {
        Instant now = Instant.parse("2026-08-22T00:00:00Z");
        List<AlarmEvent> events = AlarmPlanner.plan(config("future", "2026-09-04", "13:30", "dhuhr", true, 0, "abdul-basit-cairo", now), now);
        assertEquals(1, events.size());
        assertEquals(Instant.parse("2026-09-04T11:30:00Z"), events.get(0).dueAt);
    }

    @Test
    public void plansEverySupportedLeadAndNoDuplicateAtZero() throws Exception {
        Instant now = Instant.parse("2026-08-22T08:00:00Z");
        for (int lead : new int[]{15, 10, 5, 0}) {
            List<AlarmEvent> events = AlarmPlanner.plan(config("r" + lead, "2026-08-22", "13:30", "dhuhr", true, lead, "abdul-basit-cairo", now), now);
            assertEquals(lead == 0 ? 1 : 2, events.size());
            assertEquals(AlarmEvent.Kind.ADHAN, events.get(events.size() - 1).kind);
            if (lead > 0) assertEquals(lead, events.get(0).leadMinutes);
        }
    }

    @Test
    public void disabledAndPastPrayersScheduleNothing() throws Exception {
        Instant now = Instant.parse("2026-08-22T08:00:00Z");
        assertTrue(AlarmPlanner.plan(config("disabled", "2026-08-22", "13:30", "dhuhr", false, 15, "abdul-basit-cairo", now), now).isEmpty());
        assertTrue(AlarmPlanner.plan(config("past", "2026-08-21", "13:30", "dhuhr", true, 15, "abdul-basit-cairo", now), now).isEmpty());
    }

    @Test
    public void eventIdentityIgnoresGlobalConfigRevisionButChangesWithPrayerTime() throws Exception {
        Instant now = Instant.parse("2026-08-22T08:00:00Z");
        List<AlarmEvent> first = AlarmPlanner.plan(config("r1", "2026-08-22", "13:30", "dhuhr", true, 10, "abdul-basit-cairo", now), now);
        List<AlarmEvent> repeated = AlarmPlanner.plan(config("r2", "2026-08-22", "13:30", "dhuhr", true, 10, "abdul-basit-cairo", now), now);
        List<AlarmEvent> updatedTime = AlarmPlanner.plan(config("r2", "2026-08-22", "13:31", "dhuhr", true, 10, "abdul-basit-cairo", now), now);
        assertEquals(first.get(0).eventId, repeated.get(0).eventId);
        assertEquals(first.get(0).requestCode(), repeated.get(0).requestCode());
        assertNotEquals(first.get(0).eventId, updatedTime.get(0).eventId);
    }

    @Test
    public void eventIdentityChangesWhenTimezoneMovesResolvedInstant() throws Exception {
        Instant now = Instant.parse("2026-08-22T00:00:00Z");
        List<AlarmEvent> berlin = AlarmPlanner.plan(
                configInZone("berlin", "2026-08-22", "13:30", "dhuhr", true, 0, "abdul-basit-cairo", "Europe/Berlin", now),
                now
        );
        List<AlarmEvent> tokyo = AlarmPlanner.plan(
                configInZone("tokyo", "2026-08-22", "13:30", "dhuhr", true, 0, "abdul-basit-cairo", "Asia/Tokyo", now),
                now
        );

        assertEquals(1, berlin.size());
        assertEquals(1, tokyo.size());
        assertNotEquals(berlin.get(0).dueAt, tokyo.get(0).dueAt);
        assertNotEquals(berlin.get(0).eventId, tokyo.get(0).eventId);
    }

    @Test
    public void usesConfiguredIanaTimezoneForPrayerInstants() throws Exception {
        Instant now = Instant.parse("2026-08-22T00:00:00Z");
        List<AlarmEvent> events = AlarmPlanner.plan(
                configInZone("tokyo", "2026-08-22", "13:30", "dhuhr", true, 0, "abdul-basit-cairo", "Asia/Tokyo", now),
                now
        );
        assertEquals(1, events.size());
        assertEquals(Instant.parse("2026-08-22T04:30:00Z"), events.get(0).dueAt);
    }

    @Test
    public void resolvesRepeatedWallClockTimeWithServerLaterOffsetPolicy() throws Exception {
        Instant now = Instant.parse("2026-10-24T00:00:00Z");
        List<AlarmEvent> events = AlarmPlanner.plan(
                config("overlap", "2026-10-25", "02:30", "dhuhr", true, 0, "abdul-basit-cairo", now),
                now
        );

        assertEquals(1, events.size());
        assertEquals(Instant.parse("2026-10-25T01:30:00Z"), events.get(0).dueAt);
        assertEquals("p3:6cdcfc1f710ec1b232a3ef500c4d9e3d00635f51e0f5ce5c54ed7a86fa397821", events.get(0).eventId);
    }

    @Test
    public void resolvesWesternRepeatedWallClockTimeWithServerLaterOffsetPolicy() throws Exception {
        Instant now = Instant.parse("2026-10-31T00:00:00Z");
        List<AlarmEvent> events = AlarmPlanner.plan(
                configInZone("ny-overlap", "2026-11-01", "01:30", "dhuhr", true, 0, "abdul-basit-cairo", "America/New_York", now),
                now
        );

        assertEquals(1, events.size());
        assertEquals(Instant.parse("2026-11-01T06:30:00Z"), events.get(0).dueAt);
    }

    @Test
    public void shiftsWesternNonexistentWallClockTimeForwardLikeServerPolicy() throws Exception {
        Instant now = Instant.parse("2026-03-07T00:00:00Z");
        List<AlarmEvent> events = AlarmPlanner.plan(
                configInZone("ny-gap", "2026-03-08", "02:30", "dhuhr", true, 0, "abdul-basit-cairo", "America/New_York", now),
                now
        );

        assertEquals(1, events.size());
        assertEquals(Instant.parse("2026-03-08T07:30:00Z"), events.get(0).dueAt);
    }

    @Test
    public void usesEuropeBerlinAcrossDstTransitions() throws Exception {
        Instant springNow = Instant.parse("2026-03-28T00:00:00Z");
        List<AlarmEvent> spring = AlarmPlanner.plan(config("spring", "2026-03-29", "13:30", "dhuhr", true, 0, "abdul-basit-cairo", springNow), springNow);
        assertEquals(Instant.parse("2026-03-29T11:30:00Z"), spring.get(0).dueAt);

        Instant autumnNow = Instant.parse("2026-10-24T00:00:00Z");
        List<AlarmEvent> autumn = AlarmPlanner.plan(config("autumn", "2026-10-25", "13:30", "dhuhr", true, 0, "abdul-basit-cairo", autumnNow), autumnNow);
        assertEquals(Instant.parse("2026-10-25T12:30:00Z"), autumn.get(0).dueAt);
    }

    private static NativeConfig config(String revision, String date, String dhuhrTime, String prayer, boolean enabled, int lead, String sound, Instant now) throws Exception {
        return configInZone(revision, date, dhuhrTime, prayer, enabled, lead, sound, "Europe/Berlin", now);
    }

    private static NativeConfig configInZone(String revision, String date, String dhuhrTime, String prayer, boolean enabled, int lead, String sound, String timeZone, Instant now) throws Exception {
        return NativeConfig.parse(new JSONObject("{"
                + "\"schemaVersion\":1,\"revision\":\"" + revision + "\",\"timeZone\":\"" + timeZone + "\","
                + "\"scheduleValidUntil\":\"" + now.plusSeconds(30L * 24 * 60 * 60) + "\","
                + "\"rows\":[{\"id\":\"" + SCHEDULE_ID + "\",\"date\":\"" + date + "\","
                + "\"fajr\":\"05:00\",\"fajrAt\":\"" + resolvedAt(date, "05:00", timeZone) + "\","
                + "\"sunrise\":\"06:30\",\"sunriseAt\":\"" + resolvedAt(date, "06:30", timeZone) + "\","
                + "\"dhuhr\":\"" + dhuhrTime + "\",\"dhuhrAt\":\"" + resolvedAt(date, dhuhrTime, timeZone) + "\","
                + "\"asr\":\"17:30\",\"asrAt\":\"" + resolvedAt(date, "17:30", timeZone) + "\","
                + "\"maghrib\":\"20:30\",\"maghribAt\":\"" + resolvedAt(date, "20:30", timeZone) + "\","
                + "\"isha\":\"22:00\",\"ishaAt\":\"" + resolvedAt(date, "22:00", timeZone) + "\"}],"
                + "\"reminders\":[{\"prayer\":\"" + prayer + "\",\"enabled\":" + enabled + ",\"leadMinutes\":" + lead + ",\"adhanSoundId\":\"" + sound + "\"}]}"), now);
    }

    private static String resolvedAt(String date, String time, String timeZone) {
        return ZonedDateTime.of(LocalDate.parse(date), LocalTime.parse(time), ZoneId.of(timeZone))
                .withLaterOffsetAtOverlap()
                .toInstant()
                .toString();
    }
}
