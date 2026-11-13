// Network + cache layer for Open Food Facts lookups.
// Data: Open Food Facts, free, no API key, ODbL licence.
// Endpoint: GET https://world.openfoodfacts.org/api/v2/product/<barcode>.json
// A missing product returns HTTP 200 with status 0 — never a 404.

import AsyncStorage from '@react-native-async-storage/async-storage';

import { parseOffProduct } from './offParse';
import type { LookupResult, OffProduct } from './offParse';

export type { LookupResult, OffProduct } from './offParse';

const API_BASE = 'https://world.openfoodfacts.org/api/v2/product';
const FIELDS =
  'code,product_name,brands,quantity,nutriscore_grade,nova_group,nutriments,ingredients_text,additives_tags,allergens_tags,traces_tags,image_url';
// Open Food Facts asks for a descriptive User-Agent on every request.
const USER_AGENT = 'ScanRisk/1.0 (Android; +https://dhruvdave.in)';
const CACHE_KEY_PREFIX = 'scanrisk:off:v1:';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export async function lookupBarcode(barcode: string): Promise<LookupResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(`${API_BASE}/${encodeURIComponent(barcode)}.json?fields=${FIELDS}`, {
      headers: { 'User-Agent': USER_AGENT },
      signal: controller.signal,
    });
    const json = await res.json();
    return parseOffProduct(barcode, json);
  } finally {
    clearTimeout(timer);
  }
}

export async function getCachedProduct(barcode: string): Promise<OffProduct | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY_PREFIX + barcode);
    if (!raw) return null;
    const entry = JSON.parse(raw) as { savedAt: number; product: OffProduct };
    if (Date.now() - entry.savedAt > CACHE_TTL_MS) return null;
    return entry.product;
  } catch {
    return null;
  }
}

export async function setCachedProduct(product: OffProduct): Promise<void> {
  try {
    await AsyncStorage.setItem(
      CACHE_KEY_PREFIX + product.barcode,
      JSON.stringify({ savedAt: Date.now(), product }),
    );
  } catch {
    // Cache is best-effort; a failure must not break the lookup.
  }
}

export async function clearProductCache(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter((k) => k.startsWith(CACHE_KEY_PREFIX));
    if (cacheKeys.length > 0) await AsyncStorage.multiRemove(cacheKeys);
  } catch {
    // Ignore.
  }
}
