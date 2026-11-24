import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.whereweather.app',
  appName: 'Where Weather',
  webDir: 'dist',
  android: {
    buildOptions: {
      keystorePath: undefined,
    },
  },
  server: {
    androidScheme: 'https',
  },
  plugins: {
    SystemBars: {
      // Insets are applied natively in MainActivity (padding around the WebView),
      // which works regardless of the device's WebView version.
      insetsHandling: 'disable',
      // Light status-bar icons on our dark violet background.
      style: 'DARK',
    },
  },
};

export default config;
