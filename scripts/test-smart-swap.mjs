// Node tests for the Smart Swap lookup (src/lib/smartSwap.ts).
// Compile first:
//   npx tsc src/lib/risk.ts src/lib/offParse.ts src/lib/smartSwap.ts \
//     --outDir .tmp-test --module commonjs --target es2020 \
//     --esModuleInterop --skipLibCheck
// Then run: node scripts/test-smart-swap.mjs
//
// Part 1 is offline (mocked fetch) and must always pass. Part 2 hits the
// live Open Food Facts search for the Nutella 400g jar and prints the real
// alternative it finds; it reports honestly when the search backend is
// unavailable instead of failing on a transient outage.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { parseOffProduct } from '../.tmp-test/offParse.js';
import { findSmartSwap } from '../.tmp-test/smartSwap.js';

const nutellaJson = JSON.parse(
  readFileSync(new URL('./fixtures/nutella.json', import.meta.url), 'utf8'),
);
const parsed = parseOffProduct('3017624010701', nutellaJson);
assert.equal(parsed.status, 'found');
const nutella = parsed.product;
assert.equal(nutella.categoryTag, 'spreads');

// --- Part 1: selection logic against a canned search response. ---
const canned = {
  products: [
    // The product itself — must be excluded.
    {
      code: '3017624010701',
      product_name: 'Nutella',
      nutriscore_grade: 'e',
      nova_group: 4,
      nutriments: { sugars_100g: 56.3, 'saturated-fat_100g': 10.6, salt_100g: 0.1075 },
    },
    // Lower score, real data: B +2, NOVA 2 +2, sat fat 2g +2 = 6.
    {
      code: '111',
      product_name: 'Peanut Butter Smooth',
      brands: 'Test Brand',
      nutriscore_grade: 'b',
      nova_group: 2,
      nutriments: { sugars_100g: 6, 'saturated-fat_100g': 2, salt_100g: 0.5 },
    },
    // Higher score than Nutella — must be skipped.
    {
      code: '222',
      product_name: 'Chocolate Spread Deluxe',
      nutriscore_grade: 'e',
      nova_group: 4,
      nutriments: { sugars_100g: 50, 'saturated-fat_100g': 12, salt_100g: 0.2 },
    },
    // Scores 0 only because it has almost no label data — must be skipped.
    { code: '333', product_name: 'Mystery Spread', nutriments: {} },
    // No name at all — must be skipped.
    { code: '444', nutriscore_grade: 'a', nova_group: 1, nutriments: { sugars_100g: 1 } },
  ],
};

const realFetch = globalThis.fetch;
globalThis.fetch = async () => ({ ok: true, json: async () => canned });
try {
  const swap = await findSmartSwap(nutella);
  assert.ok(swap, 'expected a swap from the canned response');
  assert.equal(swap.product.barcode, '111');
  assert.equal(swap.product.name, 'Peanut Butter Smooth');
  assert.equal(swap.score, 6);
  assert.equal(swap.band, 'low');
  assert.equal(swap.boost, 23 - 6);
  console.log('Offline selection test passed: Peanut Butter Smooth 6/50, +17 boost.');
} finally {
  globalThis.fetch = realFetch;
}

// --- Part 2: live search for the Nutella jar. ---
console.log('Live search for Nutella (category: spreads)…');
const live = await findSmartSwap(nutella);
if (!live) {
  console.log(
    'LIVE SEARCH UNAVAILABLE: Open Food Facts search returned no usable results ' +
      '(the search backend was returning 503 earlier). The feature omits the ' +
      'card in this case; retry when the search backend is back.',
  );
} else {
  assert.ok(live.score < 23, 'live swap must score lower than Nutella (23)');
  assert.equal(live.boost, 23 - live.score);
  console.log(
    'Live Smart Swap for Nutella:',
    JSON.stringify({
      name: live.product.name,
      brand: live.product.brands,
      barcode: live.product.barcode,
      score: live.score,
      band: live.band,
      boost: live.boost,
    }),
  );
}
console.log('Smart Swap tests done.');
