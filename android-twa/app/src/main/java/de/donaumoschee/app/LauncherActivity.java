package de.donaumoschee.app;

import android.app.Activity;
import android.content.ActivityNotFoundException;
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
import androidx.browser.customtabs.CustomTabsIntent;
import androidx.browser.customtabs.CustomTabsService;
import androidx.browser.customtabs.CustomTabsServiceConnection;
import androidx.browser.customtabs.CustomTabsSession;
import androidx.browser.trusted.Token;
import androidx.browser.trusted.TrustedWebActivityIntent;
import androidx.browser.trusted.TrustedWebActivityIntentBuilder;

import com.google.androidbrowserhelper.trusted.FocusActivity;
import com.google.androidbrowserhelper.trusted.SessionStore;
import com.google.androidbrowserhelper.trusted.SharedPreferencesTokenStore;
import com.google.androidbrowserhelper.trusted.TwaProviderPicker;

import de.donaumoschee.app.bridge.BridgeHandler;
import de.donaumoschee.app.prayer.PrayerScheduler;
import de.donaumoschee.app.workers.NativeWork;

public final class LauncherActivity extends Activity {
    private static final String TAG = "DanubePrayer";
    private static final Uri ORIGIN = Uri.parse("https://donaumoschee.vercel.app");
    private static final String BROWSER_WAS_LAUNCHED_KEY =
            "de.donaumoschee.app.browserWasLaunched";

    private static int activeLauncherActivities;

    private CustomTabsClient client;
    private CustomTabsSession session;
    private CustomTabsServiceConnection connection;
    private BridgeHandler bridgeHandler;
    private boolean bound;
    private boolean countedActiveLauncher;
    private boolean browserLaunched;
    private boolean relationshipValidated;
    private boolean navigationFinished;
    private boolean channelRequested;
    private boolean channelReady;

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

        activeLauncherActivities++;
        countedActiveLauncher = true;
        boolean twaAlreadyRunning = activeLauncherActivities > 1;
        boolean intentHasData = getIntent() != null && getIntent().getData() != null;
        if (twaAlreadyRunning && !intentHasData) {
            finish();
            return;
        }

        if (restartInNewTask()) {
            finish();
            return;
        }

        if (savedInstanceState != null && savedInstanceState.getBoolean(BROWSER_WAS_LAUNCHED_KEY)) {
            finish();
            return;
        }

