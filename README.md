# ScanRisk — scan a barcode, see the risk

Scan a product barcode, get its details from Open Food Facts, and see a
0–50 risk score with every point explained in plain language.

## Stack

- Expo SDK 58, React Native 0.88, TypeScript, Expo Router
- `expo-camera` for barcode scanning (EAN-13 / EAN-8 / UPC-A / UPC-E / Code 128)
- Open Food Facts API (free, no key) for product details
- AsyncStorage for product cache (7 days) + scan history (last 50)

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

- v1 code-complete, typecheck + Android export + expo-doctor 20/20 green.
- NOT phone-tested yet. No repo yet (needs creating on GitHub first).
- No EAS build yet. Default Expo icon — needs a real icon before a Play listing.
