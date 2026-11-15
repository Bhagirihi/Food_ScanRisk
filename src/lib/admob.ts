// AdMob (Google Mobile Ads) — REAL Android IDs (AdMob app "ScanRisk",
// ca-app-pub-4173581536398147~9075949121, created 15 Nov 2026).
// iOS still uses Google's TEST IDs — no iOS AdMob app exists yet.
// Set the EXPO_PUBLIC_ADMOB_* env vars to override these defaults.
//
// Test IDs below are Google's documented demo units (see
// developers.google.com/admob test-ads pages and the
// react-native-google-mobile-ads TestIds source, which ships the same
// values). The native unit is platform-specific: Android /2247696110,
// iOS /3986624511.

import { Platform } from 'react-native';

// Real AdMob IDs (AdMob console → ScanRisk app, created 15 Nov 2026).
// Android is live; iOS has no AdMob app yet, so iOS stays on TEST IDs.
const REAL_ANDROID_APP_ID = 'ca-app-pub-4173581536398147~9075949121';
const REAL_ANDROID_BANNER_UNIT_ID = 'ca-app-pub-4173581536398147/6685976546';
const REAL_ANDROID_REWARDED_UNIT_ID = 'ca-app-pub-4173581536398147/5372894871';
const REAL_ANDROID_NATIVE_UNIT_ID = 'ca-app-pub-4173581536398147/8143362597';

// Google TEST app IDs (iOS fallback — no iOS AdMob app yet).
const TEST_APP_IDS = {
  android: 'ca-app-pub-3940256099942544~3347511713',
  ios: 'ca-app-pub-3940256099942544~1458002511',
};

// Google TEST banner unit (iOS fallback).
const TEST_BANNER_UNIT_ID = 'ca-app-pub-3940256099942544/6300978111';

// Google TEST rewarded unit (iOS fallback).
const TEST_REWARDED_UNIT_ID = 'ca-app-pub-3940256099942544/5224354917';

// Google TEST native units (iOS fallback). Platform-specific demo units
// (from the library's own TestIds + Google's demo-units docs).
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
    : (envValue(process.env.EXPO_PUBLIC_ADMOB_ANDROID_APP_ID) ?? REAL_ANDROID_APP_ID);

/** Ad unit IDs for this platform (real Android units, TEST on iOS). Env vars override these defaults. */
export const ADMOB_UNITS = {
  banner:
    platform === 'ios'
      ? (envValue(process.env.EXPO_PUBLIC_ADMOB_IOS_BANNER) ?? TEST_BANNER_UNIT_ID)
      : (envValue(process.env.EXPO_PUBLIC_ADMOB_ANDROID_BANNER) ?? REAL_ANDROID_BANNER_UNIT_ID),
  rewarded:
    platform === 'ios'
      ? (envValue(process.env.EXPO_PUBLIC_ADMOB_IOS_REWARDED) ?? TEST_REWARDED_UNIT_ID)
      : (envValue(process.env.EXPO_PUBLIC_ADMOB_ANDROID_REWARDED) ?? REAL_ANDROID_REWARDED_UNIT_ID),
  native:
    platform === 'ios'
      ? (envValue(process.env.EXPO_PUBLIC_ADMOB_IOS_NATIVE) ?? TEST_NATIVE_UNIT_IDS.ios)
      : (envValue(process.env.EXPO_PUBLIC_ADMOB_ANDROID_NATIVE) ?? REAL_ANDROID_NATIVE_UNIT_ID),
} as const;

/** True while the TEST demo units are in use (i.e. no real IDs configured). */
export function isUsingTestAdUnits(): boolean {
  return (
    ADMOB_UNITS.banner === TEST_BANNER_UNIT_ID ||
    ADMOB_UNITS.rewarded === TEST_REWARDED_UNIT_ID ||
    ADMOB_UNITS.native === TEST_NATIVE_UNIT_IDS[platform]
  );
}
