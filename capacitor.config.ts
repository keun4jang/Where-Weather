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
      // Inject --safe-area-inset-* CSS vars (used by Header / body padding).
      insetsHandling: 'css',
      // Light status-bar icons on our dark violet background.
      style: 'DARK',
    },
  },
};

export default config;
