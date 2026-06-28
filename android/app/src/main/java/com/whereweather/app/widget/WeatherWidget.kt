package com.whereweather.app.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import com.whereweather.app.MainActivity
import com.whereweather.app.R
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class WeatherWidget : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray,
    ) {
        for (widgetId in appWidgetIds) {
            updateWidget(context, appWidgetManager, widgetId)
        }
    }

    companion object {
        const val PREFS_NAME = "WeatherWidgetData"
        const val KEY_WIDGET_JSON = "widgetJson"

        fun updateWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            widgetId: Int,
        ) {
            val views = RemoteViews(context.packageName, R.layout.widget_weather)

            // Tap on widget opens the app
            val intent = Intent(context, MainActivity::class.java)
            val pending = PendingIntent.getActivity(
                context, 0, intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
            )
            views.setOnClickPendingIntent(R.id.widget_location, pending)

            // Load saved weather data
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val json = prefs.getString(KEY_WIDGET_JSON, null)

            if (json != null) {
                try {
                    val data = JSONObject(json)
                    val temp = data.optDouble("tempC", Double.NaN)
                    val feels = data.optDouble("feelsC", Double.NaN)
                    val location = data.optString("location", "")
                    val condition = data.optString("condition", "")
                    val umbrella = data.optString("umbrella", "")
                    val updatedAt = data.optLong("updatedAt", 0L)

                    views.setTextViewText(
                        R.id.widget_temp,
                        if (!temp.isNaN()) "${temp.toInt()}°" else "—°",
                    )
                    views.setTextViewText(R.id.widget_location, location.ifEmpty { "—" })
                    views.setTextViewText(R.id.widget_condition, condition)
                    views.setTextViewText(
                        R.id.widget_feels,
                        if (!feels.isNaN()) "체감 ${feels.toInt()}°" else "",
                    )
                    views.setTextViewText(R.id.widget_umbrella, umbrella)

                    if (updatedAt > 0) {
                        val fmt = SimpleDateFormat("HH:mm 업데이트", Locale.KOREAN)
                        views.setTextViewText(R.id.widget_updated, fmt.format(Date(updatedAt)))
                    }
                } catch (_: Exception) {
                    views.setTextViewText(R.id.widget_temp, "—°")
                    views.setTextViewText(R.id.widget_location, "앱을 열어 날씨를 불러오세요")
                }
            } else {
                views.setTextViewText(R.id.widget_temp, "—°")
                views.setTextViewText(R.id.widget_location, "앱을 열어 날씨를 불러오세요")
            }

            appWidgetManager.updateAppWidget(widgetId, views)
        }

        /** Called from the Capacitor plugin bridge when new weather data arrives. */
        fun saveAndRefresh(context: Context, jsonString: String) {
            context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                .edit()
                .putString(KEY_WIDGET_JSON, jsonString)
                .apply()

            val manager = AppWidgetManager.getInstance(context)
            val ids = manager.getAppWidgetIds(
                android.content.ComponentName(context, WeatherWidget::class.java),
            )
            for (id in ids) updateWidget(context, manager, id)
        }
    }
}
