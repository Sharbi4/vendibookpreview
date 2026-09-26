import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.f4d8586ede664307b052b071b734f592',
  appName: 'vendibookpreview',
  webDir: 'dist',
  server: {
    // Use the public site; Lovable preview URLs require a project login.
    url: 'https://vendibook.com',
    cleartext: false
  }
};

export default config;
