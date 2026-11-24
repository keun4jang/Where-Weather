package com.whereweather.app.rain

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import com.whereweather.app.MainActivity
import com.whereweather.app.R
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale
import java.util.concurrent.TimeUnit

/**
 * Background rain check: runs every ~3h even when the app is closed, fetches the
 * Open-Meteo daily forecast for the saved location and notifies when
 *   - tomorrow is rainy (once per target date), or
 *   - any of today+2 … today+7 is rainy (again only when the set of rainy days changes).
 *
 * KEEP THRESHOLDS IN SYNC with src/weather/rainAlert.ts.
 */
class RainAlertWorker(
    private val ctx: Context,
    params: WorkerParameters,
) : CoroutineWorker(ctx, params) {

    private data class Day(val date: String, val prob: Double, val mm: Double) {
        fun rainy(probThreshold: Double): Boolean = prob >= probThreshold || mm >= RAIN_MM_THRESHOLD
    }

    override suspend fun doWork(): Result {
        val prefs = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        if (!prefs.getBoolean(KEY_ENABLED, false)) return Result.success()
        if (!prefs.contains(KEY_LAT) || !prefs.contains(KEY_LON)) return Result.success()
        if (!NotificationManagerCompat.from(ctx).areNotificationsEnabled()) return Result.success()

        // Quiet hours: don't buzz the phone at night; the next run picks it up.
        val hour = Calendar.getInstance().get(Calendar.HOUR_OF_DAY)
        if (hour < QUIET_END_HOUR || hour >= QUIET_START_HOUR) return Result.success()

        val threshold = prefs.getInt(KEY_PROB_THRESHOLD, RAIN_PROB_THRESHOLD.toInt()).toDouble()
        val lat = prefs.getFloat(KEY_LAT, 0f).toDouble()
        val lon = prefs.getFloat(KEY_LON, 0f).toDouble()
        val days = try {
            withContext(Dispatchers.IO) { fetchDays(lat, lon) }
        } catch (_: Exception) {
            return Result.retry()
        }

        val today = isoDate(Calendar.getInstance())
        val todayIdx = days.indexOfFirst { it.date == today }
        if (todayIdx < 0) return Result.success()

        val location = prefs.getString(KEY_NAME, "") ?: ""
        val editor = prefs.edit()

        val tomorrow = days.getOrNull(todayIdx + 1)
        if (tomorrow != null && tomorrow.rainy(threshold) && prefs.getString(KEY_LAST_TOMORROW, null) != tomorrow.date) {
            notify(
                ID_TOMORROW,
                fill(prefs.getString(KEY_T_TOMORROW_TITLE, null) ?: "☔ 내일 비 예보 — 스쿠터 주의", location, tomorrow),
                fill(prefs.getString(KEY_T_TOMORROW_BODY, null) ?: "{location} 강수확률 {prob}% · {mm}mm", location, tomorrow),
            )
            editor.putString(KEY_LAST_TOMORROW, tomorrow.date)
        }

        val week = days.subList(
            (todayIdx + 2).coerceAtMost(days.size),
            (todayIdx + 1 + WEEK_DAYS_AHEAD).coerceAtMost(days.size),
        ).filter { it.rainy(threshold) }
        val sig = week.joinToString(",") { it.date }
        if (week.isNotEmpty() && prefs.getString(KEY_LAST_WEEK_SIG, null) != sig &&
            prefs.getString(KEY_LAST_WEEK_DAY, null) != today
        ) {
            val label = week.joinToString(", ") { dayLabel(it.date) }
            val title = prefs.getString(KEY_T_WEEK_TITLE, null) ?: "🌧 이번 주 비 오는 날"
            val body = prefs.getString(KEY_T_WEEK_BODY, null) ?: "{location}: {days}"
            notify(
                ID_WEEK,
                title.replace("{location}", location).replace("{days}", label),
                body.replace("{location}", location).replace("{days}", label),
            )
            editor.putString(KEY_LAST_WEEK_SIG, sig).putString(KEY_LAST_WEEK_DAY, today)
        }

        editor.apply()
        return Result.success()
    }

    private fun fetchDays(lat: Double, lon: Double): List<Day> {
        val url = URL(
            "https://api.open-meteo.com/v1/forecast?latitude=$lat&longitude=$lon" +
                "&daily=precipitation_sum,precipitation_probability_max&timezone=auto&forecast_days=9",
        )
        val conn = url.openConnection() as HttpURLConnection
        conn.connectTimeout = 15_000
        conn.readTimeout = 15_000
        try {
            if (conn.responseCode != 200) throw IllegalStateException("HTTP ${conn.responseCode}")
            val json = JSONObject(conn.inputStream.bufferedReader().use { it.readText() })
            val daily = json.getJSONObject("daily")
            val time = daily.getJSONArray("time")
            val mm = daily.optJSONArray("precipitation_sum")
            val prob = daily.optJSONArray("precipitation_probability_max")
            return (0 until time.length()).map { i ->
                Day(
                    date = time.getString(i),
                    prob = prob?.optDouble(i, 0.0)?.takeUnless { it.isNaN() } ?: 0.0,
                    mm = mm?.optDouble(i, 0.0)?.takeUnless { it.isNaN() } ?: 0.0,
                )
            }
        } finally {
            conn.disconnect()
        }
    }

    private fun fill(template: String, location: String, day: Day): String =
        template.replace("{location}", location)
            .replace("{prob}", day.prob.toInt().toString())
            .replace("{mm}", String.format(Locale.US, "%.1f", day.mm))

    private fun dayLabel(iso: String): String = try {
        val d = SimpleDateFormat("yyyy-MM-dd", Locale.US).parse(iso)
        if (d == null) iso else SimpleDateFormat("M/d(E)", Locale.getDefault()).format(d)
    } catch (_: Exception) {
        iso
    }

    private fun notify(id: Int, title: String, body: String) {
        ensureChannel(ctx)
        val intent = Intent(ctx, MainActivity::class.java)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        val pending = PendingIntent.getActivity(
            ctx, id, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        val notification = NotificationCompat.Builder(ctx, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setContentIntent(pending)
            .setAutoCancel(true)
            .build()
        try {
            NotificationManagerCompat.from(ctx).notify(id, notification)
        } catch (_: SecurityException) {
            // POST_NOTIFICATIONS revoked between the check and now — ignore.
        }
    }

    companion object {
        const val RAIN_PROB_THRESHOLD = 60.0
        const val RAIN_MM_THRESHOLD = 1.0
        const val WEEK_DAYS_AHEAD = 7
        private const val QUIET_START_HOUR = 22
        private const val QUIET_END_HOUR = 7

        const val PREFS = "RainAlert"
        const val KEY_ENABLED = "enabled"
        const val KEY_LAT = "lat"
        const val KEY_LON = "lon"
        const val KEY_NAME = "name"
        const val KEY_PROB_THRESHOLD = "probThreshold"
        const val KEY_T_TOMORROW_TITLE = "tTomorrowTitle"
        const val KEY_T_TOMORROW_BODY = "tTomorrowBody"
        const val KEY_T_WEEK_TITLE = "tWeekTitle"
        const val KEY_T_WEEK_BODY = "tWeekBody"
        private const val KEY_LAST_TOMORROW = "lastTomorrowDate"
        private const val KEY_LAST_WEEK_SIG = "lastWeekSig"
        private const val KEY_LAST_WEEK_DAY = "lastWeekNotifiedDay"

        private const val CHANNEL_ID = "rain-alert"
        private const val ID_TOMORROW = 7001
        private const val ID_WEEK = 7002
        private const val PERIODIC_NAME = "RainAlertPeriodic"
        private const val ONESHOT_NAME = "RainAlertNow"

        private fun isoDate(cal: Calendar): String =
            SimpleDateFormat("yyyy-MM-dd", Locale.US).format(cal.time)

        private fun constraints() = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()

        fun ensureChannel(context: Context) {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
            val nm = context.getSystemService(NotificationManager::class.java) ?: return
            if (nm.getNotificationChannel(CHANNEL_ID) != null) return
            nm.createNotificationChannel(
                NotificationChannel(CHANNEL_ID, "Rain alerts", NotificationManager.IMPORTANCE_DEFAULT),
            )
        }

        /** Periodic check (~every 3h). Safe to call on every app start. */
        fun schedule(context: Context) {
            val request = PeriodicWorkRequestBuilder<RainAlertWorker>(3, TimeUnit.HOURS)
                .setConstraints(constraints())
                .build()
            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                PERIODIC_NAME, ExistingPeriodicWorkPolicy.KEEP, request,
            )
        }

        /** Immediate one-off check, e.g. right after the user changes settings. */
        fun runNow(context: Context) {
            val request = OneTimeWorkRequestBuilder<RainAlertWorker>()
                .setConstraints(constraints())
                .build()
            WorkManager.getInstance(context).enqueueUniqueWork(
                ONESHOT_NAME, ExistingWorkPolicy.REPLACE, request,
            )
        }
    }
}
