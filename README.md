<p align="center">
  <img src="assets/icon.png" alt="ScanRisk logo" width="160" />
</p>

# ScanRisk — scan a barcode, see the risk

Scan a product barcode, get its details from Open Food Facts, and see a
0–50 risk score with every point explained in plain language.

## The problem

Packaged food is hard to judge in the aisle. The label is tiny print,
sugar hides behind per-serving numbers, salt and fat are listed in grams
nobody converts in their head, and additives show up as E-numbers with no
meaning to a normal shopper. The result: people buy on habit or packaging,
not on what is actually inside.

## How ScanRisk fixes it

1. **Scan** — point the camera at any barcode (EAN-13 / EAN-8 / UPC-A /
   UPC-E / Code 128). No typing, no searching.
2. **Look up** — the app fetches the real product from Open Food Facts
   (free, no key): nutrition per 100 g, ingredients, allergens, Nutri-Score
   and processing level.
3. **Score it** — one 0–50 risk number, 0 low and 50 very high, with every
   point explained in plain words: why the sugar added 6, which additive
   counted, what ultra-processed means for this product.
4. **Compare** — the last 50 scans stay on the phone with their scores, so
   you can pick the better option next time instead of guessing again.

Built with Expo (React Native) on the free Open Food Facts database.
Scanning works without an account (guest mode); sign-in is optional.

## Run

```bash
npm install
npx expo start
```

Camera scanning needs a real device (dev build via EAS, or Expo Go).
`npx expo export` and `npx tsc --noEmit` both pass.

## The risk score (0–50)

Rule-based, in `src/lib/risk.ts`. Start at 0, add points:

- Nutri-Score E +12 / D +9 / C +5 / B +2
- NOVA ultra-processed +10 / processed +5
- Sugar >22.5g/100g +6, >12.5g +3
- Salt >1.5g/100g +5, >0.6g +2
- Saturated fat >5g/100g +5, >1.5g +2
- Trans fat +5; additives of concern +2 each (max 3)

Bands: 0–10 Low, 11–25 Moderate, 26–40 High, 41–50 Very high.
Guidance from label data, not medical advice.

## Tests

```bash
npx tsc src/lib/risk.ts src/lib/offParse.ts --ignoreConfig --outDir .tmp-test \
  --module commonjs --target es2020 --esModuleInterop --skipLibCheck
node scripts/test-risk.mjs
```

Covers parsing of a real Nutella response, scoring, band edges, and the 50 cap.

## Status (13 Nov 2026)

- Code on GitHub: Bhagirihi/Food_ScanRisk, branch `main`.
- v1 code-complete, typecheck + Android export + expo-doctor 20/20 green.
- NOT phone-tested yet. No EAS build yet.
- Sign-in needs Supabase project keys (guest mode works without them).
