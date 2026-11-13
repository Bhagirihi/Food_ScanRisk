import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScoreGauge } from '../src/components/ScoreGauge';
import Tour, { type Measurable } from '../src/components/Tour';
import { PrimaryButton, SectionTitle, TextButton } from '../src/components/ui';
import { getCachedProduct, lookupBarcode, setCachedProduct } from '../src/lib/openfoodfacts';
import type { OffProduct } from '../src/lib/offParse';
import { saveScan } from '../src/lib/history';
import { scoreProduct } from '../src/lib/risk';
import type { RiskResult } from '../src/lib/risk';
import { hasSeenTip, markTipSeen } from '../src/lib/tips';
import { COLORS, SERIF } from '../src/lib/theme';

type State = 'loading' | 'found' | 'not-found' | 'error';

const fmt = (v: number): string => (Number.isInteger(v) ? String(v) : v.toFixed(1));

function nutritionRows(p: OffProduct): { label: string; value: string }[] {
  const n = p.nutriments;
  const rows: { label: string; value: string }[] = [];
  if (n.energyKcal100 != null) rows.push({ label: 'Energy', value: `${fmt(n.energyKcal100)} kcal` });
  if (n.fat100 != null) rows.push({ label: 'Fat', value: `${fmt(n.fat100)} g` });
  if (n.saturatedFat100 != null)
    rows.push({ label: 'Saturated fat', value: `${fmt(n.saturatedFat100)} g` });
  if (n.carbs100 != null) rows.push({ label: 'Carbohydrates', value: `${fmt(n.carbs100)} g` });
  if (n.sugars100 != null) rows.push({ label: 'Sugars', value: `${fmt(n.sugars100)} g` });
  if (n.proteins100 != null) rows.push({ label: 'Protein', value: `${fmt(n.proteins100)} g` });
  if (n.salt100 != null) rows.push({ label: 'Salt', value: `${fmt(n.salt100)} g` });
  return rows;
}

