// Node tests for the pure modules: offParse + risk.
// Compile first:
//   npx tsc src/lib/risk.ts src/lib/offParse.ts --outDir .tmp-test \
//     --module commonjs --target es2020 --esModuleInterop --skipLibCheck
// Then run: node scripts/test-risk.mjs

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { parseOffProduct } from '../.tmp-test/offParse.js';
import { bandForScore, scoreProduct } from '../.tmp-test/risk.js';

const nutellaJson = JSON.parse(
  readFileSync(new URL('./fixtures/nutella.json', import.meta.url), 'utf8'),
);
const nutellaMiniJson = JSON.parse(
  readFileSync(new URL('./fixtures/nutella-mini.json', import.meta.url), 'utf8'),
);

// 1. Parse the real Nutella 400g jar response (captured live 13 Nov 2026).
//    The live entry has no NOVA group and no trans-fat value, so those score 0.
const parsed = parseOffProduct('3017624010701', nutellaJson);
assert.equal(parsed.status, 'found');
const nutella = parsed.product;
assert.equal(nutella.name, 'Nutella');
assert.equal(nutella.brands, 'Ferrero');
assert.equal(nutella.quantity, '400.0 g');
assert.equal(nutella.category, 'Spreads');
assert.equal(nutella.nutriscoreGrade, 'e');
assert.equal(nutella.novaGroup, null);
assert.equal(nutella.nutriments.sugars100, 56.3);
assert.equal(nutella.nutriments.salt100, 0.1075);
assert.equal(nutella.nutriments.saturatedFat100, 10.6);
assert.equal(nutella.nutriments.transFat100, undefined);
assert.deepEqual(nutella.allergens, ['nuts']);
assert.deepEqual(nutella.additives, []);
assert.ok(nutella.imageUrl?.startsWith('https://images.openfoodfacts.org/'));

// 1b. Salt falls back to sodium x 2.5 when salt_100g is missing.
const salty = parseOffProduct('9', {
  status: 1,
  product: { product_name: 'Salty', nutriments: { sodium_100g: 0.4 } },
});
assert.equal(salty.status, 'found');
assert.equal(salty.product.nutriments.salt100, 1);

// 2. Not-found response: status 0, no product.
assert.deepEqual(parseOffProduct('00000000', { status: 0, product: null }), {
  status: 'not-found',
});

// 3. Nutella 400g jar score: Nutri-Score E +12, NOVA unknown 0, sugar 56.3g +6,
//    salt 0.1075g 0, saturated fat 10.6g +5, no trans fat, additives 0 = 23, moderate.
const nutellaRisk = scoreProduct(nutella);
assert.equal(nutellaRisk.score, 23);
assert.equal(nutellaRisk.band, 'moderate');
assert.equal(nutellaRisk.factors.length, 3);
assert.deepEqual(
  nutellaRisk.factors.map((f) => `${f.label} +${f.points}`),
  ['Nutri-Score E +12', 'Very high sugar: 56.3g per 100g +6', 'Very high saturated fat: 10.6g per 100g +5'],
);

// 3b. The 15g mini pack (barcode 80177173) is a DIFFERENT Open Food Facts
//     entry: same per-100g nutrition, but its live data carries NOVA 4 and
//     trans fat 0.1g — so the same model scores it 38, high. This is the pack
//     the user scanned on his phone (38/50, "15.0 g", EAN 80177173).
const miniParsed = parseOffProduct('80177173', nutellaMiniJson);
assert.equal(miniParsed.status, 'found');
const mini = miniParsed.product;
assert.equal(mini.name, 'Nutella');
assert.equal(mini.quantity, '15.0 g');
assert.equal(mini.category, 'Spreads');
assert.equal(mini.novaGroup, 4);
assert.equal(mini.nutriments.transFat100, 0.1);
assert.equal(mini.nutriments.sugars100, 56.3);
const miniRisk = scoreProduct(mini);
assert.equal(miniRisk.score, 38);
assert.equal(miniRisk.band, 'high');
assert.equal(miniRisk.factors.length, 5);
assert.deepEqual(
  miniRisk.factors.map((f) => `${f.label} +${f.points}`),
  [
    'Nutri-Score E +12',
    'Ultra-processed +10',
    'Very high sugar: 56.3g per 100g +6',
    'Very high saturated fat: 10.6g per 100g +5',
    'Contains trans fat: 0.1g per 100g +5',
  ],
);

// 4. Clean product scores 0 / low with full data quality.
const clean = {
  barcode: '1',
  name: 'Oats',
  nutriscoreGrade: 'a',
  novaGroup: 1,
  nutriments: { sugars100: 1, salt100: 0.01, saturatedFat100: 0.2 },
  additives: [],
  allergens: [],
  traces: [],
};
const cleanRisk = scoreProduct(clean);
assert.equal(cleanRisk.score, 0);
assert.equal(cleanRisk.band, 'low');
assert.equal(cleanRisk.dataQuality, 'full');

// 5. Worst case: E +12, NOVA 4 +10, sugar +6, salt +5, sat fat +5,
//    trans fat +5, 3 additives +6 = 49, very-high.
const worst = {
  barcode: '2',
  name: 'Worst',
  nutriscoreGrade: 'e',
  novaGroup: 4,
  nutriments: { sugars100: 40, salt100: 2, saturatedFat100: 12, transFat100: 0.5 },
  additives: ['E250', 'E951', 'E320'],
  allergens: [],
  traces: [],
};
const worstRisk = scoreProduct(worst);
assert.equal(worstRisk.score, 49);
assert.equal(worstRisk.band, 'very-high');

// 6. Score never exceeds 50, even with every additive of concern.
const capped = { ...worst, additives: ['E250', 'E251', 'E951', 'E950', 'E954', 'E320', 'E321', 'E171'] };
assert.ok(scoreProduct(capped).score <= 50);

// 7. Minimal data: nothing known -> 0, minimal quality, notes explain why.
const empty = { barcode: '3', name: 'Unknown', nutriments: {}, additives: [], allergens: [], traces: [] };
const emptyRisk = scoreProduct(empty);
assert.equal(emptyRisk.score, 0);
assert.equal(emptyRisk.dataQuality, 'minimal');
assert.ok(emptyRisk.notes.length > 0);

// 8. Band boundaries.
assert.equal(bandForScore(0), 'low');
assert.equal(bandForScore(10), 'low');
assert.equal(bandForScore(11), 'moderate');
assert.equal(bandForScore(25), 'moderate');
assert.equal(bandForScore(26), 'high');
assert.equal(bandForScore(40), 'high');
assert.equal(bandForScore(41), 'very-high');
assert.equal(bandForScore(50), 'very-high');

console.log('All risk/offParse tests passed.');
console.log(
  'Nutella 400g jar:',
  JSON.stringify({
    score: nutellaRisk.score,
    band: nutellaRisk.band,
    factors: nutellaRisk.factors.map((f) => `${f.label} +${f.points}`),
  }),
);
console.log(
  'Nutella 15g mini pack:',
  JSON.stringify({
    score: miniRisk.score,
    band: miniRisk.band,
    factors: miniRisk.factors.map((f) => `${f.label} +${f.points}`),
  }),
);
