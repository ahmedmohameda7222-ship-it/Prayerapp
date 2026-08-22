package de.donaumoschee.app.prayer;

import org.json.JSONException;
import org.json.JSONObject;
import org.junit.Test;

import java.time.Instant;

import static org.junit.Assert.assertEquals;

public final class NativeConfigTest {
    private static final Instant NOW = Instant.parse("2026-08-22T08:00:00Z");

    @Test
    public void parsesBoundedPublishedScheduleCache() throws Exception {
        NativeConfig config = NativeConfig.parse(valid("fajr", "fajr-cairo"), NOW);
        assertEquals(1, config.rows.size());
        assertEquals(1, config.reminders.size());
        assertEquals(NativeConfig.ZONE, java.time.ZoneId.of("Europe/Berlin"));
    }

    @Test(expected = JSONException.class)
    public void rejectsMalformedScheduleResponse() throws Exception {
        NativeConfig.parse(new JSONObject("{\"schemaVersion\":1}"), NOW);
    }

    @Test(expected = JSONException.class)
    public void rejectsRegularSoundForFajr() throws Exception {
        NativeConfig.parse(valid("fajr", "abdul-basit-cairo"), NOW);
    }

    @Test(expected = JSONException.class)
    public void rejectsFajrSoundForRegularPrayer() throws Exception {
        NativeConfig.parse(valid("dhuhr", "fajr-cairo"), NOW);
    }

    private static JSONObject valid(String prayer, String sound) throws Exception {
        return new JSONObject("{\"schemaVersion\":1,\"revision\":\"cache-v1\",\"timeZone\":\"Europe/Berlin\","
                + "\"scheduleValidUntil\":\"2026-09-01T00:00:00Z\","
                + "\"rows\":[{\"date\":\"2026-08-22\",\"fajr\":\"05:00\",\"sunrise\":\"06:30\",\"dhuhr\":\"13:30\",\"asr\":\"17:30\",\"maghrib\":\"20:30\",\"isha\":\"22:00\"}],"
                + "\"reminders\":[{\"prayer\":\"" + prayer + "\",\"enabled\":true,\"leadMinutes\":15,\"adhanSoundId\":\"" + sound + "\"}]}");
    }
}
