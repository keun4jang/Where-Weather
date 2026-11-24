package com.whereweather.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.whereweather.app.daily.DailyWeatherWorker;
import com.whereweather.app.rain.RainAlertPlugin;
import com.whereweather.app.rain.RainAlertWorker;
import com.whereweather.app.widget.WidgetPlugin;
import com.whereweather.app.widget.WidgetUpdateWorker;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(WidgetPlugin.class);
        registerPlugin(RainAlertPlugin.class);
        super.onCreate(savedInstanceState);
        // Start periodic widget refresh (every 30 min, survives app close)
        WidgetUpdateWorker.Companion.schedule(this);
        // Background rain check (no-op until enabled from JS via RainAlert.configure)
        RainAlertWorker.Companion.schedule(this);
        // Daily slot notifications (no-op until enabled from JS)
        DailyWeatherWorker.Companion.ensureScheduled(this);
    }
}
