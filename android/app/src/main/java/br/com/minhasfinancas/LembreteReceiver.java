package br.com.minhasfinancas;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Recebe o alarme do lembrete diário e reagenda após reiniciar o celular ou atualizar o app. */
public class LembreteReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        String acao = intent == null ? null : intent.getAction();
        if (Lembretes.ACAO.equals(acao)) Lembretes.notificar(context);
        Lembretes.agendar(context);
    }
}
