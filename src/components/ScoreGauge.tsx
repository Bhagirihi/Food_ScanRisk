import { StyleSheet, Text, View } from 'react-native';

import { BANDS, type RiskBand } from '../lib/risk';
import { COLORS, SERIF } from '../lib/theme';

export function ScoreGauge({ score, band }: { score: number; band: RiskBand }) {
  const info = BANDS[band];
  return (
    <View style={styles.wrap}>
      <View style={styles.top}>
        <Text style={[styles.score, { color: info.color }]}>{score}</Text>
        <Text style={styles.of}>/ 50</Text>
        <View style={[styles.badge, { backgroundColor: info.color }]}>
          <Text style={styles.badgeText}>{info.label}</Text>
        </View>
      </View>
      <View style={styles.track}>
        <View
          style={[styles.fill, { width: `${(score / 50) * 100}%`, backgroundColor: info.color }]}
        />
      </View>
      <View style={styles.scale}>
        <Text style={styles.scaleText}>0 · Low</Text>
        <Text style={styles.scaleText}>25</Text>
        <Text style={styles.scaleText}>50 · Very high</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginVertical: 8 },
  top: { alignItems: 'baseline', flexDirection: 'row', gap: 6 },
  score: { fontSize: 56, fontWeight: '700', fontFamily: SERIF, lineHeight: 60 },
  of: { color: COLORS.soft, fontSize: 18 },
  badge: { borderRadius: 999, marginLeft: 8, paddingHorizontal: 12, paddingVertical: 6 },
  badgeText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  track: { backgroundColor: COLORS.line, borderRadius: 999, height: 12, marginTop: 12, overflow: 'hidden' },
  fill: { borderRadius: 999, height: 12 },
  scale: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  scaleText: { color: COLORS.soft, fontSize: 12 },
});
