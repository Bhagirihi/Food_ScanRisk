// Region storage + detection. Only the country/region and a label are ever
// persisted — precise coordinates are reverse-geocoded in memory and then
// discarded, never stored (see the Privacy Policy).

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as Localization from 'expo-localization';

import {
  REGION_LABELS,
  inferRegionFromLocale,
  regionFromCountryCode,
  type RegionCode,
  type RegionInfo,
} from './regionInfer';

export type { RegionCode, RegionInfo } from './regionInfer';
export { ALL_REGIONS, REGION_LABELS } from './regionInfer';

const KEY = 'scanrisk:region:v1';

export async function getRegion(): Promise<RegionInfo | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RegionInfo;
    if (!parsed || typeof parsed.region !== 'string' || !REGION_LABELS[parsed.region as RegionCode]) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function setRegion(info: RegionInfo): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(info));
  } catch {
    // Ignore.
  }
}

/**
 * Infer the region from the device locale + timezone (no permission needed).
 * Returns null when neither gives a signal — the caller keeps the current
 * defaults instead of guessing.
 */
export function resolveRegionFromLocale(): RegionInfo | null {
  try {
    const locales = Localization.getLocales();
    const localeRegion = locales.length > 0 ? locales[0].regionCode : null;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? null;
    const region = inferRegionFromLocale(localeRegion, timezone);
    if (!region) return null;
    return { region, label: REGION_LABELS[region], source: 'locale' };
  } catch {
    return null;
  }
}

/** Store the locale-inferred region when nothing is stored yet. */
export async function ensureRegion(): Promise<RegionInfo | null> {
  const existing = await getRegion();
  if (existing) return existing;
  const inferred = resolveRegionFromLocale();
  if (inferred) await setRegion(inferred);
  return inferred;
}

/**
 * Ask for foreground location, reverse-geocode it to a country, and store
 * only the region. Coordinates are held in a local variable and dropped.
 * Returns null when permission is denied, location is unavailable, or the
 * reverse-geocode gives no country.
 */
export async function detectRegionFromLocation(): Promise<RegionInfo | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Low,
    });
    const places = await Location.reverseGeocodeAsync({
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
    });
    // Coordinates go out of scope here — only the country code is kept.
    const code = places.length > 0 ? places[0].isoCountryCode : null;
    if (!code) return null;
    const region = regionFromCountryCode(code);
    const info: RegionInfo = { region, label: REGION_LABELS[region], source: 'location' };
    await setRegion(info);
    return info;
  } catch {
    return null;
  }
}
