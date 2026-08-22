package de.donaumoschee.app;

import android.app.Activity;
import android.content.ComponentName;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.browser.customtabs.CustomTabsCallback;
import androidx.browser.customtabs.CustomTabsClient;
import androidx.browser.customtabs.CustomTabsService;
import androidx.browser.customtabs.CustomTabsServiceConnection;
import androidx.browser.customtabs.CustomTabsSession;
import androidx.browser.trusted.TrustedWebActivityIntentBuilder;

import de.donaumoschee.app.bridge.BridgeHandler;
import de.donaumoschee.app.prayer.PrayerScheduler;
import de.donaumoschee.app.workers.NativeWork;

public final class LauncherActivity extends Activity {
    private static final String TAG = "DanubePrayer";
    private static final Uri ORIGIN = Uri.parse("https://donaumoschee.vercel.app");
    private CustomTabsClient client;
    private CustomTabsSession session;
    private CustomTabsServiceConnection connection;
    private BridgeHandler bridgeHandler;
    private boolean bound;
    private boolean relationshipValidated;
    private boolean navigationFinished;
    private boolean channelRequested;
    private boolean channelReady;
    private boolean twaLaunched;

    private final CustomTabsCallback callback = new CustomTabsCallback() {
        @Override
        public void onRelationshipValidationResult(int relation, @NonNull Uri requestedOrigin, boolean result, @Nullable Bundle extras) {
            relationshipValidated = relation == CustomTabsService.RELATION_USE_AS_ORIGIN && ORIGIN.equals(requestedOrigin) && result;
            Log.i(TAG, "bridge.relationship validated=" + relationshipValidated);
            tryOpenMessageChannel();
        }

        @Override
        public void onNavigationEvent(int navigationEvent, @Nullable Bundle extras) {
            if (navigationEvent == NAVIGATION_FINISHED) {
                navigationFinished = true;
                tryOpenMessageChannel();
            }
        }

        @Override
        public void onMessageChannelReady(@Nullable Bundle extras) {
            channelReady = relationshipValidated;
            Log.i(TAG, "bridge.channel ready=" + channelReady);
            if (channelReady && bridgeHandler != null) bridgeHandler.sendReady();
        }

        @Override
        public void onPostMessage(@NonNull String message, @Nullable Bundle extras) {
            if (channelReady && relationshipValidated && bridgeHandler != null) bridgeHandler.handle(message);
        }
    };

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        bridgeHandler = new BridgeHandler(getApplicationContext(), this::postMessage);
        bindAndLaunch();
    }

    private void bindAndLaunch() {
        String provider = CustomTabsClient.getPackageName(this, null);
        if (provider == null) {
            openBrowserFallback();
            return;
        }
        connection = new CustomTabsServiceConnection() {
            @Override
            public void onCustomTabsServiceConnected(@NonNull ComponentName name, @NonNull CustomTabsClient connectedClient) {
                client = connectedClient;
                client.warmup(0L);
                session = client.newSession(callback);
                if (session == null) {
                    openBrowserFallback();
                    return;
                }
                session.validateRelationship(CustomTabsService.RELATION_USE_AS_ORIGIN, ORIGIN, new Bundle());
                TrustedWebActivityIntentBuilder builder = new TrustedWebActivityIntentBuilder(launchingUrl())
                        .setToolbarColor(Color.rgb(0, 90, 82))
                        .setNavigationBarColor(Color.rgb(0, 90, 82));
                twaLaunched = true;
                builder.build(session).launchTrustedWebActivity(LauncherActivity.this);
            }

            @Override
            public void onServiceDisconnected(@NonNull ComponentName name) {
                client = null;
                session = null;
                channelReady = false;
            }
        };
        bound = CustomTabsClient.bindCustomTabsService(this, provider, connection);
        if (!bound) openBrowserFallback();
    }

    private Uri launchingUrl() {
        Uri deepLink = getIntent() == null ? null : getIntent().getData();
        return deepLink != null && "https".equals(deepLink.getScheme()) && "donaumoschee.vercel.app".equals(deepLink.getHost()) ? deepLink : ORIGIN;
    }

    private void tryOpenMessageChannel() {
        if (!relationshipValidated || !navigationFinished || channelRequested || session == null) return;
        channelRequested = session.requestPostMessageChannel(ORIGIN, ORIGIN, new Bundle());
    }

    private void postMessage(String message) {
        if (channelReady && session != null) session.postMessage(message, null);
    }

    private void openBrowserFallback() {
        startActivity(new Intent(Intent.ACTION_VIEW, launchingUrl()));
        finish();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (twaLaunched) {
            finish();
            return;
        }
        PrayerScheduler.reschedule(this);
        NativeWork.refreshNow(this);
        if (channelReady && bridgeHandler != null) bridgeHandler.sendStatus();
    }

    @Override
    protected void onDestroy() {
        if (bound && connection != null) unbindService(connection);
        bound = false;
        super.onDestroy();
    }
}
