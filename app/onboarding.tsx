// First-run onboarding: 3 steps, then sign-in. Shown once (see _layout).

import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { completeOnboarding } from '../src/lib/session';
import { COLORS, SERIF } from '../src/lib/theme';
import { Ornament, PrimaryButton, TextButton } from '../src/components/ui';

const STEPS = [
  {
    visual: 'scan',
    title: 'Scan any barcode',
    body: 'Point your camera at a product barcode — the app reads it in seconds. No typing, no searching.',
  },
  {
    visual: 'score',
    title: 'See the risk, explained',
    body: 'Every product gets a 0–50 risk score. 0 is low, 50 is very high — and each point tells you exactly why it counts.',
  },
  {
    visual: 'history',
    title: 'Keep track',
    body: 'Everything you scan is saved on your phone, so you can compare products and check back any time.',
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
                height: i % 3 === 0 ? 64 : 48,
                backgroundColor: i % 2 === 0 ? COLORS.maroon : COLORS.gold,
              }}
            />
          ))}
        </View>
        <Text style={styles.visualCaption}>3017 6240 1070 1</Text>
      </View>
    );
  }
  if (kind === 'score') {
    return (
      <View style={styles.visual}>
        <Text style={styles.visualScore}>
          23<Text style={styles.visualScoreOf}> / 50</Text>
        </Text>
        <View style={styles.track}>
          <View style={[styles.fill, { width: '46%' }]} />
        </View>
        <View style={styles.visualBadge}>
          <Text style={styles.visualBadgeText}>Moderate risk</Text>
        </View>
      </View>
    );
  }
  return (
    <View style={styles.visual}>
      {[
        { name: 'Nutella', score: 23, color: '#B77900' },
        { name: 'Rolled Oats', score: 4, color: '#1E8E3E' },
        { name: 'Potato Chips', score: 34, color: '#E8710A' },
      ].map((r) => (
        <View key={r.name} style={styles.historyRow}>
          <View style={[styles.historyDot, { backgroundColor: r.color }]} />
          <Text style={styles.historyName}>{r.name}</Text>
          <View style={[styles.historyChip, { backgroundColor: r.color }]}>
            <Text style={styles.historyChipText}>{r.score}</Text>
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
        <Image source={require('../assets/icon.png')} style={styles.logo} />
        <Text style={styles.brand}>ScanRisk</Text>
        <Ornament />
      </View>

      <Visual kind={step.visual} />

      <Text style={styles.title}>{step.title}</Text>
      <Text style={styles.body}>{step.body}</Text>

      <View style={styles.dots}>
        {STEPS.map((_, i) => (
          <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
        ))}
      </View>

      <PrimaryButton label={last ? 'Get started' : 'Next'} onPress={() => (last ? finish() : setIndex(index + 1))} />
      {index > 0 ? <TextButton label="Back" onPress={() => setIndex(index - 1)} /> : null}
      <TextButton label="Skip" onPress={finish} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center' },
  top: { alignItems: 'center', marginBottom: 36 },
  logo: { width: 72, height: 72, borderRadius: 18, marginBottom: 12 },
  brand: { color: COLORS.maroon, fontSize: 30, fontWeight: '700', fontFamily: SERIF, marginBottom: 10 },
  visual: {
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderColor: COLORS.line,
    borderRadius: 22,
    borderWidth: 1,
    padding: 28,
    marginBottom: 28,
  },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 5 },
  visualCaption: { color: COLORS.soft, fontSize: 14, letterSpacing: 3, marginTop: 14 },
  visualScore: { color: '#B77900', fontSize: 52, fontWeight: '800' },
  visualScoreOf: { color: COLORS.soft, fontSize: 20 },
  track: {
    backgroundColor: '#EDE8E0',
    borderRadius: 999,
    height: 12,
    marginTop: 14,
    overflow: 'hidden',
    width: '100%',
  },
  fill: { backgroundColor: '#B77900', borderRadius: 999, height: 12 },
  visualBadge: {
    backgroundColor: '#B77900',
    borderRadius: 999,
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  visualBadgeText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  historyRow: { alignItems: 'center', flexDirection: 'row', marginVertical: 6, width: '100%' },
  historyDot: { borderRadius: 6, height: 12, width: 12 },
  historyName: { flex: 1, fontSize: 16, fontWeight: '700', marginLeft: 10 },
  historyChip: {
    alignItems: 'center',
    borderRadius: 999,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  historyChipText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  title: {
    color: COLORS.maroon,
    fontSize: 28,
    fontWeight: '700',
    fontFamily: SERIF,
    textAlign: 'center',
  },
  body: { color: COLORS.inkSoft, fontSize: 16, lineHeight: 24, marginTop: 12, textAlign: 'center' },
  dots: { flexDirection: 'row', gap: 6, justifyContent: 'center', marginVertical: 24 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: COLORS.line },
  dotActive: { width: 22, backgroundColor: COLORS.gold },
});
