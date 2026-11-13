// Node tests for the region-aware allergen sets (src/lib/allergenData.ts)
// and the locale/timezone region inference (src/lib/regionInfer.ts).
// Compile first:
//   npx tsc src/lib/allergenData.ts src/lib/regionInfer.ts --outDir .tmp-test \
//     --module commonjs --target es2020 --esModuleInterop --skipLibCheck
// Then run: node scripts/test-region-allergens.mjs

import assert from 'node:assert/strict';

import { ALLERGENS, allergensForRegion } from '../.tmp-test/allergenData.js';
import { inferRegionFromLocale, regionFromCountryCode } from '../.tmp-test/regionInfer.js';

// --- Allergen sets -------------------------------------------------------

// Full catalogue: the previous 10 plus Shellfish.
assert.equal(ALLERGENS.length, 11);
assert.ok(ALLERGENS.some((a) => a.id === 'shellfish'));
assert.deepEqual(
  ALLERGENS.find((a) => a.id === 'shellfish').tags,
  ['shellfish', 'shrimp', 'crab', 'lobster', 'prawn'],
);

// US/CA: exactly the FDA 9, in FDA order, with the US labels.
const us = allergensForRegion('US');
assert.deepEqual(
  us.map((a) => a.id),
  ['dairy', 'egg', 'fish', 'shellfish', 'nuts', 'peanuts', 'gluten', 'soy', 'sesame'],
);
assert.deepEqual(
  us.map((a) => a.label),
  ['Dairy', 'Egg', 'Fish', 'Shellfish', 'Tree nuts', 'Peanut', 'Wheat', 'Soy', 'Sesame'],
);
const ca = allergensForRegion('CA');
assert.deepEqual(
  ca.map((a) => a.id),
  us.map((a) => a.id),
);
// Relabelling never changes the matching tags (ids stay stable).
assert.deepEqual(
  us.find((a) => a.id === 'gluten').tags,
  ['gluten', 'wheat', 'barley', 'rye'],
);
assert.deepEqual(
  us.find((a) => a.id === 'nuts').tags,
  ['nuts', 'hazelnut', 'almond', 'walnut', 'cashew', 'pistachio'],
);

// Other regions: the full 11-item list with the original labels.
for (const region of ['EU', 'IN', 'ROW']) {
  const list = allergensForRegion(region);
  assert.equal(list.length, 11, region);
  assert.equal(list.find((a) => a.id === 'gluten').label, 'Gluten');
  assert.equal(list.find((a) => a.id === 'nuts').label, 'Nuts');
  assert.equal(list.find((a) => a.id === 'peanuts').label, 'Peanuts');
  assert.ok(list.some((a) => a.id === 'mustard'));
  assert.ok(list.some((a) => a.id === 'celery'));
}

// --- Region inference ----------------------------------------------------

assert.equal(inferRegionFromLocale('US', 'America/New_York'), 'US');
assert.equal(inferRegionFromLocale('CA', 'America/Toronto'), 'CA');
assert.equal(inferRegionFromLocale('IN', 'Asia/Kolkata'), 'IN');
assert.equal(inferRegionFromLocale('FR', 'Europe/Paris'), 'EU');
assert.equal(inferRegionFromLocale('DE', 'Europe/Berlin'), 'EU');
assert.equal(inferRegionFromLocale('GB', 'Europe/London'), 'EU');
assert.equal(inferRegionFromLocale('AU', 'Australia/Sydney'), 'ROW');
assert.equal(inferRegionFromLocale('BR', 'America/Sao_Paulo'), 'ROW'); // Latin America is not the US bucket
// Timezone alone, no locale region.
assert.equal(inferRegionFromLocale(null, 'America/Toronto'), 'CA');
assert.equal(inferRegionFromLocale(null, 'America/Chicago'), 'US');
assert.equal(inferRegionFromLocale(null, 'Europe/London'), 'EU');
assert.equal(inferRegionFromLocale(null, 'Asia/Kolkata'), 'IN');
assert.equal(inferRegionFromLocale(null, 'Asia/Calcutta'), 'IN');
assert.equal(inferRegionFromLocale(null, 'Australia/Sydney'), 'ROW');
// No signal at all -> null (caller keeps the current defaults).
assert.equal(inferRegionFromLocale(null, null), null);
assert.equal(inferRegionFromLocale(undefined, undefined), null);

// Country-code mapping (reverse-geocode path).
assert.equal(regionFromCountryCode('US'), 'US');
assert.equal(regionFromCountryCode('CA'), 'CA');
assert.equal(regionFromCountryCode('IN'), 'IN');
assert.equal(regionFromCountryCode('FR'), 'EU');
assert.equal(regionFromCountryCode('JP'), 'ROW');
assert.equal(regionFromCountryCode(null), 'ROW');

console.log('test-region-allergens: all assertions passed');
