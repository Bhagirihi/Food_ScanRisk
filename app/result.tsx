import { useCallback, useEffect, useRef, useState } from 'react';
import { Image, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import Tour, { type Measurable } from '../src/components/Tour';
import { ScoreGauge } from '../src/components/ScoreGauge';
import { Card, OutlinedButton, PrimaryButton, SectionTitle, TextButton, Toast } from '../src/components/ui';
import { hasSeenTip, markTipSeen } from '../src/lib/tips';
import { getTipsEnabled } from '../src/lib/settings';
import { getSelectedAllergens, matchedAllergens, type Allergen } from '../src/lib/allergens';
import { getCachedProduct, lookupBarcode, setCachedProduct } from '../src/lib/openfoodfacts';
import { CONCERN_ADDITIVES, scoreProduct, type RiskFactor, type RiskResult } from '../src/lib/risk';
import type { OffProduct } from '../src/lib/offParse';
import { saveScan } from '../src/lib/history';
import { COLORS, FONTS } from '../src/lib/theme';

type LoadState = 'loading' | 'found' | 'not-found' | 'error';

const FACTOR_ICONS: Record<string, keyof typeof MaterialIcons.glyphMap> = {
  nutriscore: 'fact-check',
  nova: 'precision-manufacturing',
  sugar: 'water-drop',
  salt: 'grain',
  satfat: 'opacity',
  transfat: 'warning',
};

const factorIcon = (f: RiskFactor): keyof typeof MaterialIcons.glyphMap =>
  f.id.startsWith('additive-') ? 'science' : (FACTOR_ICONS[f.id] ?? 'info');

const NOVA_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: 'Unprocessed', color: COLORS.green },
  2: { label: 'Processed ingredient', color: COLORS.amber },
  3: { label: 'Processed', color: COLORS.orange },
  4: { label: 'Ultra-Processed', color: COLORS.red },
};

const fmt = (v?: number): string =>
  v == null ? '—' : Number.isInteger(v) ? String(v) : v.toFixed(1);

