// Lazy AdMob access — every react-native-google-mobile-ads import goes
// through a dynamic import() with a try/catch fallback, so the app still
// runs in Expo Go (which has no custom native modules) with ads silently
// off. No top-level import of the library anywhere in this file or its
// callers: the `import type` below is erased at compile time and never
// touches the native module at runtime.
//
// Deliberately NO interstitial support here: an interstitial between Scan
// and Result is forbidden, so no interstitial code exists in this app.

import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import type * as Ads from 'react-native-google-mobile-ads';

import { ADMOB_UNITS } from './admob';

type AdsModule = typeof Ads;

let adsModule: AdsModule | null | undefined;
let initPromise: Promise<boolean> | null = null;

/** True inside the Expo Go client (no custom native modules). */
export function isExpoGo(): boolean {
  return (
    Constants.appOwnership === 'expo' ||
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient
  );
}

/**
 * True only on iOS/Android builds that include custom native code — i.e.
 * dev builds and store builds. False in Expo Go and on web, where ads
 * stay silently off.
 */
export function isAdMobAvailable(): boolean {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return false;
  return !isExpoGo();
}

/**
 * Dynamically load react-native-google-mobile-ads. Returns null when the
 * native module is absent (Expo Go) or the import fails — callers treat
 * null as "ads off" and render nothing.
 */
export async function loadAdsModule(): Promise<AdsModule | null> {
  if (adsModule !== undefined) return adsModule;
  try {
    adsModule = await import('react-native-google-mobile-ads');
  } catch {
    adsModule = null;
  }
  return adsModule;
}

/** Initialise the Mobile Ads SDK once (no-op when ads are unavailable). */
export async function initializeAds(): Promise<boolean> {
  if (!isAdMobAvailable()) return false;
  if (!initPromise) {
    initPromise = (async () => {
      const mod = await loadAdsModule();
      if (!mod) return false;
      try {
        await mod.default().initialize();
        return true;
      } catch {
        return false;
      }
    })();
  }
  return initPromise;
}

/** How long to wait for a rewarded ad to load before giving up. */
const REWARDED_LOAD_TIMEOUT_MS = 15000;

/**
 * Show one rewarded ad and resolve true only when the user earns the
 * reward (watches to the end). Resolves false when ads are unavailable,
 * the ad fails to load, or the user closes it early. Never throws.
 */
export async function showRewardedAd(): Promise<boolean> {
  if (!(await initializeAds())) return false;
  const mod = await loadAdsModule();
  if (!mod) return false;

  let rewarded: Ads.RewardedAd;
  try {
    rewarded = mod.RewardedAd.createForAdRequest(ADMOB_UNITS.rewarded, {
      requestNonPersonalizedAdsOnly: false,
    });
  } catch {
    return false;
  }

  const loaded = new Promise<boolean>((resolve) => {
    const timer = setTimeout(() => resolve(false), REWARDED_LOAD_TIMEOUT_MS);
    const unsub = rewarded.addAdEventListener(mod.RewardedAdEventType.LOADED, () => {
      clearTimeout(timer);
      unsub();
      resolve(true);
    });
    const unsubError = rewarded.addAdEventListener(mod.AdEventType.ERROR, () => {
      clearTimeout(timer);
      unsub();
      unsubError();
      resolve(false);
    });
  });
  rewarded.load();
  if (!(await loaded)) return false;

  return new Promise<boolean>((resolve) => {
    let earned = false;
    let settled = false;
    const done = (value: boolean) => {
      if (settled) return;
      settled = true;
      unsubEarned();
      unsubClosed();
      resolve(value);
    };
    const unsubEarned = rewarded.addAdEventListener(
      mod.RewardedAdEventType.EARNED_REWARD,
      () => {
        earned = true;
      },
    );
    const unsubClosed = rewarded.addAdEventListener(mod.AdEventType.CLOSED, () => {
      done(earned);
    });
    rewarded.show().catch(() => done(false));
  });
}