        bridgeHandler = new BridgeHandler(getApplicationContext(), this::postMessage);
        bindAndLaunch();
    }

    private void bindAndLaunch() {
        TwaProviderPicker.Action action = TwaProviderPicker.pickProvider(getPackageManager());
        if (action.launchMode != TwaProviderPicker.LaunchMode.TRUSTED_WEB_ACTIVITY || action.provider == null) {
            launchFallback(action);
            return;
        }

        String provider = action.provider;
        connection = new CustomTabsServiceConnection() {
            @Override
            public void onCustomTabsServiceConnected(@NonNull ComponentName name, @NonNull CustomTabsClient connectedClient) {
                client = connectedClient;
                client.warmup(0L);
                Integer sessionId = SessionStore.makeSessionId(getTaskId());
                session = client.newSession(callback, sessionId);
                if (session == null) session = client.newSession(callback);
                if (session == null) {
                    launchCustomTabFallback(provider);
                    return;
                }

                new SharedPreferencesTokenStore(getApplicationContext())
                        .store(Token.create(provider, getPackageManager()));

                session.validateRelationship(CustomTabsService.RELATION_USE_AS_ORIGIN, ORIGIN, new Bundle());
                TrustedWebActivityIntent twaIntent = twaIntentBuilder(launchingUrl()).build(session);
                FocusActivity.addToIntent(twaIntent.getIntent(), LauncherActivity.this);
                browserLaunched = true;
                twaIntent.launchTrustedWebActivity(LauncherActivity.this);
            }

            @Override
            public void onServiceDisconnected(@NonNull ComponentName name) {
                client = null;
                session = null;
                channelReady = false;
            }
        };
        bound = CustomTabsClient.bindCustomTabsServicePreservePriority(this, provider, connection);
        if (!bound) launchCustomTabFallback(provider);
    }

    private TrustedWebActivityIntentBuilder twaIntentBuilder(Uri uri) {
        return new TrustedWebActivityIntentBuilder(uri)
                .setToolbarColor(Color.rgb(0, 90, 82))
                .setNavigationBarColor(Color.rgb(0, 90, 82));
    }

    private Uri launchingUrl() {
        Uri deepLink = getIntent() == null ? null : getIntent().getData();
        return deepLink != null && "https".equals(deepLink.getScheme()) && "donaumoschee.vercel.app".equals(deepLink.getHost()) ? deepLink : ORIGIN;
    }

    private void launchFallback(TwaProviderPicker.Action action) {
        if (action.provider != null && action.launchMode == TwaProviderPicker.LaunchMode.CUSTOM_TAB) {
            launchCustomTabFallback(action.provider);
            return;
        }
        openBrowserFallback(action.provider);
    }

    private void launchCustomTabFallback(String provider) {
        Uri uri = launchingUrl();
        CustomTabsIntent customTabsIntent = twaIntentBuilder(uri).buildCustomTabsIntent();
        customTabsIntent.intent.setPackage(provider);
        try {
            customTabsIntent.launchUrl(this, uri);
        } catch (ActivityNotFoundException | SecurityException error) {
            openBrowserFallback(null);
            return;
        }
        finish();
    }

    private void openBrowserFallback(@Nullable String provider) {
        Intent fallback = new Intent(Intent.ACTION_VIEW, launchingUrl());
        if (provider != null) fallback.setPackage(provider);
        try {
            startActivity(fallback);
        } catch (ActivityNotFoundException | SecurityException error) {
            Log.e(TAG, "browser.fallback unavailable", error);
        }
        finish();
    }

    private boolean restartInNewTask() {
        Intent intent = getIntent();
        if (intent == null) return false;
        boolean hasNewTask = (intent.getFlags() & Intent.FLAG_ACTIVITY_NEW_TASK) != 0;
        boolean hasNewDocument = (intent.getFlags() & Intent.FLAG_ACTIVITY_NEW_DOCUMENT) != 0;
        if (hasNewTask && !hasNewDocument) return false;

        Intent newIntent = new Intent(intent);
        int flags = intent.getFlags();
        flags |= Intent.FLAG_ACTIVITY_NEW_TASK;
        flags &= ~Intent.FLAG_ACTIVITY_NEW_DOCUMENT;
        newIntent.setFlags(flags);
        startActivity(newIntent);
        return true;
    }

    private void tryOpenMessageChannel() {
        if (!relationshipValidated || !navigationFinished || channelRequested || session == null) return;
        channelRequested = session.requestPostMessageChannel(ORIGIN, ORIGIN, new Bundle());
    }

    private void postMessage(String message) {
        if (channelReady && session != null) session.postMessage(message, null);
    }

    @Override
    protected void onResume() {
        super.onResume();
        PrayerScheduler.reschedule(this);
        NativeWork.refreshNow(this);
        if (channelReady && bridgeHandler != null) bridgeHandler.sendStatus();
    }

    @Override
    protected void onRestart() {
        super.onRestart();
        if (browserLaunched) finish();
    }

    @Override
    protected void onSaveInstanceState(@NonNull Bundle outState) {
        super.onSaveInstanceState(outState);
        outState.putBoolean(BROWSER_WAS_LAUNCHED_KEY, browserLaunched);
    }

    @Override
    protected void onDestroy() {
        if (bound && connection != null) unbindService(connection);
        bound = false;
        if (countedActiveLauncher) {
            activeLauncherActivities = Math.max(0, activeLauncherActivities - 1);
            countedActiveLauncher = false;
        }
        super.onDestroy();
    }
}
