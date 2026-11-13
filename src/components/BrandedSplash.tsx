// Branded in-app splash: hero gradient + pulsing barcode mark + wordmark.
// Shows while the app checks onboarding / session state (see _layout).

import { useEffect, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { COLORS, GRADIENTS, SERIF } from '../lib/theme';

const BARS = [3, 2, 6, 2, 3, 8, 2, 4, 3, 2, 6, 3];

export default function BrandedSplash() {
  const [pulse] = useState(() => new Animated.Value(0.6));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.6, duration: 900, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <LinearGradient colors={GRADIENTS.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.root}>
      <Animated.View style={{ opacity: pulse }}>
        <View style={styles.bars}>
          {BARS.map((w, i) => (
            <View
              key={i}
              style={{ width: w * 3, height: i % 3 === 0 ? 72 : 56, backgroundColor: COLORS.goldBright }}
            />
          ))}
        </View>
      </Animated.View>
      <Text style={styles.name}>ScanRisk</Text>
      <Text style={styles.tag}>S C A N &nbsp;•&nbsp; K N O W &nbsp;•&nbsp; C H O O S E</Text>
      <View style={styles.foot}>
        <Text style={styles.footText}>Preparing ScanRisk…</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: COLORS.gold,
    borderRadius: 20,
    borderWidth: 1.5,
    paddingHorizontal: 22,
    paddingVertical: 18,
  },
  name: {
    color: '#FFF7E8',
    fontSize: 38,
    fontWeight: '700',
    fontFamily: SERIF,
    marginTop: 28,
    letterSpacing: 0.4,
  },
  tag: { color: '#F5D98B', fontSize: 12, fontWeight: '700', letterSpacing: 2, marginTop: 12 },
  foot: { position: 'absolute', bottom: 72 },
  footText: { color: '#E8CF9F', fontSize: 13.5 },
});