export default function Result() {
  const params = useLocalSearchParams<{ barcode: string }>();
  const raw = params.barcode;
  const barcode = Array.isArray(raw) ? raw[0] : raw;

  const [state, setState] = useState<State>(barcode ? 'loading' : 'error');
  const [attempt, setAttempt] = useState(0);
  const [product, setProduct] = useState<OffProduct | null>(null);
  const [risk, setRisk] = useState<RiskResult | null>(null);
  const [showTour, setShowTour] = useState(false);
  const containerRef = useRef<Measurable | null>(null);
  const gaugeRef = useRef<Measurable | null>(null);

  // Reset the view when a different barcode arrives (React's documented
  // "adjusting state during render" pattern — the lookup effect below only
  // fetches, it never resets state synchronously).
  const [prevBarcode, setPrevBarcode] = useState(barcode);
  if (prevBarcode !== barcode) {
    setPrevBarcode(barcode);
    setState(barcode ? 'loading' : 'error');
    setProduct(null);
    setRisk(null);
  }

  useEffect(() => {
    if (!barcode) return;
    let alive = true;
    (async () => {
      try {
        const cached = await getCachedProduct(barcode);
        const result = cached
          ? { status: 'found' as const, product: cached }
          : await lookupBarcode(barcode);
        if (result.status === 'found' && !cached) await setCachedProduct(result.product);
        if (!alive) return;
        if (result.status === 'found') {
          const r = scoreProduct(result.product);
          setProduct(result.product);
          setRisk(r);
          setState('found');
          await saveScan({
            barcode,
            name: result.product.name,
            brand: result.product.brands,
            score: r.score,
            band: r.band,
          });
        } else {
          setState('not-found');
        }
      } catch {
        if (alive) setState('error');
      }
    })();
    return () => {
      alive = false;
    };
  }, [barcode, attempt]);

  useEffect(() => {
    if (state !== 'found') return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    hasSeenTip('result').then((seen) => {
      if (alive && !seen) timer = setTimeout(() => setShowTour(true), 700);
    });
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
    };
  }, [state]);

  const closeTour = () => {
    setShowTour(false);
    void markTipSeen('result');
  };

  if (state === 'loading') {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Looking up {barcode}…</Text>
        <Text style={styles.body}>Fetching product details from Open Food Facts.</Text>
      </View>
    );
  }

  if (state === 'not-found') {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Not in the database yet</Text>
        <Text style={styles.body}>
          Barcode {barcode} has no product record in Open Food Facts. It may be a new, local or
          unlisted product.
        </Text>
        <View style={styles.buttonWrap}>
          <PrimaryButton label="Scan another" onPress={() => router.replace('/scan')} />
        </View>
        <TextButton label="Home" onPress={() => router.replace('/')} />
      </View>
    );
  }

  if (state === 'error' || !product || !risk) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Could not look this up</Text>
        <Text style={styles.body}>
          {!barcode
            ? 'No barcode was provided.'
            : 'Check your internet connection and try again.'}
        </Text>
        {barcode ? (
          <View style={styles.buttonWrap}>
            <PrimaryButton
              label="Retry"
              onPress={() => {
                setState('loading');
                setAttempt((a) => a + 1);
              }}
            />
          </View>
        ) : null}
        <TextButton label="Home" onPress={() => router.replace('/')} />
      </View>
    );
  }

  const rows = nutritionRows(product);

  return (
    <View ref={(node) => { containerRef.current = node; }} style={styles.root}>
      <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safe}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.name}>{product.name}</Text>
        {product.brands ? (
          <Text style={styles.brand}>
            {product.brands}
            {product.quantity ? ` · ${product.quantity}` : ''}
          </Text>
        ) : null}

        <View ref={(node) => { gaugeRef.current = node; }}>
          <ScoreGauge score={risk.score} band={risk.band} />
        </View>

        <SectionTitle>Why this score</SectionTitle>
        {risk.factors.length === 0 ? (
          <Text style={styles.bodyLeft}>No risk factors found in the label data.</Text>
        ) : (
          risk.factors.map((f) => (
            <View key={f.id} style={styles.factor}>
              <View style={styles.factorHead}>
                <Text style={styles.factorLabel}>{f.label}</Text>
                <Text style={styles.factorPoints}>+{f.points}</Text>
              </View>
              <Text style={styles.factorDetail}>{f.detail}</Text>
            </View>
          ))
        )}

        {risk.notes.length > 0 ? (
          <View style={styles.notesBox}>
            {risk.notes.map((note, i) => (
              <Text key={i} style={styles.note}>
                • {note}
              </Text>
            ))}
          </View>
        ) : null}

        {rows.length > 0 ? (
          <>
            <SectionTitle>Nutrition per 100g</SectionTitle>
            <View style={styles.table}>
              {rows.map((r) => (
                <View key={r.label} style={styles.tableRow}>
                  <Text style={styles.tableLabel}>{r.label}</Text>
                  <Text style={styles.tableValue}>{r.value}</Text>
                </View>
              ))}
            </View>
          </>
        ) : null}

        {product.ingredientsText ? (
          <>
            <SectionTitle>Ingredients</SectionTitle>
            <Text style={styles.bodyLeft}>{product.ingredientsText}</Text>
          </>
        ) : null}

        {product.allergens.length > 0 || product.traces.length > 0 ? (
          <View style={styles.allergenBox}>
            {product.allergens.length > 0 ? (
              <Text style={styles.allergen}>Contains: {product.allergens.join(', ')}</Text>
            ) : null}
            {product.traces.length > 0 ? (
              <Text style={styles.allergen}>Traces of: {product.traces.join(', ')}</Text>
            ) : null}
          </View>
        ) : null}

        <View style={styles.buttonWrap}>
          <PrimaryButton label="Scan another" onPress={() => router.replace('/scan')} />
        </View>
        <TextButton label="Home" onPress={() => router.replace('/')} />

        <Text style={styles.disclaimer}>
          Guidance score from label data (Open Food Facts). Not medical advice. Barcode {barcode}.
        </Text>
      </ScrollView>
      </SafeAreaView>
      {showTour ? (
        <Tour
          steps={[
            {
              key: 'gauge',
              title: 'Your risk score',
              body: '0 is low, 50 is very high. Each factor below adds points — read through them to see why.',
            },
          ]}
          targets={{ gauge: gaugeRef }}
          containerRef={containerRef}
          onDone={closeTour}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  center: { alignItems: 'center', flex: 1, justifyContent: 'center', padding: 24 },
  name: { color: COLORS.maroon, fontSize: 26, fontWeight: '700', fontFamily: SERIF },
  brand: { color: COLORS.soft, fontSize: 15, marginTop: 4 },
  title: { fontSize: 20, fontWeight: '700', fontFamily: SERIF, textAlign: 'center' },
  body: { color: COLORS.inkSoft, fontSize: 14, lineHeight: 20, marginTop: 8, textAlign: 'center' },
  bodyLeft: { color: COLORS.inkSoft, fontSize: 14, lineHeight: 20, marginTop: 8 },
  factor: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.line,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 8,
    padding: 14,
  },
  factorHead: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  factorLabel: { flex: 1, fontSize: 15, fontWeight: '700' },
  factorPoints: { color: COLORS.danger, fontSize: 15, fontWeight: '800' },
  factorDetail: { color: COLORS.inkSoft, fontSize: 13, lineHeight: 18, marginTop: 4 },
  notesBox: {
    backgroundColor: '#FFF8E6',
    borderColor: '#F0D9A0',
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 12,
    padding: 12,
  },
  note: { color: COLORS.inkSoft, fontSize: 13, lineHeight: 18, marginBottom: 4 },
  table: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.line,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  tableRow: {
    borderBottomColor: COLORS.line,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  tableLabel: { fontSize: 14 },
  tableValue: { fontSize: 14, fontWeight: '700' },
  allergenBox: {
    backgroundColor: COLORS.dangerBg,
    borderColor: '#F5C6C2',
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 16,
    padding: 12,
  },
  allergen: { color: COLORS.danger, fontSize: 14, fontWeight: '700', lineHeight: 20 },
  buttonWrap: { marginTop: 24 },
  disclaimer: { color: COLORS.soft, fontSize: 12, marginTop: 20, textAlign: 'center' },
});
