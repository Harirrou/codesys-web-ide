package com.ladderlab.app;

import android.annotation.SuppressLint;
import android.annotation.TargetApi;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Insets;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.print.PrintAttributes;
import android.print.PrintManager;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.Toast;
import android.window.OnBackInvokedCallback;
import android.window.OnBackInvokedDispatcher;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

/**
 * Ladder Lab in a WebView. The web app is in the APK (assets) and is shown under a private https address,
 * so it behaves like on a web server (local storage, clipboard) but never uses the network.
 * The page can ask this class for the things it cannot do alone in a WebView: save a file, pick a file, print,
 * and it tells this class its colour (for the area behind the system bars) and when it moved to another page.
 * Android 15 and newer draw every app edge to edge: the frame around the WebView takes the system bars as padding.
 * Android 16 and newer no longer call onBackPressed: the back gesture is a callback, on while the page can go back.
 */
public class MainActivity extends Activity {
    private static final String HOST = "appassets.androidplatform.net";
    private static final String START = "https://" + HOST + "/index.html";
    private static final int REQ_OPEN = 1, REQ_SAVE = 2;
    private static final Map<String, String> MIME = new HashMap<>();
    static {
        MIME.put("html", "text/html"); MIME.put("js", "text/javascript"); MIME.put("css", "text/css");
        MIME.put("svg", "image/svg+xml"); MIME.put("png", "image/png"); MIME.put("woff2", "font/woff2");
        MIME.put("json", "application/json"); MIME.put("webmanifest", "application/manifest+json"); MIME.put("txt", "text/plain");
    }

