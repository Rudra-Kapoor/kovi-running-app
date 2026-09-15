import type { ExpoConfig } from 'expo/config';

// Secrets/keys come from the environment at build time (see .env.example). Empty values are fine
// for development in Expo Go; Google Maps falls back to the platform default map on iOS.
const env = (key: string, fallback = '') => process.env[key] ?? fallback;

const config: ExpoConfig = {
  name: 'Kovi',
  slug: 'kovi-running-app',
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  scheme: 'kovi',
  userInterfaceStyle: 'light',
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.kovi.running',
    usesAppleSignIn: true,
    infoPlist: {
      NSLocationWhenInUseUsageDescription: 'Kovi uses your location to track your runs.',
      NSLocationAlwaysAndWhenInUseUsageDescription:
        'Kovi keeps tracking your run while the app is in the background.',
      UIBackgroundModes: ['location'],
      LSApplicationQueriesSchemes: ['instagram', 'instagram-stories'],
      ITSAppUsesNonExemptEncryption: false,
    },
    ...(env('GOOGLE_MAPS_IOS_KEY') ? { config: { googleMapsApiKey: env('GOOGLE_MAPS_IOS_KEY') } } : {}),
  },
  android: {
    package: 'com.kovi.running',
    adaptiveIcon: {
      backgroundColor: '#121417',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    permissions: [
      'ACCESS_COARSE_LOCATION',
      'ACCESS_FINE_LOCATION',
      'ACCESS_BACKGROUND_LOCATION',
      'FOREGROUND_SERVICE',
      'FOREGROUND_SERVICE_LOCATION',
    ],
    config: { googleMaps: { apiKey: env('GOOGLE_MAPS_ANDROID_KEY') } },
    predictiveBackGestureEnabled: false,
  },
  web: { favicon: './assets/favicon.png', bundler: 'metro' },
  plugins: [
    'expo-router',
    'expo-status-bar',
    'expo-sharing',
    'expo-secure-store',
    'expo-web-browser',
    'expo-image',
    'expo-apple-authentication',
    [
      'expo-splash-screen',
      { image: './assets/splash-icon.png', resizeMode: 'contain', backgroundColor: '#121417' },
    ],
    [
      'expo-location',
      {
        locationAlwaysAndWhenInUsePermission:
          'Kovi keeps tracking your run while the app is in the background.',
        locationWhenInUsePermission: 'Kovi uses your location to track your runs.',
        isAndroidBackgroundLocationEnabled: true,
        isAndroidForegroundServiceEnabled: true,
      },
    ],
    [
      'expo-media-library',
      {
        photosPermission: 'Kovi saves your story cards to your photos.',
        savePhotosPermission: 'Kovi saves your story cards to your photos.',
        isAccessMediaLocationEnabled: false,
      },
    ],
    ['expo-image-picker', { photosPermission: 'Choose a profile photo from your library.' }],
    [
      'react-native-maps',
      {
        androidGoogleMapsApiKey: env('GOOGLE_MAPS_ANDROID_KEY'),
        iosGoogleMapsApiKey: env('GOOGLE_MAPS_IOS_KEY'),
      },
    ],
    './plugins/withReleaseSigning.js',
  ],
  extra: {
    router: {},
    eas: {},
  },
};

export default config;
