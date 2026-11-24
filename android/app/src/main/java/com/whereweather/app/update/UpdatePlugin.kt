package com.whereweather.app.update

import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import kotlin.concurrent.thread

/**
 * JS bridge:
 *  - check()   → { available, currentCode, currentName, latestCode, latestName }
 *  - install() → { status: "installer" | "needsPermission" }
 */
@CapacitorPlugin(name = "AppUpdate")
class UpdatePlugin : Plugin() {

    @PluginMethod
    fun check(call: PluginCall) {
        thread {
            try {
                val latest = AppUpdater.fetchLatest()
                call.resolve(
                    JSObject()
                        .put("available", latest.versionCode > AppUpdater.currentVersionCode)
                        .put("currentCode", AppUpdater.currentVersionCode)
                        .put("currentName", AppUpdater.currentVersionName)
                        .put("latestCode", latest.versionCode)
                        .put("latestName", latest.versionName),
                )
            } catch (e: Exception) {
                call.reject("update check failed: ${e.message}")
            }
        }
    }

    @PluginMethod
    fun install(call: PluginCall) {
        if (!AppUpdater.canInstall(context)) {
            AppUpdater.openInstallPermissionSettings(context)
            call.resolve(JSObject().put("status", "needsPermission"))
            return
        }
        thread {
            try {
                val apk = AppUpdater.download(context)
                AppUpdater.launchInstaller(context, apk)
                call.resolve(JSObject().put("status", "installer"))
            } catch (e: Exception) {
                call.reject("update download failed: ${e.message}")
            }
        }
    }
}
