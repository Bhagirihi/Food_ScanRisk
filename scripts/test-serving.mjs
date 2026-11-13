// Node tests for serving-size parsing (src/lib/offParse.ts).
// Compile first:
//   npx tsc src/lib/offParse.ts --outDir .tmp-test \
//     --module commonjs --target es2020 --esModuleInterop --skipLibCheck
// Then run: node scripts/test-serving.mjs

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { parseOffProduct, perServing } from '../.tmp-test/offParse.js';

const nutellaJson = JSON.parse(
  readFileSync(new URL('./fixtures/nutella.json', import.meta.url), 'utf8'),
);

// 1. The Nutella fixture has no serving fields — parse stays undefined and
//    the risk inputs are untouched.
const nutella = parseOffProduct('3017624010701', nutellaJson);
assert.equal(nutella.status, 'found');
assert.equal(nutella.product.servingSize, undefined);
assert.equal(nutella.product.servingQuantityG, undefined);
assert.equal(perServing(56.3, nutella.product.servingQuantityG), undefined);

// 2. serving_quantity (grams) wins when present.
const withQty = parseOffProduct('1', {
  status: 1,
  product: {
    product_name: 'Peanut Butter',
    serving_size: '32 g',
    serving_quantity: 32,
    nutriments: { sugars_100g: 6.2, 'energy-kcal_100g': 588 },
  },
});
assert.equal(withQty.status, 'found');
assert.equal(withQty.product.servingSize, '32 g');
assert.equal(withQty.product.servingQuantityG, 32);
assert.equal(perServing(6.2, withQty.product.servingQuantityG), 1.984);
assert.equal(perServing(588, withQty.product.servingQuantityG), 188.16);

// 3. serving_size string fallback: "15g", "2.5 kg", decimal comma.
const fromString = parseOffProduct('2', {
  status: 1,
  product: { product_name: 'Bar', serving_size: '15g', nutriments: {} },
});
assert.equal(fromString.product.servingQuantityG, 15);

const fromKg = parseOffProduct('3', {
  status: 1,
  product: { product_name: 'Bag', serving_size: '2.5 kg', nutriments: {} },
});
assert.equal(fromKg.product.servingQuantityG, 2500);

const fromComma = parseOffProduct('4', {
  status: 1,
  product: { product_name: 'Pack', serving_size: '12,5 g', nutriments: {} },
});
assert.equal(fromComma.product.servingQuantityG, 12.5);

// 4. Unusable serving data -> undefined, never a crash or a zero.
const noServing = parseOffProduct('5', {
  status: 1,
  product: { product_name: 'Loose', serving_size: '1 cup', nutriments: {} },
});
assert.equal(noServing.product.servingQuantityG, undefined);
assert.equal(noServing.product.servingSize, '1 cup');

const zeroQty = parseOffProduct('6', {
  status: 1,
  product: { product_name: 'Zero', serving_quantity: 0, serving_size: '0 g', nutriments: {} },
});
assert.equal(zeroQty.product.servingQuantityG, undefined);

// 5. perServing edge cases.
assert.equal(perServing(undefined, 30), undefined);
assert.equal(perServing(10, undefined), undefined);
assert.equal(perServing(0, 30), 0);

console.log('test-serving: all assertions passed');
