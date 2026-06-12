import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.rentke.app',
  appName: 'RentKe',
  webDir: 'out',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    Camera: {
      permissions: true,
    },
  },
};

export default config;
