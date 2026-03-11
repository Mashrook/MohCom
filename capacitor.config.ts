import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mohamie.ios',
  appName: 'MohamieCom',
  webDir: 'dist',
  
  server: {
    cleartext: false,
    allowNavigation: [
      'https://mohcom-production.up.railway.app',
      'https://glmpsmwcbxebxioekgzu.supabase.co',
      'https://*.supabase.co',
      'https://api.moyasar.com'
    ]
  },
  
  // iOS Security Configuration
  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
    allowsLinkPreview: false,
    backgroundColor: '#0A0E27',
    scheme: 'mohamie',
    // Security settings
    limitsNavigationsToAppBoundDomains: true,
    // Enable ATS (App Transport Security)
    // handleApplicationNotifications: true
  },
  
  // Android Security Configuration
  android: {
    // Disable mixed content (HTTP in HTTPS)
    allowMixedContent: false,
    backgroundColor: '#0A0E27',
    useLegacyBridge: false,
    // Enable certificate pinning support
    // Note: Actual pinning requires native code modification
    appendUserAgent: 'MohamieApp/1.0'
  },
  
  // Plugin configurations
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    },
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#0A0E27',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true
    },
    // HTTP security plugin configuration
    CapacitorHttp: {
      enabled: true
    }
  },
  
  // Logging (disable in production)
  loggingBehavior: 'none'
};

export default config;
