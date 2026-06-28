package com.whereweather.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.whereweather.app.widget.WidgetPlugin;
import com.whereweather.app.widget.WidgetUpdateWorker;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(WidgetPlugin.class);
        super.onCreate(savedInstanceState);
        // Start periodic widget refresh (every 30 min, survives app close)
        WidgetUpdateWorker.Companion.schedule(this);
    }
}
