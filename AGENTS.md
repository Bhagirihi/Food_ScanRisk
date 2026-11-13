This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md

## ScanRisk notes

- Product data: Open Food Facts v2 API, no key. A missing barcode is HTTP 200
  with `status: 0`, never a 404. Always send a descriptive User-Agent;
  12s timeout; product cache 7 days.
- Risk score lives in `src/lib/risk.ts` (pure, node-tested). Weights are in the
  file header — change them there, not in the UI.
- Tests: compile the two pure lib files and run `node scripts/test-risk.mjs`.
- App id: com.bytesphere.scanrisk (name ScanRisk — final, picked 13 Nov 2026).
- Repo: Bhagirihi/Food_ScanRisk (main). Not yet: EAS build, phone test.
- UI: Stitch "NutriScan" design system (13 Nov 2026 rebuild) — primary maroon
  #4A121A, amber #D97706, green #15803D, slate #64748B, pale bg #F8F7FC,
  Plus Jakarta Sans headlines + Inter body. Tokens in `src/lib/theme.ts`,
  shared pieces in `src/components/ui.tsx`. Risk-band DISPLAY colors live in
  theme BANDS; the scoring model in `src/lib/risk.ts` is untouched (do not
  adopt the Stitch 42-point weights — Nutella stays 23 Moderate).
- Fonts: @expo-google-fonts/plus-jakarta-sans + inter, loaded with useFonts
  in app/_layout.tsx WITHOUT gating (fall back to system fonts if they fail).
- Navigation: Stack only, all screens headerShown false — top bars are
  in-screen. Bottom tabs are a component (`src/components/BottomTabs.tsx`)
  on Home/History/Profile, NOT expo-router Tabs.
- SafeAreaView: every screen is wrapped with ALL edges (no Stack headers
  remain to cover the top inset).
- Gauge: needle dial via react-native-svg (`src/components/ScoreGauge.tsx`) —
  fixed green→yellow→orange→red gradient arc, tick marks, needle pivoting at
  the diameter line, number + "RISK SCORE" below the dial. The
  "Metabolic Risk Index" card title + band pill live in app/result.tsx.
- Result (app/result.tsx): Stitch "Product Analysis Detail" — header avatar,
  persistent "Saved to your scan history" banner (dismiss with X), product
  card with quantity badge + brand/category eyebrow (category = first
  non-generic en: categories tag, parsed in offParse.ts), label-top stat
  tiles, factor cards with category tags, 2x2 nutrition grid with kcal pill,
  ingredients with bolded allergens, missing-data box naming only genuinely
  missing fields. Share Score is the pale-blue SoftButton (ui.tsx).
- Home Recent Scans: band-coloured icon tiles (no photos), "Scanned X ago"
  relative dates, "• N/50 LABEL" score pills (LOW/MOD/HIGH/V. HIGH),
  "View all N" link + full-width "View all N scans in History" button.
- Home scan card (app/index.tsx): one dark-maroon gradient card
  (GRADIENTS.hero) with gold corner brackets, glowing barcode icon +
  scanline, "Scan Barcode →", Manual Entry + Try Nutella pills inside (both
  one line, fixed height 48 — the long "Manual Barcode Entry" / "Try Nutella
  Demo" labels wrapped unevenly on his phone, one pill taller than the
  other); the whole card asks for camera permission then opens the scanner.
  Health Snapshot middle stat uses a short band label ("Moderate", not
  "Moderate risk") via SNAP_LABEL. No gear/settings icon is rendered
  anywhere on Home (verified by grep — the floating gear in his 13 Nov
  screenshot is a system/other-app button on his phone, not ours).
- History (app/history.tsx): Stitch "History Log" — bell + avatar top bar,
  "{N} Scanned Items" + CLEAR HISTORY pill, one-row scrollable filter pills
  (ScrollView MUST have flexGrow: 0 or it stretches to fill the screen),
  rows with real thumbnails from the cached product (imageUrl; placeholder
  tile when missing), relative dates ("Today 14:22" / "Yesterday" /
  "N days ago"), note from first ingredients + top nutrient (underscores
  stripped from OFF text), dark score pills, warning line from real top
  factors (warningFor). Visual check: web preview can't fetch OFF images
  (headless browser has no external network) — on a real phone they load.
