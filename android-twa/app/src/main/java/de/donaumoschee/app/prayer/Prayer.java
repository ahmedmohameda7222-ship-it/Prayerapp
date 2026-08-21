package de.donaumoschee.app.prayer;

import android.content.Context;

import de.donaumoschee.app.R;

public enum Prayer {
    FAJR("fajr"),
    DHUHR("dhuhr"),
    ASR("asr"),
    MAGHRIB("maghrib"),
    ISHA("isha");

    public final String key;

    Prayer(String key) {
        this.key = key;
    }

    public static Prayer fromKey(String value) {
        for (Prayer prayer : values()) if (prayer.key.equals(value)) return prayer;
        throw new IllegalArgumentException("Unsupported prayer");
    }

    public String displayName(Context context) {
        switch (this) {
            case FAJR: return context.getString(R.string.prayer_fajr);
            case DHUHR: return context.getString(R.string.prayer_dhuhr);
            case ASR: return context.getString(R.string.prayer_asr);
            case MAGHRIB: return context.getString(R.string.prayer_maghrib);
            case ISHA: return context.getString(R.string.prayer_isha);
            default: throw new IllegalStateException("Unsupported prayer");
        }
    }
}
