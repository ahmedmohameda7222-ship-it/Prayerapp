package de.donaumoschee.app.prayer;

import android.content.Context;

import de.donaumoschee.app.R;
import de.donaumoschee.app.localization.AppLocale;
import de.donaumoschee.app.storage.NativeStore;

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
        Context localizedContext = AppLocale.localizedContext(context, new NativeStore(context).appLocale());
        switch (this) {
            case FAJR: return localizedContext.getString(R.string.prayer_fajr);
            case DHUHR: return localizedContext.getString(R.string.prayer_dhuhr);
            case ASR: return localizedContext.getString(R.string.prayer_asr);
            case MAGHRIB: return localizedContext.getString(R.string.prayer_maghrib);
            case ISHA: return localizedContext.getString(R.string.prayer_isha);
            default: throw new IllegalStateException("Unsupported prayer");
        }
    }
}
