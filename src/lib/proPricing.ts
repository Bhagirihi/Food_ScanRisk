// Region-aware Pro pricing — CONSTANTS ONLY. There is no paywall and no
// Pro upsell UI in the app yet; these are placeholders for the future Pro
// tier so the price is picked from the region, not hard-coded in a screen.
// Values are placeholders, not live store prices — re-check them against
// the App Store / Play pricing tiers before any Pro launch.

import type { RegionCode } from './regionInfer';

export interface ProPrice {
  /** Price per month in the region's currency. */
  monthly: number;
  /** Price per year in the region's currency. */
  yearly: number;
  currency: string;
  /** Display price, e.g. '$2.99/mo'. */
  monthlyLabel: string;
  yearlyLabel: string;
}

export const PRO_PRICING: Record<RegionCode, ProPrice> = {
  US: { monthly: 2.99, yearly: 29.99, currency: 'USD', monthlyLabel: '$2.99/mo', yearlyLabel: '$29.99/yr' },
  CA: { monthly: 3.99, yearly: 39.99, currency: 'CAD', monthlyLabel: 'CA$3.99/mo', yearlyLabel: 'CA$39.99/yr' },
  EU: { monthly: 2.99, yearly: 29.99, currency: 'EUR', monthlyLabel: '€2.99/mo', yearlyLabel: '€29.99/yr' },
  IN: { monthly: 99, yearly: 999, currency: 'INR', monthlyLabel: '₹99/mo', yearlyLabel: '₹999/yr' },
  ROW: { monthly: 2.99, yearly: 29.99, currency: 'USD', monthlyLabel: '$2.99/mo', yearlyLabel: '$29.99/yr' },
};

export function proPriceForRegion(region: RegionCode): ProPrice {
  return PRO_PRICING[region] ?? PRO_PRICING.ROW;
}
