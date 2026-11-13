// First-run onboarding: 3 steps, then sign-in. Shown once (see _layout).
// The Nutella example uses real, live-verified data for barcode
// 3017624010701: score 23/50 Moderate (Nutri-Score E +12, sugar 56.3g +6,
// saturated fat 10.6g +5). The step-2 Smart Swap card is a live lookup
// (src/lib/smartSwap.ts) — it only shows when a real lower-scoring
// alternative in the same category is found; the step-3 shield card reads
// the user's real allergen selections (src/lib/allergens.ts).

import { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';

import { completeOnboarding } from '../src/lib/session';
import { COLORS, FONTS } from '../src/lib/theme';
import { PrimaryButton, TextButton } from '../src/components/ui';
import { lookupBarcode } from '../src/lib/openfoodfacts';
import { findSmartSwap, type SmartSwap } from '../src/lib/smartSwap';
import {
  ALLERGENS,
  getSelectedAllergens,
  matchedAllergens,
} from '../src/lib/allergens';
import type { OffProduct } from '../src/lib/offParse';
import { BANDS } from '../src/lib/risk';

const NUTELLA_BARCODE = '3017624010701';

const STEPS = [
  {
    visual: 'scan',
    title: 'Scan Any Barcode',
    body: 'Point your camera at any packaged grocery or drink. The barcode is read in seconds — no typing, no searching.',
  },
  {
    visual: 'score',
    eyebrow: 'NUTRITION & PROCESSING',
    title: 'See Risk Explained',
    body: 'Every product gets a 0–50 risk score. 0 is low, 50 is very high — and each point tells you exactly why it counts.',
  },
  {
    visual: 'track',
    eyebrow: 'PERSONALIZED GUIDANCE',
    title: 'Track & Choose Better',
    body: 'Your last 50 scans stay on your phone, and allergen alerts warn you when a product contains something you flagged.',
  },
] as const;

const BARS = [3, 2, 6, 2, 3, 8, 2, 4, 3, 2, 6, 3];

interface VisualProps {
  kind: (typeof STEPS)[number]['visual'];
  swap: SmartSwap | null;
  selectedAllergens: string[];
  nutella: OffProduct | null;
}

function Visual({ kind, swap, selectedAllergens, nutella }: VisualProps) {
  if (kind === 'scan') {
    return (
      <View style={styles.visual}>
        <View style={styles.bars}>
          {BARS.map((w, i) => (
            <View
              key={i}
              style={{
                width: w * 3,
                height: i % 3 === 0 ? 56 : 42,
                backgroundColor: i % 2 === 0 ? COLORS.maroon : COLORS.amber,
              }}
            />
          ))}
        </View>
        <Text style={styles.productName}>NUTELLA HAZELNUT SPREAD</Text>
        <Text style={styles.productMeta}>400 g • FERRERO • 3 017624 010701</Text>
        <View style={styles.miniScore}>
          <Text style={styles.miniScoreValue}>23 / 50</Text>
          <View style={styles.miniScoreChip}>
            <Text style={styles.miniScoreChipText}>Moderate risk</Text>
          </View>
        </View>
      </View>
    );
  }
  if (kind === 'score') {
    return (
      <View style={styles.visual}>
        <Text style={styles.visualCaption}>NUTELLA — REAL LABEL DATA</Text>
        {[
          { icon: 'fact-check', label: 'Nutri-Score E', pts: '+12 pts' },
          { icon: 'water-drop', label: 'Very high sugar: 56.3 g / 100 g', pts: '+6 pts' },
          { icon: 'opacity', label: 'Very high saturated fat: 10.6 g / 100 g', pts: '+5 pts' },
        ].map((f) => (
          <View key={f.label} style={styles.factorRow}>
            <MaterialIcons name={f.icon as never} size={20} color={COLORS.maroon} />
            <Text style={styles.factorLabel}>{f.label}</Text>
            <Text style={styles.factorPts}>{f.pts}</Text>
          </View>
        ))}
        <Text style={styles.visualNote}>Every point tells you why it counts — no hidden math.</Text>
        {swap ? (
          <View style={styles.swapCard}>
            <View style={styles.swapHeader}>
              <MaterialIcons name="swap-horiz" size={20} color={COLORS.amberDeep} />
              <Text style={styles.swapTitle}>SMART SWAP RECOMMENDED</Text>
              <View style={styles.swapBoost}>
                <Text style={styles.swapBoostText}>+{swap.boost} Score Boost</Text>
              </View>
            </View>
            <Text style={styles.swapName}>{swap.product.name}</Text>
            <Text style={styles.swapMeta}>
              {swap.product.brands ? `${swap.product.brands} • ` : ''}
              {swap.score} / 50 {BANDS[swap.band].label}
            </Text>
          </View>
        ) : null}
      </View>
    );
  }

  // Step 3: Personal Allergen Shield from the user's real selections,
  // checked against the Nutella example.
  const selectedLabels = ALLERGENS.filter((a) => selectedAllergens.includes(a.id)).map(
    (a) => a.label,
  );
  const matched = nutella ? matchedAllergens(selectedAllergens, nutella.allergens) : [];
  let shieldText: string;
  let shieldTone: 'empty' | 'clear' | 'flagged' = 'empty';
  if (selectedLabels.length === 0) {
    shieldText = 'No allergens flagged yet — set yours in Profile.';
  } else if (!nutella) {
    shieldText = `Flagged: ${selectedLabels.join(', ')}.`;
  } else if (matched.length > 0) {
    shieldTone = 'flagged';
    shieldText = `Nutella contains ${matched.map((a) => a.label).join(', ')} — flagged for you.`;
  } else {
    shieldTone = 'clear';
    shieldText = `Nutella is clear for your flagged allergens: ${selectedLabels.join(', ')}.`;
  }

  return (
    <View style={styles.visual}>
      <View
        style={[
          styles.shieldCard,
          shieldTone === 'flagged'
            ? styles.shieldFlagged
            : shieldTone === 'clear'
              ? styles.shieldClear
              : null,
        ]}
      >
        <View style={styles.shieldHeader}>
          <MaterialIcons name="shield" size={22} color={COLORS.maroon} />
          <Text style={styles.shieldTitle}>Personal Allergen Shield</Text>
        </View>
        <Text
          style={[
            styles.shieldBody,
            shieldTone === 'flagged' ? styles.shieldBodyFlagged : null,
          ]}
        >
          {shieldText}
        </Text>
      </View>
      {[
        { icon: 'history', title: 'Last 50 scans saved', body: 'Everything stays on your phone.' },
        { icon: 'swap-horiz', title: 'Compare and choose', body: 'Pick the better option before you buy.' },
      ].map((r) => (
        <View key={r.title} style={styles.trackRow}>
          <MaterialIcons name={r.icon as never} size={22} color={COLORS.maroon} />
          <View style={styles.trackText}>
            <Text style={styles.trackTitle}>{r.title}</Text>
            <Text style={styles.trackBody}>{r.body}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

export default function Onboarding() {
  const [index, setIndex] = useState(0);
  const [swap, setSwap] = useState<SmartSwap | null>(null);
  const [nutella, setNutella] = useState<OffProduct | null>(null);
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>([]);
  const step = STEPS[index];
  const last = index === STEPS.length - 1;

  // Live data for the step-2 swap card and the step-3 shield card. Both
  // are best-effort: a failed lookup simply leaves the card out.
  useEffect(() => {
    let alive = true;
    getSelectedAllergens().then((ids) => {
      if (alive) setSelectedAllergens(ids);
    });
    (async () => {
      try {
        const res = await lookupBarcode(NUTELLA_BARCODE);
        if (!alive || res.status !== 'found') return;
        setNutella(res.product);
        const s = await findSmartSwap(res.product);
        if (alive) setSwap(s);
      } catch {
        // Leave the swap card out.
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const finish = async () => {
    await completeOnboarding();
    router.replace('/login');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.top}>
        <View style={styles.brandRow}>
          <Image source={require('../assets/icon.png')} style={styles.logo} />
          <Text style={styles.brand}>ScanRisk</Text>
        </View>
        <TextButton label="Skip" onPress={finish} />
      </View>

      <Visual
        kind={step.visual}
        swap={swap}
        selectedAllergens={selectedAllergens}
        nutella={nutella}
      />

      {'eyebrow' in step && step.eyebrow ? (
        <Text style={styles.eyebrow}>{step.eyebrow}</Text>
      ) : null}
      <Text style={styles.title}>{step.title}</Text>
      <Text style={styles.body}>{step.body}</Text>

      <View style={styles.dots}>
        {STEPS.map((_, i) => (
          <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
        ))}
      </View>

      <PrimaryButton
        label={last ? 'Get started' : 'Continue'}
        icon="arrow-forward"
        onPress={() => (last ? finish() : setIndex(index + 1))}
      />
      {index > 0 ? <TextButton label="Back" onPress={() => setIndex(index - 1)} /> : null}
      <TextButton label="Already have an account? Sign In" onPress={finish} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: COLORS.bg },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 36,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: { width: 40, height: 40, borderRadius: 10 },
  brand: { color: COLORS.maroon, fontSize: 22, fontWeight: '700', fontFamily: FONTS.headline },
  visual: {
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderColor: COLORS.line,
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    marginBottom: 28,
  },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 5 },
  productName: {
    color: COLORS.ink,
    fontSize: 15,
    fontWeight: '800',
    fontFamily: FONTS.headline,
    marginTop: 16,
    textAlign: 'center',
  },
  productMeta: { color: COLORS.soft, fontSize: 13, marginTop: 4, textAlign: 'center' },
  miniScore: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16 },
  miniScoreValue: { color: COLORS.amberDeep, fontSize: 26, fontWeight: '800', fontFamily: FONTS.headline },
  miniScoreChip: { backgroundColor: COLORS.amber, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  miniScoreChipText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  visualCaption: {
    color: COLORS.soft,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.4,
    marginBottom: 14,
    fontFamily: FONTS.bodyBold,
  },
  factorRow: { flexDirection: 'row', alignItems: 'center', gap: 10, width: '100%', paddingVertical: 8 },
  factorLabel: { flex: 1, fontSize: 14.5, fontWeight: '600', color: COLORS.ink, fontFamily: FONTS.bodySemi },
  factorPts: { fontSize: 14, fontWeight: '800', color: COLORS.maroon, fontFamily: FONTS.bodyBold },
  visualNote: { color: COLORS.soft, fontSize: 13, marginTop: 12, textAlign: 'center', lineHeight: 19 },
  swapCard: {
    width: '100%',
    backgroundColor: COLORS.amberSoft,
    borderRadius: 14,
    padding: 14,
    marginTop: 16,
  },
  swapHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  swapTitle: { flex: 1, fontSize: 12, fontWeight: '800', color: COLORS.amberDeep, letterSpacing: 0.8, fontFamily: FONTS.bodyBold },
  swapBoost: { backgroundColor: COLORS.green, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  swapBoostText: { color: '#fff', fontSize: 11, fontWeight: '800', fontFamily: FONTS.bodyBold },
  swapName: { fontSize: 16, fontWeight: '700', color: COLORS.ink, fontFamily: FONTS.headline, marginTop: 10 },
  swapMeta: { fontSize: 13, color: COLORS.inkSoft, marginTop: 3, fontFamily: FONTS.bodySemi },
  shieldCard: {
    width: '100%',
    backgroundColor: COLORS.bg,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
  },
  shieldClear: { backgroundColor: COLORS.greenSoft },
  shieldFlagged: { backgroundColor: COLORS.dangerBg },
  shieldHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  shieldTitle: { fontSize: 15, fontWeight: '700', color: COLORS.ink, fontFamily: FONTS.bodySemi },
  shieldBody: { fontSize: 13.5, color: COLORS.inkSoft, lineHeight: 19, marginTop: 8, fontFamily: FONTS.body },
  shieldBodyFlagged: { color: COLORS.danger, fontWeight: '700', fontFamily: FONTS.bodySemi },
  trackRow: { flexDirection: 'row', alignItems: 'center', gap: 12, width: '100%', paddingVertical: 9 },
  trackText: { flex: 1 },
  trackTitle: { fontSize: 15, fontWeight: '700', color: COLORS.ink, fontFamily: FONTS.bodySemi },
  trackBody: { fontSize: 13, color: COLORS.soft, marginTop: 2, lineHeight: 18 },
  eyebrow: {
    color: COLORS.soft,
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 1.6,
    textAlign: 'center',
    fontFamily: FONTS.bodyBold,
  },
  title: {
    color: COLORS.maroon,
    fontSize: 28,
    fontWeight: '700',
    fontFamily: FONTS.headline,
    textAlign: 'center',
    marginTop: 8,
  },
  body: { color: COLORS.inkSoft, fontSize: 16, lineHeight: 24, marginTop: 12, textAlign: 'center', fontFamily: FONTS.body },
  dots: { flexDirection: 'row', gap: 6, justifyContent: 'center', marginVertical: 24 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: COLORS.line },
  dotActive: { width: 22, backgroundColor: COLORS.amber },
});
