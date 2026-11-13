// Semi-circular risk dial, drawn with react-native-svg (Stitch design):
// a fixed green -> yellow -> orange -> red gradient arc (the colour scale),
// tick marks around it, and a needle pivoting at the diameter line pointing
// at the score. The number sits below the dial so the needle never crosses
// it. Display colours come from the theme BANDS — the scoring itself lives
// in src/lib/risk.ts and is untouched.

import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';

import { BANDS, COLORS, FONTS } from '../lib/theme';
import type { RiskBand } from '../lib/risk';

const W = 300;
const SVG_H = 172;
const CX = W / 2;
const CY = 140;
const R = 115;

function polar(deg: number, radius: number): [number, number] {
  const rad = (deg * Math.PI) / 180;
  return [CX + radius * Math.cos(rad), CY - radius * Math.sin(rad)];
}

function arcPath(startDeg: number, endDeg: number): string {
  const [sx, sy] = polar(startDeg, R);
  const [ex, ey] = polar(endDeg, R);
  return `M ${sx.toFixed(1)} ${sy.toFixed(1)} A ${R} ${R} 0 0 1 ${ex.toFixed(1)} ${ey.toFixed(1)}`;
}

/** Angle (degrees, 180 = left, 0 = right) for a 0-50 score. */
function angleForScore(score: number): number {
  const clamped = Math.min(50, Math.max(0, score));
  return 180 - (180 * clamped) / 50;
}

export function ScoreGauge({ score, band }: { score: number; band: RiskBand }) {
  const info = BANDS[band];
  const angle = angleForScore(score);
  const [nx, ny] = polar(angle, R - 18);
  const ticks: number[] = [];
  for (let deg = 0; deg <= 180; deg += 15) ticks.push(deg);

  return (
    <View style={styles.wrap}>
      <Svg width={W} height={SVG_H}>
        <Defs>
          <LinearGradient id="riskGrad" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#22C55E" />
            <Stop offset="0.3" stopColor="#A3E635" />
            <Stop offset="0.5" stopColor="#FACC15" />
            <Stop offset="0.75" stopColor="#F97316" />
            <Stop offset="1" stopColor="#DC2626" />
          </LinearGradient>
        </Defs>
        <Path
          d={arcPath(180, 0)}
          stroke="url(#riskGrad)"
          strokeWidth={16}
          fill="none"
          strokeLinecap="round"
        />
        {ticks.map((deg) => {
          const [x1, y1] = polar(deg, R + 12);
          const [x2, y2] = polar(deg, R + 22);
          return (
            <Line
              key={deg}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="#CBD5E1"
              strokeWidth={2}
              strokeLinecap="round"
            />
          );
        })}
        <Line x1={CX} y1={CY} x2={nx} y2={ny} stroke={COLORS.ink} strokeWidth={3} strokeLinecap="round" />
        <Circle cx={CX} cy={CY} r={8} fill={COLORS.ink} />
        <Circle cx={CX} cy={CY} r={3} fill="#fff" />
      </Svg>
      <View style={styles.ends}>
        <Text style={styles.endLabel}>0</Text>
        <Text style={styles.endLabel}>50</Text>
      </View>
      <View style={styles.center}>
        <Text style={styles.score}>
          {score}
          <Text style={styles.of}> / 50</Text>
        </Text>
        <Text style={[styles.riskLabel, { color: info.color }]}>RISK SCORE</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: W, alignSelf: 'center' },
  center: { alignItems: 'center', marginTop: -4 },
  score: { fontSize: 44, fontWeight: '800', color: COLORS.ink, fontFamily: FONTS.headline },
  of: { fontSize: 18, fontWeight: '600', color: COLORS.soft, fontFamily: FONTS.bodySemi },
  riskLabel: {
    fontSize: 12,
    fontWeight: '800',
    fontFamily: FONTS.bodyBold,
    letterSpacing: 2,
    marginTop: 4,
  },
  ends: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 28,
    marginTop: -14,
  },
  endLabel: { fontSize: 12, fontWeight: '700', color: COLORS.soft, fontFamily: FONTS.bodySemi },
});
