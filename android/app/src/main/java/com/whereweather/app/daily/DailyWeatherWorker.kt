package com.whereweather.app.daily

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import androidx.work.workDataOf
import com.whereweather.app.MainActivity
import com.whereweather.app.R
import com.whereweather.app.rain.RainAlertWorker
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
 * Daily weather notifications at 06/09/12/15/18h with weather fetched AT SEND TIME.
 *
 * Replaces the old LocalNotifications repeating schedule, whose body was frozen
 * at scheduling time and therefore showed stale weather for days.
 *
 * Each run handles one slot, then enqueues the next slot as its own unique work,
 * so the chain keeps going with the app closed. Timing is WorkManager-accurate
 * (usually within minutes; later if the phone is in deep battery saving).
 */
class DailyWeatherWorker(
    private val ctx: Context,
    params: WorkerParameters,
) : CoroutineWorker(ctx, params) {

    override suspend fun doWork(): Result {
        val slotHour = inputData.getInt(KEY_SLOT_HOUR, -1)
        val slotAt = inputData.getLong(KEY_SLOT_AT, 0L)
        val test = inputData.getBoolean(KEY_TEST, false)
        val prefs = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

        if (!test) {
            // Book the next slot first so a failure here never breaks the chain.
            if (runAttemptCount == 0) scheduleNext(ctx, System.currentTimeMillis() + 60_000)
            if (!prefs.getBoolean(KEY_ENABLED, false)) return Result.success()
            // The user may have removed this hour since it was booked.
            if (slotHour !in hours(ctx)) return Result.success()
            // Too late to be useful (e.g. phone was off): skip rather than send "9시" news at noon.
            if (slotAt > 0 && System.currentTimeMillis() - slotAt > MAX_LATE_MS) return Result.success()
        }
        if (!NotificationManagerCompat.from(ctx).areNotificationsEnabled()) return Result.success()

        val rain = ctx.getSharedPreferences(RainAlertWorker.PREFS, Context.MODE_PRIVATE)
        if (!rain.contains(RainAlertWorker.KEY_LAT)) {
            if (test) notify(-1, "🔔 테스트 알림 — 알림은 정상이에요. (위치가 아직 없어 날씨는 생략)", test = true)
            return Result.success()
        }
        val lat = rain.getFloat(RainAlertWorker.KEY_LAT, 0f).toDouble()
        val lon = rain.getFloat(RainAlertWorker.KEY_LON, 0f).toDouble()
        val name = rain.getString(RainAlertWorker.KEY_NAME, "") ?: ""

        val now = try {
            withContext(Dispatchers.IO) { fetchNow(lat, lon) }
        } catch (_: Exception) {
            if (test) {
                notify(-1, "🔔 테스트 알림 — 알림은 정상, 날씨는 못 받아왔어요 (인터넷 확인).", test = true)
                return Result.success()
            }
            return if (runAttemptCount < 3) Result.retry() else Result.success()
        }

        notify(slotHour, buildBody(if (test) 12 else slotHour, name, now), test)
        return Result.success()
    }

    private data class Now(val tempC: Double, val precipProb: Double, val uv: Double)

    private fun fetchNow(lat: Double, lon: Double): Now {
        val url = URL(
            "https://api.open-meteo.com/v1/forecast?latitude=$lat&longitude=$lon" +
                "&current=temperature_2m&hourly=precipitation_probability,uv_index" +
                "&forecast_hours=3&timezone=auto",
        )
        val conn = url.openConnection() as HttpURLConnection
        conn.connectTimeout = 15_000
        conn.readTimeout = 15_000
        try {
            if (conn.responseCode != 200) throw IllegalStateException("HTTP ${conn.responseCode}")
            val json = JSONObject(conn.inputStream.bufferedReader().use { it.readText() })
            val temp = json.getJSONObject("current").getDouble("temperature_2m")
            val hourly = json.optJSONObject("hourly")
            // Max over the next few hours: "will I need an umbrella soon?"
            fun maxOf(key: String): Double {
                val arr = hourly?.optJSONArray(key) ?: return 0.0
                var m = 0.0
                for (i in 0 until arr.length()) {
                    val v = arr.optDouble(i, 0.0)
                    if (!v.isNaN() && v > m) m = v
                }
                return m
            }
            return Now(temp, maxOf("precipitation_probability"), maxOf("uv_index"))
        } finally {
            conn.disconnect()
        }
    }

    /** Same wording as the previous JS buildBody/buildMorningBody. */
    private fun buildBody(slotHour: Int, loc: String, n: Now): String {
        val temp = Math.round(n.tempC)
        val prob = Math.round(n.precipProb)
        return if (slotHour == 6) {
            val parts = mutableListOf("☀️ 좋은 아침! $loc $temp°".replace("  ", " "))
            if (prob >= 50) parts.add("☂️ 우산 필요")
            if (Math.round(n.uv) >= 7) parts.add("🧴 자외선 강함")
            parts.joinToString(" · ")
        } else {
            val umbrella = if (prob >= 50) " ☂️ 우산 챙기세요!" else ""
            "$loc $temp°$umbrella".trim()
        }
    }

    private fun notify(slotHour: Int, body: String, test: Boolean = false) {
        ensureChannel(ctx)
        val intent = Intent(ctx, MainActivity::class.java)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        val pending = PendingIntent.getActivity(
            ctx, NOTIF_ID, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        val notification = NotificationCompat.Builder(ctx, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(if (test) "Where Weather 🔔 테스트" else "Where Weather 🌦️")
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setContentIntent(pending)
            .setAutoCancel(true)
            .setWhen(System.currentTimeMillis())
            .build()
        try {
            // One id: each slot replaces the previous one instead of piling up.
            NotificationManagerCompat.from(ctx).notify(NOTIF_ID, notification)
        } catch (_: SecurityException) { /* permission revoked */ }
    }

    companion object {
        private val DEFAULT_HOURS = intArrayOf(6, 9, 12, 15, 18)
        const val PREFS = "DailyWeather"
        const val KEY_ENABLED = "enabled"
        private const val KEY_HOURS = "hours"
        private const val KEY_TEST = "test"
        private const val KEY_SLOT_HOUR = "slotHour"
        private const val KEY_SLOT_AT = "slotAt"
        private const val TAG = "daily-weather"
        private const val CHANNEL_ID = "weather-daily"
        private const val NOTIF_ID = 7100
        private const val MAX_LATE_MS = 90 * 60 * 1000L

        private fun ensureChannel(context: Context) {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
            val nm = context.getSystemService(NotificationManager::class.java) ?: return
            if (nm.getNotificationChannel(CHANNEL_ID) != null) return
            nm.createNotificationChannel(
                NotificationChannel(CHANNEL_ID, "Daily weather", NotificationManager.IMPORTANCE_DEFAULT),
            )
        }

        /** Configured notification hours (sorted), default 6/9/12/15/18. */
        fun hours(context: Context): IntArray {
            val raw = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY_HOURS, null)
                ?: return DEFAULT_HOURS
            return raw.split(',').mapNotNull { it.trim().toIntOrNull() }
                .filter { it in 0..23 }.distinct().sorted().toIntArray()
        }

        /** Next slot strictly after [fromMs], or null when no hours are selected. */
        fun nextSlot(context: Context, fromMs: Long): Pair<Int, Long>? {
            val slotHours = hours(context)
            if (slotHours.isEmpty()) return null
            val cal = Calendar.getInstance().apply { timeInMillis = fromMs }
            for (dayOffset in 0..1) {
                for (h in slotHours) {
                    val c = Calendar.getInstance().apply {
                        timeInMillis = fromMs
                        add(Calendar.DAY_OF_YEAR, dayOffset)
                        set(Calendar.HOUR_OF_DAY, h)
                        set(Calendar.MINUTE, 0)
                        set(Calendar.SECOND, 0)
                        set(Calendar.MILLISECOND, 0)
                    }
                    if (c.timeInMillis > cal.timeInMillis) return h to c.timeInMillis
                }
            }
            return null
        }

        /** Idempotent: one unique work per slot (KEEP), so repeated calls don't duplicate. */
        fun scheduleNext(context: Context, fromMs: Long = System.currentTimeMillis()) {
            val (hour, at) = nextSlot(context, fromMs) ?: return
            val delay = (at - System.currentTimeMillis()).coerceAtLeast(0)
            val request = OneTimeWorkRequestBuilder<DailyWeatherWorker>()
                .setInitialDelay(delay, TimeUnit.MILLISECONDS)
                .setInputData(workDataOf(KEY_SLOT_HOUR to hour, KEY_SLOT_AT to at))
                .setConstraints(
                    Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build(),
                )
                .setBackoffCriteria(BackoffPolicy.LINEAR, 5, TimeUnit.MINUTES)
                .addTag(TAG)
                .build()
            val slotName = "DailyWeather-" + SimpleDateFormat("yyyyMMddHH", Locale.US).format(at)
            WorkManager.getInstance(context)
                .enqueueUniqueWork(slotName, ExistingWorkPolicy.KEEP, request)
        }

        /** Called from MainActivity on every start: restarts the chain if it was lost. */
        fun ensureScheduled(context: Context) {
            val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            if (prefs.getBoolean(KEY_ENABLED, false)) scheduleNext(context)
        }

        fun configure(context: Context, enabled: Boolean, hours: List<Int>?) {
            val editor = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
                .putBoolean(KEY_ENABLED, enabled)
            if (hours != null) editor.putString(KEY_HOURS, hours.joinToString(","))
            editor.commit()
            // Drop already-booked slots (hours may have changed), then rebook.
            WorkManager.getInstance(context).cancelAllWorkByTag(TAG)
            if (enabled) scheduleNext(context)
        }

        /** Sends one notification now with fresh weather, ignoring time slots. */
        fun sendTest(context: Context) {
            val request = OneTimeWorkRequestBuilder<DailyWeatherWorker>()
                .setInputData(workDataOf(KEY_TEST to true))
                .build()
            WorkManager.getInstance(context)
                .enqueueUniqueWork("DailyWeatherTest", ExistingWorkPolicy.REPLACE, request)
        }
    }
}
