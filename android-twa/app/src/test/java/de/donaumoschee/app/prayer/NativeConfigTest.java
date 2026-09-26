package de.donaumoschee.app.prayer;

import org.json.JSONException;
import org.json.JSONObject;
import org.junit.Test;

import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.time.Instant;

import static org.junit.Assert.assertEquals;

public final class NativeConfigTest {
    private static final Instant NOW = Instant.parse("2026-08-22T08:00:00Z");

    @Test
    public void parsesBoundedPublishedScheduleCache() throws Exception {
        NativeConfig config = NativeConfig.parse(
                valid("fajr", "fajr-cairo").put("timeZone", "Asia/Tokyo"),
                NOW
        );
        assertEquals(1, config.rows.size());
        assertEquals(1, config.reminders.size());
        assertEquals("Asia/Tokyo", config.timeZone);
    }

    @Test
    public void acceptsServerTimezoneNotPresentInLocalTzdbWhenInstantsAreAuthoritative() throws Exception {
        NativeConfig config = NativeConfig.parse(
                valid("dhuhr", "abdul-basit-cairo").put("timeZone", "Server/Future-Time-Zone"),
                NOW
        );
        assertEquals("Server/Future-Time-Zone", config.timeZone);
        assertEquals(Instant.parse("2026-08-22T11:30:00Z"), config.rows.get(0).instant(Prayer.DHUHR));
    }

    @Test
    public void persistsAppSelectedLocaleInParsedConfig() throws Exception {
        NativeConfig config = NativeConfig.parse(valid("fajr", "fajr-cairo").put("locale", "ar"), NOW);
        Field locale = NativeConfig.class.getField("locale");
        assertEquals("ar", locale.get(config));
        assertEquals("ar", config.source.getString("locale"));
    }

    @Test
    public void unsupportedAppLocaleFallsBackToEnglish() throws Exception {
        Class<?> appLocale = Class.forName("de.donaumoschee.app.localization.AppLocale");
        Method normalize = appLocale.getMethod("normalize", String.class);
        assertEquals("en", normalize.invoke(null, "fr"));
        assertEquals("en", normalize.invoke(null, new Object[]{null}));
        assertEquals("tr", normalize.invoke(null, "tr"));
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
                + "\"rows\":[{\"date\":\"2026-08-22\","
                + "\"fajr\":\"05:00\",\"fajrAt\":\"2026-08-22T03:00:00Z\","
                + "\"sunrise\":\"06:30\",\"sunriseAt\":\"2026-08-22T04:30:00Z\","
                + "\"dhuhr\":\"13:30\",\"dhuhrAt\":\"2026-08-22T11:30:00Z\","
                + "\"asr\":\"17:30\",\"asrAt\":\"2026-08-22T15:30:00Z\","
                + "\"maghrib\":\"20:30\",\"maghribAt\":\"2026-08-22T18:30:00Z\","
                + "\"isha\":\"22:00\",\"ishaAt\":\"2026-08-22T20:00:00Z\"}],"
                + "\"reminders\":[{\"prayer\":\"" + prayer + "\",\"enabled\":true,\"leadMinutes\":15,\"adhanSoundId\":\"" + sound + "\"}]}");
    }
}
