import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.f41db48dd08e462eb46d84427d4de801',
  appName: 'DocSafe',
  webDir: 'dist',
  server: {
    url: 'https://f41db48d-d08e-462e-b46d-84427d4de801.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    Camera: {
      // Request both camera and photo library permissions
      presentationStyle: 'fullscreen'
    },
    CapacitorHttp: {
      enabled: true
    }
  },
  android: {
    // Android-specific permissions configuration
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: true
  }
};

export default config;
