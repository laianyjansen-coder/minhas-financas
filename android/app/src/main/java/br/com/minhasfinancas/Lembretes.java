package br.com.minhasfinancas;

import android.Manifest;
import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;

import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.Locale;

/** Lembrete diário: "Não esqueça de registrar seus gastos de hoje." */
final class Lembretes {

    static final String ACAO = "br.com.minhasfinancas.LEMBRETE";
    private static final String PREFS = "lembretes";
    private static final String CANAL = "lembrete_diario";

    private Lembretes() { }

    private static SharedPreferences prefs(Context c) {
        return c.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    static void salvarHora(Context c, String hora) {
        if (hora == null || !hora.matches("\\d{1,2}:\\d{2}")) hora = "20:00";
        prefs(c).edit().putString("hora", hora).apply();
    }

    static void marcarRegistrado(Context c, String data) {
        prefs(c).edit().putString("registrado", data).apply();
    }

    static String hoje() {
        return new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date());
    }

    private static PendingIntent intencao(Context c) {
        Intent i = new Intent(c, LembreteReceiver.class).setAction(ACAO);
        return PendingIntent.getBroadcast(c, 1, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    /** Agenda o próximo lembrete (hoje, se o horário ainda não passou; senão amanhã). */
    static void agendar(Context c) {
        String hora = prefs(c).getString("hora", null);
        if (hora == null) return;
        String[] p = hora.split(":");
        Calendar cal = Calendar.getInstance();
        cal.set(Calendar.HOUR_OF_DAY, Integer.parseInt(p[0]));
        cal.set(Calendar.MINUTE, Integer.parseInt(p[1]));
        cal.set(Calendar.SECOND, 0);
        cal.set(Calendar.MILLISECOND, 0);
        if (cal.getTimeInMillis() <= System.currentTimeMillis() + 1000) cal.add(Calendar.DAY_OF_MONTH, 1);
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        if (am != null) am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, cal.getTimeInMillis(), intencao(c));
    }

    /** Mostra a notificação, a não ser que os gastos de hoje já tenham sido registrados. */
    static void notificar(Context c) {
        if (hoje().equals(prefs(c).getString("registrado", ""))) return;
        if (Build.VERSION.SDK_INT >= 33
                && c.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return;
        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;
        nm.createNotificationChannel(new NotificationChannel(CANAL, "Lembrete diário de gastos", NotificationManager.IMPORTANCE_DEFAULT));
        Intent abrir = new Intent(c, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pi = PendingIntent.getActivity(c, 2, abrir, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Notification n = new Notification.Builder(c, CANAL)
                .setSmallIcon(R.drawable.ic_notificacao)
                .setContentTitle("Minhas Finanças")
                .setContentText("Não esqueça de registrar seus gastos de hoje.")
                .setContentIntent(pi)
                .setAutoCancel(true)
                .build();
        nm.notify(1, n);
    }
}
