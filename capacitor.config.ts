import type { CapacitorConfig } from '@capacitor/cli';

// server.url is strictly isolated behind an explicit environment variable (CAP_SERVER_URL).
// If empty or undefined, it falls back to the production local bundled 'dist' asset architecture.
const devServerUrl = process.env.CAP_SERVER_URL;

const config: CapacitorConfig = {
  appId: 'com.vendibook.app',
  appName: 'Vendibook',
  webDir: 'dist',
  server: devServerUrl ? {
    url: devServerUrl,
    cleartext: new URL(devServerUrl).protocol === 'http:'
  } : {
    // Production default: Strict local asset delivery via https://localhost
    androidScheme: 'https',
    // External pages remain in the browser; verified App Links return to the app.
    cleartext: false
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#ffffff',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP'
    },
    Keyboard: {
      resize: 'body',
      style: 'dark',
      resizeOnFullScreen: true
    }
  }
};

export default config;