export default function Result() {
  const params = useLocalSearchParams<{ barcode?: string }>();
  const [barcode, setBarcode] = useState('');
  const [reload, setReload] = useState(0);
  const [state, setState] = useState<LoadState>('loading');
  const [product, setProduct] = useState<OffProduct | null>(null);
  const [risk, setRisk] = useState<RiskResult | null>(null);
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>([]);
  const [savedToast, setSavedToast] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const containerRef = useRef<Measurable | null>(null);
  const gaugeRef = useRef<Measurable | null>(null);
  const savedRef = useRef<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Render-adjustment pattern: a new barcode resets the screen state.
  if (params.barcode !== barcode) {
    setBarcode(params.barcode ?? '');
    setState('loading');
    setProduct(null);
    setRisk(null);
    setImageFailed(false);
  }

  useEffect(() => {
    getSelectedAllergens().then(setSelectedAllergens);
  }, []);

  useEffect(() => {
    savedRef.current = null; // A new barcode (or a retry) starts unsaved.
    if (!barcode) return;
    let alive = true;
    (async () => {
      const cached = await getCachedProduct(barcode);
      if (cached) {
        if (!alive) return;
        applyProduct(cached);
        return;
      }
      try {
        const res = await lookupBarcode(barcode);
        if (!alive) return;
        if (res.status === 'not-found') {
          setState('not-found');
          return;
        }
        void setCachedProduct(res.product);
        applyProduct(res.product);
      } catch {
        if (alive) setState('error');
      }
    })();
    function applyProduct(p: OffProduct) {
      const r = scoreProduct(p);
      setProduct(p);
      setRisk(r);
      setState('found');
      if (savedRef.current !== barcode) {
        savedRef.current = barcode;
        void saveScan({ barcode: p.barcode, name: p.name, brand: p.brands, score: r.score, band: r.band }).then(
          () => {
            if (!alive) return;
            setSavedToast(true);
            toastTimer.current = setTimeout(() => setSavedToast(false), 2500);
          },
        );
      }
    }
    return () => {
      alive = false;
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, [barcode, reload]);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      let timer: ReturnType<typeof setTimeout> | undefined;
      if (state === 'found') {
        Promise.all([hasSeenTip('result'), getTipsEnabled()]).then(([seen, enabled]) => {
          if (alive && !seen && enabled) timer = setTimeout(() => setShowTour(true), 700);
        });
      }
      return () => {
        alive = false;
        if (timer) clearTimeout(timer);
      };
    }, [state]),
  );

  const closeTour = () => {
    setShowTour(false);
    void markTipSeen('result');
  };

  const shareText = () => {
    if (!product || !risk) return '';
    const lines = risk.factors.map((f) => `${f.label} +${f.points}`).join('; ');
    return `ScanRisk: ${product.name} scored ${risk.score}/50 (${risk.bandLabel}). ${lines}`;
  };

  const onShare = async () => {
    try {
      await Share.share({ message: shareText() });
    } catch {
      // Sharing is best-effort.
    }
  };

  const retry = () => {
    savedRef.current = null;
    setState('loading');
    setProduct(null);
    setRisk(null);
    setReload((r) => r + 1);
  };

  const matched: Allergen[] = product ? matchedAllergens(selectedAllergens, product.allergens) : [];
  const concernCount = product
    ? product.additives.filter((a) => a in CONCERN_ADDITIVES).length
    : 0;
  const sugarCap =
    product?.nutriments.sugars100 != null ? Math.round((product.nutriments.sugars100 / 25) * 100) : null;

  const statChips: { label: string; value: string }[] = [];
  if (sugarCap != null) statChips.push({ label: 'Daily Sugar Cap', value: `${sugarCap}%` });
  statChips.push({ label: 'Bio-Additives', value: String(concernCount) });
  if (product?.nutriscoreGrade) {
    statChips.push({ label: 'Nutri-Score Grade', value: product.nutriscoreGrade.toUpperCase() });
  }

  const nutritionRows: { label: string; value: string }[] = product
    ? [
        { label: 'Energy', value: `${fmt(product.nutriments.energyKcal100)} kcal` },
        { label: 'Total Fat', value: `${fmt(product.nutriments.fat100)} g` },
        { label: 'Saturated Fat', value: `${fmt(product.nutriments.saturatedFat100)} g` },
        { label: 'Total Carbs', value: `${fmt(product.nutriments.carbs100)} g` },
        { label: 'Sugars', value: `${fmt(product.nutriments.sugars100)} g` },
        { label: 'Proteins', value: `${fmt(product.nutriments.proteins100)} g` },
        { label: 'Salt', value: `${fmt(product.nutriments.salt100)} g` },
      ]
    : [];

  return (
    <View ref={(node) => { containerRef.current = node; }} style={styles.root}>
      <SafeAreaView style={styles.safe}>
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
          <View style={styles.headerRow}>
            <Pressable onPress={() => router.back()} style={styles.backButton} accessibilityLabel="Go back">
              <MaterialIcons name="arrow-back-ios" size={20} color={COLORS.ink} />
            </Pressable>
            <Text style={styles.headerTitle}>Product Analysis</Text>
            <Pressable onPress={onShare} style={styles.backButton} accessibilityLabel="Share">
              <MaterialIcons name="ios-share" size={20} color={COLORS.ink} />
            </Pressable>
          </View>

          {state === 'loading' ? (
            <Text style={styles.centerText}>Looking up the product…</Text>
          ) : state === 'not-found' ? (
            <View style={styles.centerWrap}>
              <Text style={styles.centerTitle}>Product not found</Text>
              <Text style={styles.centerBody}>
                Barcode {barcode} is not in the Open Food Facts database yet. Try another product.
              </Text>
              <View style={styles.buttonWrap}>
                <PrimaryButton label="Scan another" onPress={() => router.replace('/scan')} />
              </View>
            </View>
          ) : state === 'error' ? (
            <View style={styles.centerWrap}>
              <Text style={styles.centerTitle}>Could not load the product</Text>
              <Text style={styles.centerBody}>Check your connection and try again.</Text>
              <View style={styles.buttonWrap}>
                <PrimaryButton label="Try again" onPress={retry} />
              </View>
              <TextButton label="Scan another" onPress={() => router.replace('/scan')} />
            </View>
          ) : product && risk ? (
            <>
              <View style={styles.productRow}>
                {product.imageUrl && !imageFailed ? (
                  <Image
                    source={{ uri: product.imageUrl }}
                    style={styles.productImage}
                    onError={() => setImageFailed(true)}
                  />
                ) : (
                  <View style={styles.productImagePlaceholder}>
                    <MaterialIcons name="qr-code-scanner" size={40} color={COLORS.soft} />
                  </View>
                )}
                <View style={styles.productText}>
                  <Text style={styles.brand}>{product.brands ?? 'Unknown brand'}</Text>
                  <Text style={styles.productName}>{product.name}</Text>
                  {product.quantity ? <Text style={styles.meta}>{product.quantity}</Text> : null}
                  <Text style={styles.meta}>EAN {product.barcode}</Text>
                  {product.novaGroup != null && NOVA_LABELS[product.novaGroup] ? (
                    <View
                      style={[
                        styles.novaChip,
                        { backgroundColor: NOVA_LABELS[product.novaGroup].color },
                      ]}
                    >
                      <Text style={styles.novaChipText}>
                        NOVA {product.novaGroup} · {NOVA_LABELS[product.novaGroup].label}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>

              <View ref={(node) => { gaugeRef.current = node; }}>
                <ScoreGauge score={risk.score} band={risk.band} />
              </View>

              {statChips.length > 0 ? (
                <View style={styles.statRow}>
                  {statChips.map((c) => (
                    <View key={c.label} style={styles.statChip}>
                      <Text style={styles.statChipValue}>{c.value}</Text>
                      <Text style={styles.statChipLabel}>{c.label}</Text>
                    </View>
                  ))}
                </View>
              ) : null}

              <SectionTitle>Every Scoring Point Explained</SectionTitle>
              {risk.factors.length === 0 ? (
                <Card>
                  <Text style={styles.zeroText}>
                    No risk factors found — this product scores 0. Nothing in its label adds
                    points.
                  </Text>
                </Card>
              ) : (
                risk.factors.map((f) => (
                  <Card key={f.id} style={styles.factorCard}>
                    <View style={styles.factorRow}>
                      <MaterialIcons name={factorIcon(f)} size={22} color={COLORS.maroon} />
                      <View style={styles.factorText}>
                        <Text style={styles.factorLabel}>{f.label}</Text>
                        <Text style={styles.factorDetail}>{f.detail}</Text>
                      </View>
                      <View style={styles.factorPts}>
                        <Text style={styles.factorPtsText}>+{f.points}</Text>
                      </View>
                    </View>
                  </Card>
                ))
              )}

              <SectionTitle sub="Reference quantity: 100 g portion">Nutrition Facts</SectionTitle>
              <Card>
                {nutritionRows.map((row) => (
                  <View key={row.label} style={styles.nutriRow}>
                    <Text style={styles.nutriLabel}>{row.label}</Text>
                    <Text style={styles.nutriValue}>{row.value}</Text>
                  </View>
                ))}
              </Card>

              <SectionTitle>Declared Ingredients</SectionTitle>
              <Card>
                {product.allergens.length > 0 ? (
                  <View style={styles.allergenBox}>
                    <MaterialIcons name="warning" size={20} color={COLORS.amberDeep} />
                    <Text style={styles.allergenText}>
                      Allergen Advisory — Contains: {product.allergens.join(', ')}
                    </Text>
                  </View>
                ) : null}
                {matched.length > 0 ? (
                  <View style={styles.alertBox}>
                    <MaterialIcons name="warning" size={20} color={COLORS.danger} />
                    <Text style={styles.alertText}>
                      Allergen alert — this product contains{' '}
                      {matched.map((a) => a.label).join(', ')}, which is on your alert list.
                    </Text>
                  </View>
                ) : null}
                <Text style={styles.ingredients}>
                  {product.ingredientsText ?? 'Ingredients not listed for this product.'}
                </Text>
                {product.traces.length > 0 ? (
                  <Text style={styles.traces}>May contain traces of: {product.traces.join(', ')}</Text>
                ) : null}
              </Card>

              {risk.notes.length > 0 ? (
                <>
                  <SectionTitle>Notes for missing data</SectionTitle>
                  <Card>
                    {risk.notes.map((n) => (
                      <Text key={n} style={styles.noteText}>
                        • {n}
                      </Text>
                    ))}
                  </Card>
                </>
              ) : null}

              <View style={styles.actions}>
                <PrimaryButton
                  label="Scan Another Item"
                  icon="qr-code-scanner"
                  onPress={() => router.push('/scan')}
                />
                <OutlinedButton label="Share Score" icon="ios-share" onPress={onShare} />
              </View>
              <Text style={styles.disclaimer}>
                Guidance score from label data (Open Food Facts). Not medical advice.
              </Text>
            </>
          ) : null}
        </ScrollView>
      </SafeAreaView>

      {savedToast ? <Toast message="Saved to your scan history" bottom={32} /> : null}

      {showTour && product && risk ? (
        <Tour
          steps={[
            {
              key: 'gauge',
              title: 'Your risk score',
              body: 'The gauge shows the 0–50 score. Every point below explains exactly why it counts.',
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
  root: { flex: 1, backgroundColor: COLORS.bg },
  safe: { flex: 1 },
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.ink, fontFamily: FONTS.headline },
  centerText: { marginTop: 80, textAlign: 'center', color: COLORS.soft, fontSize: 15, fontFamily: FONTS.body },
  centerWrap: { marginTop: 80, alignItems: 'center', paddingHorizontal: 16 },
  centerTitle: { fontSize: 20, fontWeight: '700', color: COLORS.ink, fontFamily: FONTS.headline, textAlign: 'center' },
  centerBody: { color: COLORS.soft, fontSize: 15, lineHeight: 22, marginTop: 10, textAlign: 'center', fontFamily: FONTS.body },
  buttonWrap: { marginTop: 24, width: '100%' },
  productRow: { flexDirection: 'row', gap: 14, marginTop: 8 },
  productImage: { width: 110, height: 110, borderRadius: 16, backgroundColor: COLORS.card },
  productImagePlaceholder: {
    width: 110,
    height: 110,
    borderRadius: 16,
    backgroundColor: COLORS.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productText: { flex: 1 },
  brand: { fontSize: 12, fontWeight: '800', color: COLORS.soft, letterSpacing: 1, fontFamily: FONTS.bodyBold },
  productName: { fontSize: 21, fontWeight: '700', color: COLORS.ink, fontFamily: FONTS.headline, marginTop: 4, lineHeight: 26 },
  meta: { color: COLORS.soft, fontSize: 13, marginTop: 3, fontFamily: FONTS.body },
  novaChip: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, marginTop: 8 },
  novaChipText: { color: '#fff', fontSize: 12, fontWeight: '800', fontFamily: FONTS.bodyBold },
  statRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  statChip: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderColor: COLORS.line,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 12,
    gap: 2,
  },
  statChipValue: { fontSize: 18, fontWeight: '800', color: COLORS.ink, fontFamily: FONTS.headline },
  statChipLabel: { fontSize: 11, color: COLORS.soft, textAlign: 'center', fontFamily: FONTS.bodySemi },
  factorCard: { marginBottom: 10, padding: 16 },
  factorRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  factorText: { flex: 1 },
  factorLabel: { fontSize: 15, fontWeight: '700', color: COLORS.ink, fontFamily: FONTS.bodySemi },
  factorDetail: { fontSize: 13.5, color: COLORS.inkSoft, lineHeight: 19, marginTop: 3, fontFamily: FONTS.body },
  factorPts: { backgroundColor: COLORS.maroonSoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  factorPtsText: { color: COLORS.maroon, fontSize: 13, fontWeight: '800', fontFamily: FONTS.bodyBold },
  zeroText: { color: COLORS.inkSoft, fontSize: 14, lineHeight: 20, fontFamily: FONTS.body },
  nutriRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
  },
  nutriLabel: { fontSize: 14.5, color: COLORS.ink, fontFamily: FONTS.bodySemi },
  nutriValue: { fontSize: 14.5, fontWeight: '700', color: COLORS.ink, fontFamily: FONTS.bodySemi },
  allergenBox: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: COLORS.amberSoft,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  allergenText: { flex: 1, fontSize: 13.5, color: COLORS.inkSoft, lineHeight: 19, fontFamily: FONTS.bodySemi },
  alertBox: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: COLORS.dangerBg,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  alertText: { flex: 1, fontSize: 13.5, color: COLORS.danger, lineHeight: 19, fontFamily: FONTS.bodySemi },
  ingredients: { fontSize: 14, color: COLORS.inkSoft, lineHeight: 21, fontFamily: FONTS.body },
  traces: { fontSize: 13, color: COLORS.soft, marginTop: 10, lineHeight: 18, fontFamily: FONTS.body },
  noteText: { fontSize: 13.5, color: COLORS.inkSoft, lineHeight: 20, marginBottom: 6, fontFamily: FONTS.body },
  actions: { marginTop: 24, gap: 12 },
  disclaimer: { color: COLORS.soft, fontSize: 12, marginTop: 20, textAlign: 'center', fontFamily: FONTS.body },
});
