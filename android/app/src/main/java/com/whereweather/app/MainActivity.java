package com.whereweather.app;

import android.os.Bundle;
import android.view.View;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;
import com.whereweather.app.daily.DailyWeatherWorker;
import com.whereweather.app.rain.RainAlertPlugin;
import com.whereweather.app.rain.RainAlertWorker;
import com.whereweather.app.update.UpdateCheckWorker;
import com.whereweather.app.update.UpdatePlugin;
import com.whereweather.app.widget.WidgetPlugin;
import com.whereweather.app.widget.WidgetUpdateWorker;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(WidgetPlugin.class);
        registerPlugin(RainAlertPlugin.class);
        registerPlugin(UpdatePlugin.class);
        super.onCreate(savedInstanceState);
        applySystemBarInsets();
        // Start periodic widget refresh (every 30 min, survives app close)
        WidgetUpdateWorker.Companion.schedule(this);
        // Background rain check (no-op until enabled from JS via RainAlert.configure)
        RainAlertWorker.Companion.schedule(this);
        // Daily slot notifications (no-op until enabled from JS)
        DailyWeatherWorker.Companion.ensureScheduled(this);
        // Check GitHub for a newer APK every ~12h and notify
        UpdateCheckWorker.Companion.schedule(this);
    }

    /**
     * Android 15+ draws apps edge-to-edge, so the header slid under the status bar.
     * Pad the WebView's container by the system bar / notch / keyboard insets so web
     * content always starts below the status bar and ends above the nav bar.
     * (Capacitor's own CSS-variable handling is disabled in capacitor.config.ts.)
     */
    private void applySystemBarInsets() {
        View container = (View) getBridge().getWebView().getParent();
        container.setBackgroundColor(0xFF1B1440); // matches the app background behind the bars
        ViewCompat.setOnApplyWindowInsetsListener(container, (v, insets) -> {
            Insets bars = insets.getInsets(
                WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout());
            Insets ime = insets.getInsets(WindowInsetsCompat.Type.ime());
            v.setPadding(bars.left, bars.top, bars.right, Math.max(bars.bottom, ime.bottom));
            return WindowInsetsCompat.CONSUMED;
        });
        ViewCompat.requestApplyInsets(container);
    }
}
