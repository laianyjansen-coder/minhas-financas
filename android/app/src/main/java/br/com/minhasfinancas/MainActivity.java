package br.com.minhasfinancas;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.webkit.WebViewAssetLoader;

/** Tela única do app: mostra a mesma dashboard da versão web, a partir dos arquivos dentro do app. */
public class MainActivity extends Activity {

    private static final String HOST = "appassets.androidplatform.net";
    private static final String INICIO = "https://" + HOST + "/assets/www/index.html";
    private static final int REQ_ARQUIVO = 21;
    private static final int REQ_MICROFONE = 22;
    private WebView web;
    private ValueCallback<Uri[]> arquivoEscolhido;
    private PermissionRequest pedidoMicrofone;

    @Override
    protected void onCreate(Bundle estado) {
        super.onCreate(estado);
        web = new WebView(this);
        setContentView(web);

        final WebViewAssetLoader carregador = new WebViewAssetLoader.Builder()
                .setDomain(HOST)
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return carregador.shouldInterceptRequest(request.getUrl());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (HOST.equals(uri.getHost())) return false;
                // Links externos (ex.: link de um produto da wishlist) abrem no navegador.
                try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); } catch (Exception ignorado) { }
                return true;
            }
        });

        // Enviar PDF/print (escolher arquivo) e gravar áudio (microfone) para a IA.
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (arquivoEscolhido != null) arquivoEscolhido.onReceiveValue(null);
                arquivoEscolhido = callback;
                try {
                    startActivityForResult(params.createIntent(), REQ_ARQUIVO);
                } catch (Exception e) {
                    arquivoEscolhido = null;
                    callback.onReceiveValue(null);
                    return false;
                }
                return true;
            }

            @Override
            public void onPermissionRequest(final PermissionRequest pedido) {
                runOnUiThread(() -> {
                    boolean audio = false;
                    for (String r : pedido.getResources()) if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(r)) audio = true;
                    if (!audio) { pedido.deny(); return; }
                    if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
                        pedido.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});
                    } else {
                        pedidoMicrofone = pedido;
                        requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, REQ_MICROFONE);
                    }
                });
            }
        });

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setTextZoom(100);

        web.addJavascriptInterface(new Ponte(this), "AndroidApp");

        if (estado != null) web.restoreState(estado);
        else web.loadUrl(INICIO);
    }

    /** Cores das barras do sistema conforme o tema claro/escuro escolhido no app. */
    void aplicarTema(boolean escuro) {
        int fundo = escuro ? Color.parseColor("#1A1B16") : Color.parseColor("#EEEFEB");
        getWindow().setStatusBarColor(fundo);
        getWindow().setNavigationBarColor(fundo);
        getWindow().getDecorView().setBackgroundColor(fundo);
        View decor = getWindow().getDecorView();
        int f = decor.getSystemUiVisibility();
        int claros = View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
        decor.setSystemUiVisibility(escuro ? (f & ~claros) : (f | claros));
    }

    @Override
    protected void onActivityResult(int pedido, int resultado, Intent dados) {
        if (pedido == REQ_ARQUIVO) {
            if (arquivoEscolhido != null) arquivoEscolhido.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(resultado, dados));
            arquivoEscolhido = null;
            return;
        }
        super.onActivityResult(pedido, resultado, dados);
    }

    @Override
    public void onRequestPermissionsResult(int pedido, String[] permissoes, int[] resultados) {
        if (pedido == REQ_MICROFONE && pedidoMicrofone != null) {
            if (resultados.length > 0 && resultados[0] == PackageManager.PERMISSION_GRANTED)
                pedidoMicrofone.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});
            else pedidoMicrofone.deny();
            pedidoMicrofone = null;
            return;
        }
        super.onRequestPermissionsResult(pedido, permissoes, resultados);
    }

    @Override
    protected void onSaveInstanceState(Bundle saida) {
        super.onSaveInstanceState(saida);
        web.saveState(saida);
    }

    @Override
    public void onBackPressed() {
        if (web.canGoBack()) web.goBack();
        else super.onBackPressed();
    }

    @Override
    protected void onDestroy() {
        if (web != null) web.destroy();
        super.onDestroy();
    }
}
