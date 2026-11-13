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

- v2: full rebuild to the Google Stitch "NutriScan" design (maroon #4A121A,
  amber #D97706, Plus Jakarta Sans + Inter, pill buttons, bottom tabs,
  SVG risk gauge, allergen alerts, history search/filters/CSV export,
  password strength meter, Apple/Google sign-in). App name stays ScanRisk.
- Result screen rebuilt to the Stitch "Product Analysis Detail" frame:
  needle-dial gauge ("Metabolic Risk Index" + band pill), label-top stat
  tiles, factor cards with category tags, 2x2 nutrition grid with kcal pill,
  bolded allergens in ingredients, persistent "Saved to your scan history"
  banner. Home Recent Scans rebuilt to the Stitch spec: band-coloured icon
  tiles (no photos), "Scanned X ago", "• 8/50 LOW" score pills, "View all N"
  link + full-width "View all N scans in History" button.
- Profile rebuilt to the Stitch "Profile Settings" frame: top bar with bell
  + avatar, identity card (real name/email, "Member since" only from a real
  account date, no Pro badge), pale stats card with dividers (real counts,
  Clean Score amber, Allergens Tracked green), collapsible Allergen Alerts
  row, preference rows with icon tiles + hand-built maroon/grey toggles,
  data rows with real history count and measured cache size, About card with
  real version v1.0.0 and an Open Source link only (no Privacy/Terms — those
  docs don't exist; no fake "Database synced" line).
- Scoring model unchanged. Nutella 400g jar (3017624010701) scores 23 Moderate
  (live data has no NOVA group, no trans fat); the 15g mini pack (80177173)
  scores 38 High (live data has NOVA 4 + trans fat 0.1g) — same model, two
  different packs. Both are covered by node tests.
- Code on GitHub: Bhagirihi/Food_ScanRisk, branch `main`.
- v1 code-complete, typecheck + Android export + expo-doctor 20/20 green.
- NOT phone-tested yet. No EAS build yet.
- Sign-in needs Supabase project keys (guest mode works without them);
  Apple/Google sign-in also needs `scanrisk://auth` added as a redirect URL
  in the Supabase dashboard.