    private WebView web;
    private FrameLayout frame;            // its colour shows behind the status bar and the navigation bar
    private Object backCallback;          // an OnBackInvokedCallback on Android 13+, registered while the page can go back
    private ValueCallback<Uri[]> picking; // the page waits for a file
    private String saveText;              // text waiting for the place the user picks

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        web = new WebView(this);
        frame = new FrameLayout(this);
        frame.setBackgroundColor(0xFF12202B);
        frame.addView(web, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        setContentView(frame);
        frame.setOnApplyWindowInsetsListener(new View.OnApplyWindowInsetsListener() {
            @Override
            public WindowInsets onApplyWindowInsets(View v, WindowInsets in) {
                if (Build.VERSION.SDK_INT >= 30) Api30.pad(v, in);
                else v.setPadding(in.getSystemWindowInsetLeft(), in.getSystemWindowInsetTop(), in.getSystemWindowInsetRight(), in.getSystemWindowInsetBottom());
                return in;
            }
        });
        barIcons(true);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);   // progress and programs live in localStorage
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        web.addJavascriptInterface(new Bridge(), "LLAndroid");
        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri u = request.getUrl();
                return HOST.equals(u.getHost()) ? asset(u.getPath()) : null;
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri u = request.getUrl();
                if (HOST.equals(u.getHost())) return false;
                try { startActivity(new Intent(Intent.ACTION_VIEW, u)); } catch (ActivityNotFoundException e) { /* no browser */ }
                return true; // links to other sites open in the browser, never inside the app
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                view.evaluateJavascript("window.print=function(){LLAndroid.print()}", null);
                syncBack();
            }

            @Override
            public void doUpdateVisitedHistory(WebView view, String url, boolean isReload) {
                syncBack();
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (picking != null) picking.onReceiveValue(null);
                picking = callback;
                Intent i = new Intent(Intent.ACTION_GET_CONTENT);
                i.addCategory(Intent.CATEGORY_OPENABLE);
                i.setType("*/*");
                try { startActivityForResult(i, REQ_OPEN); }
                catch (ActivityNotFoundException e) { picking = null; callback.onReceiveValue(null); toast(R.string.no_file_app); }
                return true;
            }
        });
        if (state == null || web.restoreState(state) == null) web.loadUrl(START);
    }

    /** One file of the web app from the assets folder of the APK. */
    private WebResourceResponse asset(String path) {
        String p = path == null ? "" : path.replaceFirst("^/+", "");
        if (p.isEmpty()) p = "index.html";
        int dot = p.lastIndexOf('.');
        String mime = MIME.get(dot < 0 ? "" : p.substring(dot + 1).toLowerCase(Locale.ROOT));
        if (mime == null) mime = "application/octet-stream";
        boolean text = mime.startsWith("text/") || mime.endsWith("json") || mime.endsWith("xml");
        try {
            InputStream in = getAssets().open(p);
            return new WebResourceResponse(mime, text ? "utf-8" : null, in);
        } catch (IOException e) {
            return new WebResourceResponse("text/plain", "utf-8", 404, "Not Found", new HashMap<String, String>(), new ByteArrayInputStream(new byte[0]));
        }
    }

    /** Light or dark icons in the system bars: light icons on a dark page. */
    private void barIcons(boolean darkPage) {
        if (Build.VERSION.SDK_INT >= 30) Api30.icons(this, darkPage);
        else {
            int f = getWindow().getDecorView().getSystemUiVisibility();
            int light = View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
            getWindow().getDecorView().setSystemUiVisibility(darkPage ? f & ~light : f | light);
        }
    }

    /** The back gesture belongs to the page only while the page has somewhere to go back to. */
    private void syncBack() {
        if (Build.VERSION.SDK_INT < 33) return; // older Android calls onBackPressed
        boolean can = web.canGoBack();
        if (can && backCallback == null) backCallback = Api33.on(this, new Runnable() {
            @Override
            public void run() { if (web.canGoBack()) web.goBack(); syncBackSoon(); }
        });
        else if (!can && backCallback != null) { Api33.off(this, backCallback); backCallback = null; }
    }

    private void syncBackSoon() {
        web.postDelayed(new Runnable() {
            @Override
            public void run() { syncBack(); }
        }, 120);
    }

    // code that only exists on newer Android lives in its own classes, so that old phones never load it
    @TargetApi(30)
    private static final class Api30 {
        static void pad(View v, WindowInsets in) {
            Insets bars = in.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout());
            Insets ime = in.getInsets(WindowInsets.Type.ime());
            v.setPadding(bars.left, bars.top, bars.right, Math.max(bars.bottom, ime.bottom));
        }

        static void icons(Activity a, boolean darkPage) {
            WindowInsetsController c = a.getWindow().getInsetsController();
            if (c == null) return;
            int light = WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS | WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS;
            c.setSystemBarsAppearance(darkPage ? 0 : light, light);
        }
    }

    @TargetApi(33)
    private static final class Api33 {
        static Object on(Activity a, final Runnable back) {
            OnBackInvokedCallback cb = new OnBackInvokedCallback() {
                @Override
                public void onBackInvoked() { back.run(); }
            };
            a.getOnBackInvokedDispatcher().registerOnBackInvokedCallback(OnBackInvokedDispatcher.PRIORITY_DEFAULT, cb);
            return cb;
        }

        static void off(Activity a, Object cb) {
            a.getOnBackInvokedDispatcher().unregisterOnBackInvokedCallback((OnBackInvokedCallback) cb);
        }
    }

    /** What the page may call: window.LLAndroid.save(name, text, type), print(), bars(colour, dark) and nav(). */
    private class Bridge {
        @JavascriptInterface
        public void save(final String name, final String text, final String type) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    saveText = text == null ? "" : text;
                    Intent i = new Intent(Intent.ACTION_CREATE_DOCUMENT);
                    i.addCategory(Intent.CATEGORY_OPENABLE);
                    i.setType(type == null || type.isEmpty() ? "text/plain" : type);
                    i.putExtra(Intent.EXTRA_TITLE, name == null || name.isEmpty() ? "ladder-lab.txt" : name);
                    try { startActivityForResult(i, REQ_SAVE); }
                    catch (ActivityNotFoundException e) { saveText = null; toast(R.string.no_file_app); }
                }
            });
        }

        /** The page changed its colours: paint the area behind the system bars in the same colour. */
        @JavascriptInterface
        public void bars(final String colour, final boolean darkPage) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    try {
                        int c = Color.parseColor(colour);
                        frame.setBackgroundColor(c);
                        if (Build.VERSION.SDK_INT < 35) { // before Android 15 the bars have their own colour
                            getWindow().setStatusBarColor(c);
                            getWindow().setNavigationBarColor(c);
                        }
                    } catch (RuntimeException e) { /* not a colour: keep the old one */ }
                    barIcons(darkPage);
                }
            });
        }

        /** The page moved to another screen: check again who owns the back gesture. */
        @JavascriptInterface
        public void nav() {
            runOnUiThread(new Runnable() {
                @Override
                public void run() { syncBack(); }
            });
        }

        @JavascriptInterface
        public void print() {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    PrintManager pm = (PrintManager) getSystemService(Context.PRINT_SERVICE);
                    if (pm != null) pm.print("Ladder Lab", web.createPrintDocumentAdapter("Ladder Lab"), new PrintAttributes.Builder().build());
                }
            });
        }
    }

    @Override
    protected void onActivityResult(int request, int result, Intent data) {
        super.onActivityResult(request, result, data);
        if (request == REQ_OPEN) {
            if (picking != null) picking.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(result, data));
            picking = null;
        } else if (request == REQ_SAVE) {
            String text = saveText;
            saveText = null;
            if (result != RESULT_OK || data == null || data.getData() == null || text == null) return;
            try (OutputStream out = getContentResolver().openOutputStream(data.getData())) {
                if (out == null) throw new IOException("no stream");
                out.write(text.getBytes(StandardCharsets.UTF_8));
                toast(R.string.saved);
            } catch (IOException | SecurityException e) {
                toast(R.string.not_saved);
            }
        }
    }

    private void toast(int text) { Toast.makeText(this, text, Toast.LENGTH_SHORT).show(); }

    /** Android 12 and older (newer Android uses the callback of syncBack). */
    @Override
    @SuppressLint("GestureBackNavigation")
    public void onBackPressed() {
        if (web.canGoBack()) web.goBack(); else super.onBackPressed();
    }

    @Override
    protected void onSaveInstanceState(Bundle out) {
        super.onSaveInstanceState(out);
        web.saveState(out);
    }

    @Override
    protected void onPause() { web.onPause(); super.onPause(); }

    @Override
    protected void onResume() { super.onResume(); web.onResume(); }

    @Override
    protected void onDestroy() { web.destroy(); super.onDestroy(); }
}
