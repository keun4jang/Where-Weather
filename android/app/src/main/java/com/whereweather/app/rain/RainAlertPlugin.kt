package com.whereweather.app.rain

import android.annotation.SuppressLint
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.whereweather.app.daily.DailyWeatherWorker

/** JS bridge: `RainAlert.configure({ enabled, latitude, longitude, locationName, strings })`. */
@CapacitorPlugin(name = "RainAlert")
class RainAlertPlugin : Plugin() {

    @PluginMethod
    fun configure(call: PluginCall) {
        val enabled = call.getBoolean("enabled", false) ?: false
        val editor = context.getSharedPreferences(RainAlertWorker.PREFS, Context.MODE_PRIVATE).edit()
            .putBoolean(RainAlertWorker.KEY_ENABLED, enabled)

        val lat = call.getDouble("latitude")
        val lon = call.getDouble("longitude")
        if (lat != null && lon != null) {
            editor.putFloat(RainAlertWorker.KEY_LAT, lat.toFloat())
                .putFloat(RainAlertWorker.KEY_LON, lon.toFloat())
        }
        call.getString("locationName")?.let { editor.putString(RainAlertWorker.KEY_NAME, it) }

        call.getObject("strings")?.let { s ->
            s.getString("tomorrowTitle")?.let { editor.putString(RainAlertWorker.KEY_T_TOMORROW_TITLE, it) }
            s.getString("tomorrowBody")?.let { editor.putString(RainAlertWorker.KEY_T_TOMORROW_BODY, it) }
            s.getString("weekTitle")?.let { editor.putString(RainAlertWorker.KEY_T_WEEK_TITLE, it) }
            s.getString("weekBody")?.let { editor.putString(RainAlertWorker.KEY_T_WEEK_BODY, it) }
        }
        editor.apply()

        if (enabled) {
            RainAlertWorker.schedule(context)
            RainAlertWorker.runNow(context)
        }
        call.resolve()
    }

    /** Daily 06/09/12/15/18h notifications with weather fetched at send time. */
    @PluginMethod
    fun configureDaily(call: PluginCall) {
        DailyWeatherWorker.setEnabled(context, call.getBoolean("enabled", false) ?: false)
        call.resolve()
    }

    /** `{ ignoring: boolean }` — true when the app is exempt from battery optimization (Doze). */
    @PluginMethod
    fun batteryStatus(call: PluginCall) {
        val ignoring = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val pm = context.getSystemService(Context.POWER_SERVICE) as PowerManager
            pm.isIgnoringBatteryOptimizations(context.packageName)
        } else {
            true
        }
        call.resolve(JSObject().put("ignoring", ignoring))
    }

    /**
     * Shows the system dialog asking to exempt this app from battery optimization.
     * Falls back to the battery-optimization list if the direct dialog is unavailable.
     * Note: vendor battery savers (e.g. Samsung "sleeping apps") are separate and
     * must be changed by the user in system settings.
     */
    @SuppressLint("BatteryLife")
    @PluginMethod
    fun requestBatteryExemption(call: PluginCall) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
            call.resolve()
            return
        }
        try {
            val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS)
                .setData(Uri.parse("package:${context.packageName}"))
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            context.startActivity(intent)
        } catch (_: Exception) {
            try {
                context.startActivity(
                    Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS)
                        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
                )
            } catch (_: Exception) { /* no settings screen available */ }
        }
        call.resolve()
    }
}
