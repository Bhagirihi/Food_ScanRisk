// Semi-circular risk gauge, drawn with react-native-svg: a light track arc
// with a band-coloured arc for the score, the number in the bowl.
// Display colours come from the theme BANDS — the scoring itself lives in
// src/lib/risk.ts and is not touched here.

import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { BANDS } from '../lib/risk';
import type { RiskBand } from '../lib/risk';
import { COLORS, FONTS } from '../lib/theme';

const W = 280;
const H = 200;
const CX = W / 2;
const CY = 160;
const R = 118;

function polar(deg: number): [number, number] {
  const rad = (deg * Math.PI) / 180;
  return [CX + R * Math.cos(rad), CY - R * Math.sin(rad)];
}

function arcPath(startDeg: number, endDeg: number): string {
  const [sx, sy] = polar(startDeg);
  const [ex, ey] = polar(endDeg);
  return `M ${sx.toFixed(1)} ${sy.toFixed(1)} A ${R} ${R} 0 0 1 ${ex.toFixed(1)} ${ey.toFixed(1)}`;
}

export function ScoreGauge({ score, band }: { score: number; band: RiskBand }) {
  const info = BANDS[band];
  const clamped = Math.min(50, Math.max(0, score));
  const endDeg = 180 - (180 * clamped) / 50;
  return (
    <View style={styles.wrap}>
      <Svg width={W} height={H}>
        <Path d={arcPath(180, 0)} stroke={COLORS.line} strokeWidth={16} fill="none" strokeLinecap="round" />
        {clamped > 0 ? (
          <Path d={arcPath(180, endDeg)} stroke={info.color} strokeWidth={16} fill="none" strokeLinecap="round" />
        ) : null}
      </Svg>
      <View style={styles.center}>
        <Text style={styles.score}>
          {score}
          <Text style={styles.of}> / 50</Text>
        </Text>
        <Text style={[styles.band, { color: info.color }]}>{info.label}</Text>
      </View>
      <View style={styles.ends}>
        <Text style={styles.endLabel}>0</Text>
        <Text style={styles.endLabel}>50</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: W, height: H, alignSelf: 'center' },
  center: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: CY,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 34,
  },
  score: { fontSize: 42, fontWeight: '800', color: COLORS.ink, fontFamily: FONTS.headline },
  of: { fontSize: 18, fontWeight: '600', color: COLORS.soft, fontFamily: FONTS.bodySemi },
  band: { fontSize: 15, fontWeight: '800', fontFamily: FONTS.bodyBold, marginTop: 2 },
  ends: {
    position: 'absolute',
    bottom: 2,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  endLabel: { fontSize: 12, fontWeight: '700', color: COLORS.soft, fontFamily: FONTS.bodySemi },
});
