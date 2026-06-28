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
};

export default config;
