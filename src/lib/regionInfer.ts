// Region detection, pure (no React Native imports) so it can be unit-tested
// with plain node. The stored region drives allergens, nutrition units and
// (future) Pro pricing. Only a country/region is ever stored — never precise
// coordinates (see region.ts).

export type RegionCode = 'US' | 'CA' | 'EU' | 'IN' | 'ROW';

export type RegionSource = 'location' | 'locale' | 'manual';

export interface RegionInfo {
  region: RegionCode;
  /** Human label, e.g. 'United States'. */
  label: string;
  source: RegionSource;
}

export const REGION_LABELS: Record<RegionCode, string> = {
  US: 'United States',
  CA: 'Canada',
  EU: 'Europe',
  IN: 'India',
  ROW: 'Other region',
};

/** All regions the user can pick by hand in Profile. */
export const ALL_REGIONS: RegionCode[] = ['US', 'CA', 'EU', 'IN', 'ROW'];

// ISO country codes treated as the Europe bucket: EU members plus the UK,
// Norway, Switzerland and Iceland (same allergen rules and EUR-ish pricing
// defaults for the future Pro tier).
const EUROPE_COUNTRY_CODES = new Set([
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR',
  'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK',
  'SI', 'ES', 'SE', 'GB', 'NO', 'CH', 'IS',
]);

// Latin American / Caribbean country codes — an America/* timezone alone
// must not promote these to the US bucket.
const LATIN_AMERICA_CODES = new Set([
  'MX', 'BR', 'AR', 'CL', 'CO', 'PE', 'VE', 'EC', 'BO', 'PY', 'UY', 'GY',
  'SR', 'BZ', 'GT', 'HN', 'SV', 'NI', 'CR', 'PA', 'CU', 'DO', 'HT', 'JM',
  'TT', 'BS', 'BB', 'GD', 'LC', 'VC', 'AG', 'DM', 'KN',
]);
// Canadian IANA timezone cities — everything else under America/* is the US.
const CANADIAN_TZ_CITIES = new Set([
  'Toronto', 'Vancouver', 'Montreal', 'Calgary', 'Ottawa', 'Edmonton',
  'Winnipeg', 'Halifax', 'Quebec', 'Victoria', 'Saskatoon', 'Regina',
  'St_Johns', 'Whitehorse', 'Yellowknife', 'Iqaluit',
]);

/** Map an ISO country code to a region bucket. */
export function regionFromCountryCode(code: string | null | undefined): RegionCode {
  if (!code) return 'ROW';
  const c = code.toUpperCase();
  if (c === 'US') return 'US';
  if (c === 'CA') return 'CA';
  if (c === 'IN') return 'IN';
  if (EUROPE_COUNTRY_CODES.has(c)) return 'EU';
  return 'ROW';
}

/**
 * Infer the region from the device locale's region subtag and/or the IANA
 * timezone. Returns null when neither gives a usable signal — the caller
 * then keeps the current defaults instead of guessing.
 */
export function inferRegionFromLocale(
  localeRegion: string | null | undefined,
  timezone: string | null | undefined,
): RegionCode | null {
  if (localeRegion) {
    const r = localeRegion.toUpperCase();
    if (r === 'US' || r === 'CA' || r === 'IN' || EUROPE_COUNTRY_CODES.has(r)) {
      return regionFromCountryCode(r);
    }
    if (LATIN_AMERICA_CODES.has(r)) return 'ROW';
    // Any other locale region (e.g. AU, JP) still tells us the user is not
    // in one of those buckets — but only the timezone can refine it, so
    // fall through rather than returning ROW here.
  }
  if (timezone) {
    if (timezone === 'Asia/Kolkata' || timezone === 'Asia/Calcutta') return 'IN';
    if (timezone.startsWith('Europe/')) return 'EU';
    if (timezone.startsWith('America/')) {
      const city = timezone.split('/')[1] ?? '';
      return CANADIAN_TZ_CITIES.has(city) ? 'CA' : 'US';
    }
    // Any other real timezone is still a signal: not one of our buckets.
    return 'ROW';
  }
  if (localeRegion) return 'ROW';
  return null;
}
