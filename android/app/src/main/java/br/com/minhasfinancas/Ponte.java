package br.com.minhasfinancas;

import android.Manifest;
import android.app.Activity;
import android.content.pm.PackageManager;
import android.os.Build;
import android.webkit.JavascriptInterface;

/** Funções do Android que a dashboard pode chamar (window.AndroidApp no JavaScript). */
public class Ponte {

    private final Activity atividade;

    Ponte(Activity atividade) {
        this.atividade = atividade;
    }

    /** Agenda o lembrete diário no horário "HH:MM" escolhido no Rastreador de hábitos. */
    @JavascriptInterface
    public void agendarLembrete(String hora) {
        Lembretes.salvarHora(atividade, hora);
        Lembretes.agendar(atividade);
    }

    /** Informa que os gastos do dia (AAAA-MM-DD) já foram registrados: o lembrete daquele dia não aparece. */
    @JavascriptInterface
    public void marcarRegistrado(String data) {
        Lembretes.marcarRegistrado(atividade, data);
    }

    /** Pede permissão de notificação (necessária a partir do Android 13). */
    @JavascriptInterface
    public void pedirPermissaoNotificacao() {
        if (Build.VERSION.SDK_INT >= 33
                && atividade.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            atividade.runOnUiThread(() -> atividade.requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, 10));
        }
    }

    @JavascriptInterface
    public boolean notificacoesPermitidas() {
        return Build.VERSION.SDK_INT < 33
                || atividade.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED;
    }
}
