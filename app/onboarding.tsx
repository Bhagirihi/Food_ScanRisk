// First-run onboarding: 3 steps, then sign-in. Shown once (see _layout).
// The Nutella example uses real, live-verified data for barcode
// 3017624010701: score 23/50 Moderate (Nutri-Score E +12, sugar 56.3g +6,
// saturated fat 10.6g +5).

import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';

import { completeOnboarding } from '../src/lib/session';
import { COLORS, FONTS } from '../src/lib/theme';
import { PrimaryButton, TextButton } from '../src/components/ui';

const STEPS = [
  {
    visual: 'scan',
    title: 'Scan Any Barcode',
    body: 'Point your camera at any packaged grocery or drink. The barcode is read in seconds — no typing, no searching.',
  },
  {
    visual: 'score',
    title: 'See Risk Explained',
    body: 'Every product gets a 0–50 risk score. 0 is low, 50 is very high — and each point tells you exactly why it counts.',
  },
  {
    visual: 'track',
    title: 'Track & Choose Better',
    body: 'Your last 50 scans stay on your phone, and allergen alerts warn you when a product contains something you flagged.',
  },
] as const;

const BARS = [3, 2, 6, 2, 3, 8, 2, 4, 3, 2, 6, 3];

function Visual({ kind }: { kind: (typeof STEPS)[number]['visual'] }) {
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
      </View>
    );
  }
  return (
    <View style={styles.visual}>
      {[
        { icon: 'shield', title: 'Allergen alerts', body: 'Pick yours in Profile — get warned on results.' },
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
  const step = STEPS[index];
  const last = index === STEPS.length - 1;

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

      <Visual kind={step.visual} />

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
  trackRow: { flexDirection: 'row', alignItems: 'center', gap: 12, width: '100%', paddingVertical: 9 },
  trackText: { flex: 1 },
  trackTitle: { fontSize: 15, fontWeight: '700', color: COLORS.ink, fontFamily: FONTS.bodySemi },
  trackBody: { fontSize: 13, color: COLORS.soft, marginTop: 2, lineHeight: 18 },
  title: {
    color: COLORS.maroon,
    fontSize: 28,
    fontWeight: '700',
    fontFamily: FONTS.headline,
    textAlign: 'center',
  },
  body: { color: COLORS.inkSoft, fontSize: 16, lineHeight: 24, marginTop: 12, textAlign: 'center', fontFamily: FONTS.body },
  dots: { flexDirection: 'row', gap: 6, justifyContent: 'center', marginVertical: 24 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: COLORS.line },
  dotActive: { width: 22, backgroundColor: COLORS.amber },
});
