package de.donaumoschee.app.settings;

import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import de.donaumoschee.app.NativePermissionActivity;

public final class NativeSettingsLauncher {
    private NativeSettingsLauncher() { }

    public static void open(Context context, String target) {
        NativeSettingsRoutes.Route route = NativeSettingsRoutes.resolve(
                target,
                Build.VERSION.SDK_INT,
                context.getPackageName()
        );
        if ("permission".equals(route.kind())) {
            context.startActivity(new Intent(context, NativePermissionActivity.class)
                    .putExtra(NativePermissionActivity.EXTRA_MODE, route.permissionMode())
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
            return;
        }

        Intent intent = intentFor(route);
        if (canResolve(context, intent) && start(context, intent)) return;

        NativeSettingsRoutes.Route fallback = NativeSettingsRoutes.appDetails(context.getPackageName());
        Intent fallbackIntent = intentFor(fallback);
        if (canResolve(context, fallbackIntent)) start(context, fallbackIntent);
    }

    private static Intent intentFor(NativeSettingsRoutes.Route route) {
        Intent intent = new Intent(route.action()).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        if (route.data() != null) intent.setData(Uri.parse(route.data()));
        if (route.appPackage() != null) intent.putExtra(Settings.EXTRA_APP_PACKAGE, route.appPackage());
        if (route.channelId() != null) intent.putExtra(Settings.EXTRA_CHANNEL_ID, route.channelId());
        return intent;
    }

    private static boolean canResolve(Context context, Intent intent) {
        return intent.resolveActivity(context.getPackageManager()) != null;
    }

    private static boolean start(Context context, Intent intent) {
        try {
            context.startActivity(intent);
            return true;
        } catch (ActivityNotFoundException | SecurityException error) {
            return false;
        }
    }
}
