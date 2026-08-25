package de.donaumoschee.app.prayer;

import org.json.JSONObject;
import org.junit.Test;

import java.time.Instant;
import java.util.List;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotEquals;
import static org.junit.Assert.assertTrue;

public final class AlarmPlannerTest {
    private static final String SCHEDULE_ID = "123e4567-e89b-12d3-a456-426614174000";

    @Test
    public void plansDeterministicReminderAndAdhanWithoutSunrise() throws Exception {
        Instant now = Instant.parse("2026-08-22T08:00:00Z");
        NativeConfig config = NativeConfig.parse(new JSONObject("{"
                + "\"schemaVersion\":1,\"revision\":\"r1\",\"timeZone\":\"Europe/Berlin\","
                + "\"scheduleValidUntil\":\"2026-08-25T00:00:00Z\","
                + "\"rows\":[{\"id\":\"" + SCHEDULE_ID + "\",\"date\":\"2026-08-22\",\"fajr\":\"05:00\",\"sunrise\":\"06:30\",\"dhuhr\":\"13:30\",\"asr\":\"17:30\",\"maghrib\":\"20:30\",\"isha\":\"22:00\"}],"
                + "\"reminders\":[{\"prayer\":\"dhuhr\",\"enabled\":true,\"leadMinutes\":10,\"adhanSoundId\":\"abdul-basit-cairo\"}]}"), now);

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
        assertEquals("p2:0584c612d12435d851678d6af6c3d49f0a89f05a5ca6f0a8c7869809a67d9c09", events.get(0).eventId);
        assertEquals("p2:b396d3b4a4a3a5cf644623ae0a287dc3a94df80a765614b143e57da2fe7ce13b", events.get(1).eventId);
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
    public void usesEuropeBerlinAcrossDstTransitions() throws Exception {
        Instant springNow = Instant.parse("2026-03-28T00:00:00Z");
        List<AlarmEvent> spring = AlarmPlanner.plan(config("spring", "2026-03-29", "13:30", "dhuhr", true, 0, "abdul-basit-cairo", springNow), springNow);
        assertEquals(Instant.parse("2026-03-29T11:30:00Z"), spring.get(0).dueAt);

        Instant autumnNow = Instant.parse("2026-10-24T00:00:00Z");
        List<AlarmEvent> autumn = AlarmPlanner.plan(config("autumn", "2026-10-25", "13:30", "dhuhr", true, 0, "abdul-basit-cairo", autumnNow), autumnNow);
        assertEquals(Instant.parse("2026-10-25T12:30:00Z"), autumn.get(0).dueAt);
    }

    private static NativeConfig config(String revision, String date, String dhuhrTime, String prayer, boolean enabled, int lead, String sound, Instant now) throws Exception {
        return NativeConfig.parse(new JSONObject("{"
                + "\"schemaVersion\":1,\"revision\":\"" + revision + "\",\"timeZone\":\"Europe/Berlin\","
                + "\"scheduleValidUntil\":\"" + now.plusSeconds(30L * 24 * 60 * 60) + "\","
                + "\"rows\":[{\"id\":\"" + SCHEDULE_ID + "\",\"date\":\"" + date + "\",\"fajr\":\"05:00\",\"sunrise\":\"06:30\",\"dhuhr\":\"" + dhuhrTime + "\",\"asr\":\"17:30\",\"maghrib\":\"20:30\",\"isha\":\"22:00\"}],"
                + "\"reminders\":[{\"prayer\":\"" + prayer + "\",\"enabled\":" + enabled + ",\"leadMinutes\":" + lead + ",\"adhanSoundId\":\"" + sound + "\"}]}"), now);
    }
}
