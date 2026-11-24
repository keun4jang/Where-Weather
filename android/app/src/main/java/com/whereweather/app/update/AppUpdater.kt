package com.whereweather.app.update

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.core.content.FileProvider
import com.whereweather.app.BuildConfig
import org.json.JSONObject
import java.io.File
import java.net.HttpURLConnection
import java.net.URL

/**
 * Self-update from the GitHub "latest-apk" release (public repo, no server needed).
 * CI uploads app-debug.apk + version.json ({ versionCode, versionName, sha }).
 *
 * Android never allows a silent install for apps outside the Play Store: the user
 * always confirms one system "Install" tap. Everything before that is automatic.
 */
object AppUpdater {
    private const val BASE = "https://github.com/keun4jang/Where-Weather/releases/download/latest-apk"
    const val VERSION_URL = "$BASE/version.json"
    private const val APK_URL = "$BASE/app-debug.apk"

    data class Latest(val versionCode: Int, val versionName: String)

    val currentVersionCode: Int get() = BuildConfig.VERSION_CODE
    val currentVersionName: String get() = BuildConfig.VERSION_NAME

    /** Blocking; call off the main thread. */
    fun fetchLatest(): Latest {
        val json = JSONObject(httpGet(VERSION_URL).decodeToString())
        return Latest(json.getInt("versionCode"), json.optString("versionName", ""))
    }

    /** Blocking; downloads the APK into cache and returns it. */
    fun download(context: Context): File {
        val dir = File(context.cacheDir, "updates").apply { mkdirs() }
        val file = File(dir, "where-weather.apk")
        val conn = open(APK_URL, 60_000)
        try {
            conn.inputStream.use { input -> file.outputStream().use { input.copyTo(it) } }
        } finally {
            conn.disconnect()
        }
        return file
    }

    fun canInstall(context: Context): Boolean =
        Build.VERSION.SDK_INT < Build.VERSION_CODES.O ||
            context.packageManager.canRequestPackageInstalls()

    /** One-time: the user must allow "install unknown apps" for Where Weather. */
    fun openInstallPermissionSettings(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        context.startActivity(
            Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:${context.packageName}"))
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
        )
    }

    /** Opens the system installer for [apk]; the user taps "Install". */
    fun launchInstaller(context: Context, apk: File) {
        val uri = FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", apk)
        context.startActivity(
            Intent(Intent.ACTION_VIEW)
                .setDataAndType(uri, "application/vnd.android.package-archive")
                .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK),
        )
    }

    private fun open(url: String, timeout: Int): HttpURLConnection {
        // GitHub redirects release downloads to another https host; follow manually to be safe.
        var target = URL(url)
        repeat(5) {
            val conn = target.openConnection() as HttpURLConnection
            conn.instanceFollowRedirects = false
            conn.connectTimeout = 15_000
            conn.readTimeout = timeout
            conn.setRequestProperty("Cache-Control", "no-cache")
            val code = conn.responseCode
            if (code in 300..399) {
                val loc = conn.getHeaderField("Location") ?: throw IllegalStateException("redirect without location")
                conn.disconnect()
                target = URL(target, loc)
            } else if (code == 200) {
                return conn
            } else {
                conn.disconnect()
                throw IllegalStateException("HTTP $code")
            }
        }
        throw IllegalStateException("too many redirects")
    }

    private fun httpGet(url: String): ByteArray {
        val conn = open(url, 15_000)
        try {
            return conn.inputStream.use { it.readBytes() }
        } finally {
            conn.disconnect()
        }
    }
}