- Register (app/register.tsx): Stitch "Create Account" — title card, icon
  fields with label rows, always-visible 4-segment strength meter + 3 check
  pills, Terms as plain text with no links (docs don't exist), compact
  SetupNotice (one-line, dismissible; full box stays on Login/Forgot).
- Fixtures: scripts/fixtures/nutella.json = live 400g jar data (23 Moderate);
  nutella-mini.json = live 15g pack 80177173 (38 High — NOVA 4 + trans fat
  0.1g). The two packs are different OFF entries; the model is the same.
- Allergens: `src/lib/allergens.ts` (10 common allergens, AsyncStorage,
  matched against OFF allergen tags on Result; collapsible "Allergen
  Alerts" row in Profile, collapsed by default, expands to the picker).
- Settings: `src/lib/settings.ts` (torch default, Pro Tip dismissal,
  tips-enabled flag read by the Tour effects, last manually-entered barcode
  for the scanner's manual card prefix).
- Scanner (app/scan.tsx, rebuilt 13 Nov to the exact Stitch frame spec):
  camera card at the top (marginHorizontal 16, rounded bottom corners 24,
  content-driven height ~470 incl. the status-bar inset — NO fixed height),
  dimmed photo under the overlay; top bar = X close (36px circle) left,
  LIVE FOCUS pill absolutely centred, torch + flip (36px circles, gap 8)
  right; gold brackets 294×174 (#D97706, 3px, 28px arms) with an orange
  scanline (inset 8) + white center-focus icon at its middle; hint pill
  (dark-maroon, document-scanner icon + text, centred); permissions pill
  (full card width, shield + "Camera permission" + PERMISSIONS + tune icon,
  opens the permission sheet); manual card (white, keyboard icon, "Enter
  barcode / manually:" two lines, grey barcode fragment + real last-entered
  7-digit prefix when one exists, never a fake number). Recent Ingredient
  Analyses below on pale slate #F1F5F9 (COLORS.paleSlate): header + "Today",
  two side-by-side real-product cards (48×48 thumbnail, name, dot +
  top-factor subline — red text only for high/very-high). No bottom buttons,
  no bottom nav — X is the exit. Permission sheet: drag handle, pale-blue
  circle + maroon camera icon, centred honest body (no "inflammatory
  additives" / "audit macro values" claims), lock info box, Allow Camera +
  Open Settings both 56px tall radius 10, "Enter code manually instead"
  link, no X. Manual sheet: barcode icon + title + X in a pale-grey circle,
  left-aligned body, 48px input, 50px Verify Product radius 10. The
  permission sheet is shared between the !granted full-screen state and the
  pill-tapped overlay (Allow Camera hidden in the overlay — permission is
  already granted there).
- Alignment round (13 Nov): every screen re-rendered at 390×844 and fixed —
  Home pills (above), Login guest title on one line (title 14px, badge 9.5px,
  tile 38px, gap 9 — AuthShell content padding is 24, so the row only has
  ~132px for the title), History brand line numberOfLines 1 (was 2 — a
  2-line brand made one row taller than the rest), onboarding step-2 factor
  labels use non-breaking spaces inside units (56.3 g, 100 g) so a wrap
  never orphans a bare "g", splash stat labels are single words
  (Additives / Nutrition / Allergens) with the stats row width 100% (the
  row is content-sized inside a centred parent, so long labels shrank the
  columns and the other labels wrapped). Screenshots live in
  ~/workspace/scanrisk-webcheck4/shots/ (19 shots incl. the permission-sheet
  overlay). Headless-Chrome note: /opt/meta-chromium/chrome refuses to start
  here ("Hatch WebGL domain policy is required") — use the Playwright
  headless shell at
  ~/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell
  on --remote-debugging-port=9222 instead. The in-page "Allow Camera"
  button does not complete getUserMedia in that shell — grant the camera
  with CDP Browser.grantPermissions (videoCapture) before loading /scan.
  The wasm barcode-scanner error seen once in the preview console is
  web-only; the native scanner is used on a real device.
- History export: per-row CSV via expo-file-system (cache dir) +
  expo-sharing; per-row delete via `removeRecord` in `src/lib/history.ts`.
- OAuth: Apple/Google via supabase signInWithOAuth + expo-web-browser
  openAuthSessionAsync + exchangeCodeForSession, redirect
  `scanrisk://auth` (must be added in the Supabase dashboard); graceful
  "not connected yet" handling when Supabase is unconfigured.
- Splash: `expo-splash-screen` config plugin in app.json; art
  `assets/splash.png`, solid maroon #4A121A bg, regenerable via
  `scripts/make-splash.py` (uses Plus Jakarta Sans from node_modules when
  present, Noto Serif fallback).
- Flow: BrandedSplash (boot) -> onboarding (once) -> login/register/forgot
  (Supabase email+password, `src/lib/supabase.ts`) -> home. Guest mode when
  Supabase is unconfigured (`scanrisk:guest:v1`); profile has sign out,
  replay onboarding, reset tips, clear history/cache, measured cache size
  (`getProductCacheSizeBytes` in openfoodfacts.ts — real AsyncStorage bytes,
  never a demo figure), custom maroon/grey toggles (no native Switch).
- Coach marks: `src/components/Tour.tsx` (adapted from Shubh's Tour; measure
  targets via `Measurable` interface + callback refs — RN 0.88 types `View`
  as the component, not the instance, so `useRef<View>` does not typecheck).
- Splash: `expo-splash-screen` config plugin in app.json (top-level `splash`
  key is invalid in SDK 58); art `assets/splash.png`, solid maroon bg,
  regenerable via `scripts/make-splash.py`.
- Install quirk: `npx expo install` fails on a pre-existing react-dom
  19.3.1 vs react 19.3.0 peer conflict — new packages need
  `npm install --legacy-peer-deps`, then verify with doctor + export.
  react-native-svg must be pinned to 15.16.0 (doctor expects it for SDK 58).
- Logo: `scripts/make-logo.py` (icon.png, adaptive foreground + monochrome,
  favicon); adaptive bg is maroon #5E1224 in app.json.
- Home asks for the camera on tapping Scan (useCameraPermissions in index);
  the scan screen keeps the fallback and offers Open Settings when the
  permission is permanently denied (canAskAgain false).

- Remaining UI fixes (13 Nov): splash bars fixed to fit the logo box
  (BrandedSplash 112px box, bars w*1.5 gap 2 = 88px; native splash.png
  regenerated with white 360x360 box, bars fitted, no orange rules).
  Login/Forgot use the same compact dismissible SetupNotice as Register;
  Login has icon fields, "Forgot password?" beside the password label, and
  the guest row with INSTANT SCAN badge. Smart Swap is real:
  `src/lib/smartSwap.ts` searches OFF by category (v2 search API, category
  facet fallback), scores with `src/lib/risk.ts`, returns the lowest scorer
  below the original; tested by `scripts/test-smart-swap.mjs` (offline +
  live; Nutella -> Menguy's Peanut 100% 5/50, +18). Onboarding step 2 shows
  the swap card only when a real alternative is found; step 3 shows the
  Personal Allergen Shield from real selections. Result screen has a Smart
  Swap section (omitted when none found). Scanner overlay: flex-start +
  gap 18, bottomRow marginTop auto (camera not verifiable in web preview).
- Web preview: `expo export --platform web` needs react-dom 19.3.0 to match
  react 19.3.0 (19.3.1 breaks with React error #527); pin it in the
  DISPOSABLE copy only. Serve dist with an SPA-fallback server (plain
  python http.server 404s on /login etc.); see webcheck3/serve.mjs.
  The headless browser has no external network, so live OFF lookups fail in
  the preview — swap card / allergen verdicts render their omit-or-fallback
  states there; verify those paths with the node tests instead.
