package com.ladderlab.app;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.print.PrintAttributes;
import android.print.PrintManager;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

/**
 * Ladder Lab in a WebView. The web app is in the APK (assets) and is shown under a private https address,
 * so it behaves like on a web server (local storage, clipboard) but never uses the network.
 * The page can ask this class for three things it cannot do alone in a WebView: save a file, pick a file, print.
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
    private ValueCallback<Uri[]> picking; // the page waits for a file
    private String saveText;              // text waiting for the place the user picks

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        web = new WebView(this);
        setContentView(web);
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
        String mime = MIME.get(dot < 0 ? "" : p.substring(dot + 1).toLowerCase());
        if (mime == null) mime = "application/octet-stream";
        boolean text = mime.startsWith("text/") || mime.endsWith("json") || mime.endsWith("xml");
        try {
            InputStream in = getAssets().open(p);
            return new WebResourceResponse(mime, text ? "utf-8" : null, in);
        } catch (IOException e) {
            return new WebResourceResponse("text/plain", "utf-8", 404, "Not Found", new HashMap<String, String>(), new ByteArrayInputStream(new byte[0]));
        }
    }

    /** What the page may call: window.LLAndroid.save(name, text, type) and window.LLAndroid.print(). */
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

    @Override
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
