// AdMob (Google Mobile Ads) — TEST IDs only.
// TODO: Replace every TEST id below with the real AdMob app/unit IDs from
// the AdMob console (Dhruv's step — no real AdMob app exists for ScanRisk
// yet) and set the EXPO_PUBLIC_ADMOB_* env vars below. Until then the app
// serves Google test ads only; test ads must never ship to production.
//
// Test IDs used here are Google's documented demo units (see
// developers.google.com/admob test-ads pages and the
// react-native-google-mobile-ads TestIds source, which ships the same
// values). The native unit is platform-specific: Android /2247696110,
// iOS /3986624511.

import { Platform } from 'react-native';

// TODO: Replace with the real AdMob app IDs (AdMob console → ScanRisk app).
const TEST_APP_IDS = {
  android: 'ca-app-pub-3940256099942544~3347511713',
  ios: 'ca-app-pub-3940256099942544~1458002511',
};

// TODO: Replace with the real banner ad unit ID.
const TEST_BANNER_UNIT_ID = 'ca-app-pub-3940256099942544/6300978111';

// TODO: Replace with the real rewarded ad unit ID.
const TEST_REWARDED_UNIT_ID = 'ca-app-pub-3940256099942544/5224354917';

// TODO: Replace with the real native ad unit ID. Platform-specific Google
// demo units (from the library's own TestIds + Google's demo-units docs).
const TEST_NATIVE_UNIT_IDS = {
  android: 'ca-app-pub-3940256099942544/2247696110',
  ios: 'ca-app-pub-3940256099942544/3986624511',
};

const platform = Platform.OS === 'ios' ? 'ios' : 'android';

// Env vars must be read with literal keys (expo/no-dynamic-env-var).
function envValue(value: string | undefined): string | null {
  if (!value || value.trim().startsWith('@EXPO_PUBLIC_')) return null;
  return value.trim() ? value.trim() : null;
}

/** AdMob app ID for this platform (config plugin in app.json uses the same). */
export const ADMOB_APP_ID: string =
  platform === 'ios'
    ? (envValue(process.env.EXPO_PUBLIC_ADMOB_IOS_APP_ID) ?? TEST_APP_IDS.ios)
    : (envValue(process.env.EXPO_PUBLIC_ADMOB_ANDROID_APP_ID) ?? TEST_APP_IDS.android);

/** Ad unit IDs for this platform. Env vars override the TEST defaults. */
export const ADMOB_UNITS = {
  banner:
    platform === 'ios'
      ? (envValue(process.env.EXPO_PUBLIC_ADMOB_IOS_BANNER) ?? TEST_BANNER_UNIT_ID)
      : (envValue(process.env.EXPO_PUBLIC_ADMOB_ANDROID_BANNER) ?? TEST_BANNER_UNIT_ID),
  rewarded:
    platform === 'ios'
      ? (envValue(process.env.EXPO_PUBLIC_ADMOB_IOS_REWARDED) ?? TEST_REWARDED_UNIT_ID)
      : (envValue(process.env.EXPO_PUBLIC_ADMOB_ANDROID_REWARDED) ?? TEST_REWARDED_UNIT_ID),
  native:
    platform === 'ios'
      ? (envValue(process.env.EXPO_PUBLIC_ADMOB_IOS_NATIVE) ?? TEST_NATIVE_UNIT_IDS.ios)
      : (envValue(process.env.EXPO_PUBLIC_ADMOB_ANDROID_NATIVE) ?? TEST_NATIVE_UNIT_IDS.android),
} as const;

/** True while the TEST demo units are in use (i.e. no real IDs configured). */
export function isUsingTestAdUnits(): boolean {
  return (
    ADMOB_UNITS.banner === TEST_BANNER_UNIT_ID ||
    ADMOB_UNITS.rewarded === TEST_REWARDED_UNIT_ID ||
    ADMOB_UNITS.native === TEST_NATIVE_UNIT_IDS[platform]
  );
}
