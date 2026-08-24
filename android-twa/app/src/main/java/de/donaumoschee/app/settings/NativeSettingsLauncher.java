package de.donaumoschee.app.settings;

import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import de.donaumoschee.app.NativePermissionActivity;

public final class NativeSettingsLauncher {
    private static final String ACTION_APPLICATION_DETAILS_SETTINGS = "android.settings.APPLICATION_DETAILS_SETTINGS";

    private NativeSettingsLauncher() { }

    public static void open(Context context, String target) {
        int sdk = Build.VERSION.SDK_INT;
        String packageName = context.getPackageName();
        NativeSettingsRoutes.Route primary = NativeSettingsRoutes.resolve(target, sdk, packageName);
        if ("permission".equals(primary.kind())) {
            context.startActivity(new Intent(context, NativePermissionActivity.class)
                    .putExtra(NativePermissionActivity.EXTRA_MODE, primary.permissionMode())
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
            return;
        }

        Intent primaryIntent = intentFor(primary);
        NativeSettingsRoutes.Route selected = NativeSettingsRoutes.resolveForAvailability(
                target,
                sdk,
                packageName,
                canResolve(context, primaryIntent)
        );
        Intent selectedIntent = intentFor(selected);
        if (canResolve(context, selectedIntent) && start(context, selectedIntent)) return;

        if (!ACTION_APPLICATION_DETAILS_SETTINGS.equals(selected.action())) {
            Intent fallbackIntent = intentFor(NativeSettingsRoutes.appDetails(packageName));
            if (canResolve(context, fallbackIntent)) start(context, fallbackIntent);
        }
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
