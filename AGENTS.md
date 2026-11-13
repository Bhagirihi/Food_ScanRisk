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
- App id: com.bytesphere.scanrisk (working name ScanRisk, renameable).
- Not yet: GitHub repo, EAS build, phone test, real icon.
- UI: merged house theme — Shubh royal-temple palette (ivory #FAF3E7,
  maroon #5E1224, gold #C19A3D, serif) + Rasoi radius/spacing/CTA gradient.
  Tokens in `src/lib/theme.ts`, shared pieces in `src/components/ui.tsx`.
- Flow: BrandedSplash (boot) -> onboarding (once) -> login/register/forgot
  (Supabase email+password, `src/lib/supabase.ts`) -> home. Guest mode when
  Supabase is unconfigured (`scanrisk:guest:v1`); profile has sign out,
  replay onboarding, reset tips, clear history/cache.
- Coach marks: `src/components/Tour.tsx` (adapted from Shubh's Tour; measure
  targets via `Measurable` interface + callback refs — RN 0.88 types `View`
  as the component, not the instance, so `useRef<View>` does not typecheck).
- Splash: `expo-splash-screen` config plugin in app.json (top-level `splash`
  key is invalid in SDK 58); art `assets/splash.png`, solid maroon bg,
  regenerable via `scripts/make-splash.py`.
- Install quirk: `npx expo install` fails on a pre-existing react-dom
  19.3.1 vs react 19.3.0 peer conflict — new packages need
  `npm install --legacy-peer-deps`, then verify with doctor + export.
- Logo: `scripts/make-logo.py` (icon.png, adaptive foreground + monochrome,
  favicon); adaptive bg is maroon #5E1224 in app.json.
- SafeAreaView: every screen is wrapped; screens with a Stack header use
  edges left/right/bottom only (the header already covers the top inset),
  headerless screens (onboarding, auth) use all edges.
- Home asks for the camera on tapping Scan (useCameraPermissions in index);
  the scan screen keeps the fallback and offers Open Settings when the
  permission is permanently denied (canAskAgain false).
