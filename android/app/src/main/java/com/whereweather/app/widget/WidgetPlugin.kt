package com.whereweather.app.widget

import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

@CapacitorPlugin(name = "WeatherWidget")
class WidgetPlugin : Plugin() {

    @PluginMethod
    fun update(call: PluginCall) {
        val json = call.getString("data") ?: run {
            call.reject("Missing data")
            return
        }
        WeatherWidget.saveAndRefresh(context, json)
        call.resolve()
    }
}
