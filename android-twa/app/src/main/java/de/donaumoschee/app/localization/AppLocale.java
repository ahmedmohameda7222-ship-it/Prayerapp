package de.donaumoschee.app.localization;

import android.content.Context;
import android.content.res.Configuration;

import java.util.Locale;

public final class AppLocale {
    private AppLocale() {}

    public static String normalize(String value) {
        if ("ar".equals(value) || "de".equals(value) || "en".equals(value) || "tr".equals(value)) {
            return value;
        }
        return "en";
    }

    public static Context localizedContext(Context context, String locale) {
        Locale selected = Locale.forLanguageTag(normalize(locale));
        Configuration configuration = new Configuration(context.getResources().getConfiguration());
        configuration.setLocale(selected);
        return context.createConfigurationContext(configuration);
    }
}
