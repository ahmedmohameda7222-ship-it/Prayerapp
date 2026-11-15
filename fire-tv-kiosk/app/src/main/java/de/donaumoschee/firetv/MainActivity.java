package de.donaumoschee.firetv;

import android.app.Activity;
import android.graphics.Bitmap;
import android.net.http.SslError;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.SslErrorHandler;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

/**
 * Separate, kiosk-style Fire OS Android Activity for the official TV website.
 *
 * Unlike an Amazon Silk web tab, this Activity owns the Android window and
 * requests FLAG_KEEP_SCREEN_ON for its entire foreground lifetime. No fake
 * remote clicks, 4-minute page refreshes, hidden video, or background wakes.
 *
 * Android permits the OS to sleep if this Activity loses foreground focus.
 * Power cuts, TV firmware energy-saving, and non-Android Vega OS are beyond
 * this flag's authority.
 */
public final class MainActivity extends Activity {
    private static final long RETRY_AFTER_NETWORK_FAILURE_MS = 30_000L;
    private static final int IMMERSIVE_FLAGS =
        View.SYSTEM_UI_FLAG_LAYOUT_STABLE
        | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
        | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
        | View.SYSTEM_UI_FLAG_FULLSCREEN
        | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
        | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY;

    private final Handler retryHandler = new Handler(Looper.getMainLooper());
    private WebView webView;
    private boolean loadFailed;
    private boolean retryScheduled;
    private boolean destroyed;

    private final Runnable retryMainFrame = new Runnable() {
        @Override public void run() {
            retryScheduled = false;
            if (!destroyed && webView != null && loadFailed) {
                webView.loadUrl(KioskPolicy.DISPLAY_URL);
            }
        }
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        applyImmersiveMode();
        createWebView();
    }

    @Override
    protected void onResume() {
        super.onResume();
        // Amazon's documented foreground Activity mechanism for preventing
        // Fire TV screen saver / Daydream / standby while signage is displayed.
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        applyImmersiveMode();
        if (webView != null) webView.onResume();
    }

    @Override
    protected void onPause() {
        // Don't keep the screen on if the user leaves the signage application.
        getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        if (webView != null) webView.onPause();
        super.onPause();
    }

    private void applyImmersiveMode() {
        getWindow().getDecorView().setSystemUiVisibility(IMMERSIVE_FLAGS);
    }

    private void createWebView() {
        WebView next = new WebView(this);
        webView = next;
        next.setBackgroundColor(0xFF07130F);
        next.setKeepScreenOn(true);
        next.setHorizontalScrollBarEnabled(false);
        next.setVerticalScrollBarEnabled(false);
        next.setFocusable(true);
        next.setFocusableInTouchMode(true);

        WebSettings settings = next.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(false);
        settings.setMediaPlaybackRequiresUserGesture(true);
        if (Build.VERSION.SDK_INT >= 26) settings.setSafeBrowsingEnabled(true);

        next.setWebChromeClient(new WebChromeClient());
        next.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return !KioskPolicy.isTrustedUrl(request.getUrl().toString());
            }

            @SuppressWarnings("deprecation")
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                return !KioskPolicy.isTrustedUrl(url);
            }

            @Override
            public void onPageStarted(WebView view, String url, Bitmap favicon) {
                loadFailed = false;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                if (!loadFailed && KioskPolicy.isTrustedUrl(url)) {
                    cancelRetry();
                }
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) scheduleRetry();
            }

            @Override
            public void onReceivedHttpError(WebView view, WebResourceRequest request, WebResourceResponse response) {
                if (request.isForMainFrame() && response.getStatusCode() >= 500) scheduleRetry();
            }

            @Override
            public void onReceivedSslError(WebView view, SslErrorHandler handler, SslError error) {
                handler.cancel();
            }

            @Override
            public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
                if (Build.VERSION.SDK_INT < 26) return false;
                ViewGroup parent = (ViewGroup) view.getParent();
                if (parent != null) parent.removeView(view);
                view.destroy();
                webView = null;
                cancelRetry();
                createWebView();
                return true;
            }
        });

        setContentView(next);
        next.loadUrl(KioskPolicy.DISPLAY_URL);
    }

    private void scheduleRetry() {
        loadFailed = true;
        if (retryScheduled || destroyed) return;
        retryScheduled = true;
        retryHandler.postDelayed(retryMainFrame, RETRY_AFTER_NETWORK_FAILURE_MS);
    }

    private void cancelRetry() {
        retryScheduled = false;
        retryHandler.removeCallbacks(retryMainFrame);
    }

    @Override
    protected void onDestroy() {
        destroyed = true;
        cancelRetry();
        if (webView != null) {
            WebView held = webView;
            webView = null;
            held.stopLoading();
            held.destroy();
        }
        super.onDestroy();
    }
}
