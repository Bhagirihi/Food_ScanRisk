// Branded in-app splash (Stitch design): deep-maroon gradient, white
// rounded-square logo with a gold glow, wordmark, tagline, progress bar,
// stats row, Open Food Facts footer. Shows while the app checks
// onboarding / session state (see _layout).

import { useEffect, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';

import { COLORS, FONTS, GRADIENTS } from '../lib/theme';

const BARS = [3, 2, 6, 2, 3, 8, 2, 4, 3, 2, 6, 3];
// Bars must fit INSIDE the logo box: 44 units * 1.5 + 11 gaps * 2 = 88px
// inside a 112px box (12px padding each side). The old w*3/gap-4 bars were
// 176px wide in a 96px box and overflowed ~40px on each side.

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
        <View style={styles.logoBox}>
          <View style={styles.bars}>
            {BARS.map((w, i) => (
              <View
                key={i}
                style={{
                  width: w * 1.5,
                  height: i % 3 === 0 ? 64 : 48,
                  backgroundColor: COLORS.amber,
                }}
              />
            ))}
          </View>
        </View>
      </Animated.View>
      <Text style={styles.name}>ScanRisk</Text>
      <Text style={styles.tag}>KNOW WHAT YOU CONSUME</Text>

      <View style={styles.progressWrap}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: '100%' }]} />
        </View>
        <Text style={styles.sync}>SYNC 99.8%</Text>
      </View>

      <View style={styles.stats}>
        <View style={styles.stat}>
          <MaterialIcons name="science" size={18} color="#F5D98B" />
          <Text style={styles.statText}>Additives checked</Text>
        </View>
        <View style={styles.stat}>
          <MaterialIcons name="restaurant" size={18} color="#F5D98B" />
          <Text style={styles.statText}>Nutrition / 100 g</Text>
        </View>
        <View style={styles.stat}>
          <MaterialIcons name="verified" size={18} color="#F5D98B" />
          <Text style={styles.statText}>Allergen alerts</Text>
        </View>
      </View>

      <View style={styles.foot}>
        <Text style={styles.footText}>Powered by Open Food Facts</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  logoBox: {
    width: 112,
    height: 112,
    borderRadius: 28,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 24,
    elevation: 12,
  },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  name: {
    color: '#fff',
    fontSize: 38,
    fontWeight: '700',
    fontFamily: FONTS.headline,
    marginTop: 28,
    letterSpacing: 0.4,
  },
  tag: { color: '#F5D98B', fontSize: 12, fontWeight: '700', letterSpacing: 2.5, marginTop: 10 },
  progressWrap: { marginTop: 36, width: '100%', alignItems: 'center' },
  progressTrack: {
    width: '100%',
    height: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.18)',
    overflow: 'hidden',
  },
  progressFill: { height: 6, borderRadius: 999, backgroundColor: COLORS.amber },
  sync: { color: '#E8CF9F', fontSize: 12, fontWeight: '700', letterSpacing: 1.5, marginTop: 10 },
  stats: { flexDirection: 'row', gap: 20, marginTop: 36 },
  stat: { alignItems: 'center', gap: 6, flex: 1 },
  statText: { color: '#F5D98B', fontSize: 11.5, fontWeight: '600', textAlign: 'center', fontFamily: FONTS.bodySemi },
  foot: { position: 'absolute', bottom: 56 },
  footText: { color: '#E8CF9F', fontSize: 13 },
});
