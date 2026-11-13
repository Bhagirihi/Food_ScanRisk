// Result screen, rebuilt to the Stitch "Product Analysis Detail" frame:
// header with avatar, persistent "Saved to your scan history" banner,
// product card with quantity badge + brand/category eyebrow, the needle-dial
// gauge card, label-top stat tiles, factor cards with category tags, a 2x2
// nutrition grid, and ingredients with bolded allergens. All data is the
// real scanned product; the score comes from our model in src/lib/risk.ts.

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Image, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import Tour, { type Measurable } from '../src/components/Tour';
import { ScoreGauge } from '../src/components/ScoreGauge';
import { Card, PrimaryButton, SectionTitle, SoftButton, TextButton } from '../src/components/ui';
import { hasSeenTip, markTipSeen } from '../src/lib/tips';
import { getTipsEnabled } from '../src/lib/settings';
import { getSelectedAllergens, matchedAllergens, type Allergen } from '../src/lib/allergens';
import { getCachedProduct, lookupBarcode, setCachedProduct } from '../src/lib/openfoodfacts';
import { findSmartSwap, type SmartSwap } from '../src/lib/smartSwap';
import { CONCERN_ADDITIVES, scoreProduct, type RiskFactor, type RiskResult } from '../src/lib/risk';
import type { OffProduct } from '../src/lib/offParse';
import { saveScan } from '../src/lib/history';
import { getSession } from '../src/lib/supabase';
import { isGuest } from '../src/lib/session';
import { BANDS, COLORS, FONTS } from '../src/lib/theme';

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

/** Small category tag under each factor's points (Stitch layout, our wording). */
const FACTOR_TAGS: Record<string, string> = {
  nutriscore: 'Nutrition quality',
  nova: 'Food matrix',
  sugar: 'Glycemic load',
  salt: 'Sodium load',
  satfat: 'Lipid profile',
  transfat: 'Lipid profile',
};

const factorTag = (f: RiskFactor): string =>
  f.id.startsWith('additive-') ? 'Additive rating' : (FACTOR_TAGS[f.id] ?? 'Label data');

const NOVA_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: 'Unprocessed', color: COLORS.green },
  2: { label: 'Processed ingredient', color: COLORS.amber },
  3: { label: 'Processed', color: COLORS.orange },
  4: { label: 'Ultra-Processed', color: COLORS.red },
};

const fmt = (v?: number): string =>
  v == null ? '—' : Number.isInteger(v) ? String(v) : v.toFixed(1);

const fmtG = (v?: number): string => (v == null ? '—' : `${fmt(v)}g`);

/** Allergen words to bold inside the ingredients text, expanded to the
 * ingredient forms they appear as (nuts -> hazelnuts, soy -> lecithin). */
const ALLERGEN_EXPAND: Record<string, string[]> = {
  nuts: ['hazelnut', 'almond', 'walnut', 'cashew', 'pistachio'],
  milk: ['whey', 'casein', 'lactose'],
  soybeans: ['soy', 'soya', 'lecithin'],
  soy: ['soya', 'lecithin'],
  gluten: ['wheat', 'barley', 'rye'],
};

function allergenKeywords(tags: string[]): string[] {
  const set = new Set<string>();
  for (const raw of tags) {
    const t = raw.toLowerCase();
    set.add(t);
    const singular = t.endsWith('s') ? t.slice(0, -1) : t;
    set.add(singular);
    for (const extra of ALLERGEN_EXPAND[t] ?? []) set.add(extra);
    for (const extra of ALLERGEN_EXPAND[singular] ?? []) set.add(extra);
  }
  return [...set].filter((k) => k.length > 1);
}

/** Split the ingredients text so whole words containing an allergen keyword
 * (plus a following "(13%)" amount) render bold. */
function boldIngredientParts(text: string, keywords: string[]): ReactNode[] {
  if (keywords.length === 0) return [text];
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(
    `\\b\\w*(${keywords.map(esc).join('|')})\\w*(\\s*\\(\\d+(\\.\\d+)?%\\))?`,
    'gi',
  );
  const parts: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = pattern.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push(
      <Text key={key++} style={styles.ingredientsBold}>
        {m[0]}
      </Text>,
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

/** Protein sources named in the ingredients, e.g. "Milk & Hazelnut". */
const PROTEIN_SOURCES: [RegExp, string][] = [
  [/milk|whey|casein/, 'Milk'],
  [/hazelnut/, 'Hazelnut'],
  [/almond/, 'Almond'],
  [/egg/, 'Egg'],
  [/soy|soya/, 'Soy'],
  [/peanut/, 'Peanut'],
  [/chicken/, 'Chicken'],
  [/fish/, 'Fish'],
  [/wheat/, 'Wheat'],
  [/pea\b/, 'Pea'],
];

function proteinSources(ingredients?: string): string | undefined {
  if (!ingredients) return undefined;
  const lower = ingredients.toLowerCase();
  const found: string[] = [];
  for (const [re, label] of PROTEIN_SOURCES) {
    if (re.test(lower) && !found.includes(label)) found.push(label);
    if (found.length === 2) break;
  }
  return found.length > 0 ? found.join(' & ') : undefined;
}

export default function Result() {
  const params = useLocalSearchParams<{ barcode?: string }>();
  const [barcode, setBarcode] = useState('');
  const [reload, setReload] = useState(0);
  const [state, setState] = useState<LoadState>('loading');
  const [product, setProduct] = useState<OffProduct | null>(null);
  const [risk, setRisk] = useState<RiskResult | null>(null);
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>([]);
  const [displayName, setDisplayName] = useState('Guest');
  const [savedBanner, setSavedBanner] = useState(false);
  const [swap, setSwap] = useState<SmartSwap | null>(null);
  const [imageFailed, setImageFailed] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const containerRef = useRef<Measurable | null>(null);
  const gaugeRef = useRef<Measurable | null>(null);
  const savedRef = useRef<string | null>(null);

  // Render-adjustment pattern: a new barcode resets the screen state.
  if (params.barcode !== barcode) {
    setBarcode(params.barcode ?? '');
    setState('loading');
    setProduct(null);
    setRisk(null);
    setImageFailed(false);
    setSavedBanner(false);
    setSwap(null);
  }

  useEffect(() => {
    getSelectedAllergens().then(setSelectedAllergens);
  }, []);

  useEffect(() => {
    Promise.all([getSession(), isGuest()]).then(([s, guest]) => {
      const meta = (s?.user?.user_metadata ?? {}) as { full_name?: string };
      setDisplayName(guest ? 'Guest' : meta.full_name || s?.user?.email?.split('@')[0] || 'Guest');
    });
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
            setSavedBanner(true);
          },
        );
      }
    }
    return () => {
      alive = false;
    };
  }, [barcode, reload]);

  useEffect(() => {
    if (!product) return;
    let alive = true;
    findSmartSwap(product).then((s) => {
      if (alive) setSwap(s);
    });
    return () => {
      alive = false;
    };
  }, [product]);

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
    setSavedBanner(false);
    setReload((r) => r + 1);
  };

  const matched: Allergen[] = product ? matchedAllergens(selectedAllergens, product.allergens) : [];
  const concernCount = product
    ? product.additives.filter((a) => a in CONCERN_ADDITIVES).length
    : 0;
  const sugarCap =
    product?.nutriments.sugars100 != null ? Math.round((product.nutriments.sugars100 / 25) * 100) : null;

  const statTiles: { label: string; value: string; color: string }[] = [];
  if (sugarCap != null) {
    statTiles.push({
      label: 'Daily Sugar Cap',
      value: `${sugarCap}%`,
      color: sugarCap > 100 ? COLORS.danger : COLORS.green,
    });
  }
  statTiles.push({
    label: 'Bio-Additives',
    value: concernCount > 0 ? `${concernCount} Added` : 'None',
    color: concernCount > 0 ? COLORS.amberBrown : COLORS.green,
  });
  if (product?.nutriscoreGrade) {
    statTiles.push({
      label: 'Nutri-Score',
      value: `Grade ${product.nutriscoreGrade.toUpperCase()}`,
      color: COLORS.ink,
    });
  }

  const n = product?.nutriments;
  const nutriTiles: { label: string; value: string; sub?: string; dot: string }[] = product
    ? [
        {
          label: 'Total Fat',
          value: fmtG(n?.fat100),
          sub:
            n?.saturatedFat100 != null ? `Sat. Fat: ${fmt(n.saturatedFat100)}g` : undefined,
          dot: n?.saturatedFat100 != null && n.saturatedFat100 > 5 ? COLORS.amber : COLORS.green,
        },
        {
          label: 'Total Carbs',
          value: fmtG(n?.carbs100),
          sub: n?.sugars100 != null ? `Sugars: ${fmt(n.sugars100)}g` : undefined,
          dot:
            n?.sugars100 != null && n.sugars100 > 22.5
              ? COLORS.danger
              : n?.sugars100 != null && n.sugars100 > 12.5
                ? COLORS.amber
                : COLORS.green,
        },
        {
          label: 'Proteins',
          value: fmtG(n?.proteins100),
          sub: proteinSources(product.ingredientsText),
          dot: COLORS.green,
        },
        {
          label: 'Sodium / Salt',
          value: fmtG(n?.salt100),
          sub: n?.sodium100 != null ? `Sodium: ${Math.round(n.sodium100 * 1000)} mg` : undefined,
          dot:
            n?.salt100 != null && n.salt100 > 1.5
              ? COLORS.danger
              : n?.salt100 != null && n.salt100 > 0.6
                ? COLORS.amber
                : COLORS.green,
        },
      ]
    : [];

  // Fields that are genuinely missing for this product — the info box names
  // only these, never an invented one.
  const missingFields: string[] = [];
  if (product) {
    if (!product.nutriscoreGrade) missingFields.push('Nutri-Score grade');
    if (product.novaGroup == null) missingFields.push('processing level (NOVA)');
    if (n?.sugars100 == null) missingFields.push('sugar content');
    if (n?.salt100 == null) missingFields.push('salt content');
    if (n?.saturatedFat100 == null) missingFields.push('saturated fat');
    if (!product.ingredientsText) missingFields.push('ingredients list');
    if (!product.imageUrl) missingFields.push('product photo');
  }

  const eyebrowParts: string[] = [];
  if (product?.brands) eyebrowParts.push(product.brands.toUpperCase());
  if (product?.category) eyebrowParts.push(product.category);
  const eyebrow = eyebrowParts.join(' · ');

  const bandColor = risk ? BANDS[risk.band].color : COLORS.ink;

  return (
    <View ref={(node) => { containerRef.current = node; }} style={styles.root}>
      <SafeAreaView style={styles.safe}>
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
          <View style={styles.headerRow}>
            <Pressable onPress={() => router.back()} style={styles.backButton} accessibilityLabel="Go back">
              <MaterialIcons name="arrow-back-ios" size={20} color={COLORS.ink} />
            </Pressable>
            <Text style={styles.headerTitle}>Product Analysis Detail</Text>
            <Pressable onPress={onShare} style={styles.backButton} accessibilityLabel="Share">
              <MaterialIcons name="ios-share" size={20} color={COLORS.ink} />
            </Pressable>
            <Pressable
              style={styles.avatar}
              onPress={() => router.push('/profile')}
              accessibilityLabel="Profile"
            >
              <Text style={styles.avatarText}>{displayName.charAt(0).toUpperCase()}</Text>
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
              {savedBanner ? (
                <View style={styles.savedBanner}>
                  <MaterialIcons name="check-circle" size={20} color="#fff" />
                  <Text style={styles.savedBannerText}>Saved to your scan history</Text>
                  <Pressable onPress={() => setSavedBanner(false)} accessibilityLabel="Dismiss">
                    <MaterialIcons name="close" size={18} color="#fff" />
                  </Pressable>
                </View>
              ) : null}

              <View style={styles.productRow}>
                <View style={styles.thumbWrap}>
                  {product.imageUrl && !imageFailed ? (
                    <Image
                      source={{ uri: product.imageUrl }}
                      style={styles.productImage}
                      onError={() => setImageFailed(true)}
                    />
                  ) : (
                    <View style={styles.productImagePlaceholder}>
                      <MaterialIcons name="qr-code-scanner" size={32} color={COLORS.soft} />
                    </View>
                  )}
                  {product.quantity ? (
                    <View style={styles.qtyBadge}>
                      <Text style={styles.qtyBadgeText}>{product.quantity}</Text>
                    </View>
                  ) : null}
                </View>
                <View style={styles.productText}>
                  {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
                  <Text style={styles.productName} numberOfLines={2}>
                    {product.name}
                  </Text>
                  <View style={styles.eanRow}>
                    {product.novaGroup != null && NOVA_LABELS[product.novaGroup] ? (
                      <View
                        style={[
                          styles.novaChip,
                          { backgroundColor: NOVA_LABELS[product.novaGroup].color },
                        ]}
                      >
                        <Text style={styles.novaChipText}>
                          NOVA {product.novaGroup} {NOVA_LABELS[product.novaGroup].label}
                        </Text>
                      </View>
                    ) : null}
                    <Text style={styles.ean}>EAN {product.barcode}</Text>
                  </View>
                </View>
              </View>

              <Card style={styles.gaugeCard}>
                <View style={styles.gaugeHeader}>
                  <View style={styles.gaugeTitleWrap}>
                    <MaterialIcons name="monitor-heart" size={20} color={COLORS.ink} />
                    <Text style={styles.gaugeTitle}>Metabolic Risk Index</Text>
                  </View>
                  <View style={[styles.riskPill, { backgroundColor: `${bandColor}1A` }]}>
                    <View style={[styles.riskDot, { backgroundColor: bandColor }]} />
                    <Text style={[styles.riskPillText, { color: bandColor }]}>
                      {risk.bandLabel.toUpperCase()}
                    </Text>
                  </View>
                </View>
                <View ref={(node) => { gaugeRef.current = node; }}>
                  <ScoreGauge score={risk.score} band={risk.band} />
                </View>
              </Card>

              {statTiles.length > 0 ? (
                <View style={styles.statRow}>
                  {statTiles.map((t) => (
                    <View key={t.label} style={styles.statTile}>
                      <Text style={styles.statLabel}>{t.label}</Text>
                      <Text style={[styles.statValue, { color: t.color }]}>{t.value}</Text>
                    </View>
                  ))}
                </View>
              ) : null}

              <SectionTitle>Every Scoring Point Explained</SectionTitle>
              <Text style={styles.sectionIntro}>
                Every product is scored 0–50 from its label. Points come from Nutri-Score,
                processing level (NOVA), sugar, salt, saturated fat, trans fat, and additives
                of concern.
              </Text>
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
                      <View style={styles.factorIconTile}>
                        <MaterialIcons name={factorIcon(f)} size={20} color={COLORS.maroon} />
                      </View>
                      <View style={styles.factorText}>
                        <Text style={styles.factorLabel}>{f.label}</Text>
                        <Text style={styles.factorDetail}>{f.detail}</Text>
                      </View>
                      <View style={styles.factorRight}>
                        <Text style={styles.factorPtsText}>+{f.points} pts</Text>
                        <Text style={styles.factorTag}>{factorTag(f)}</Text>
                      </View>
                    </View>
                  </Card>
                ))
              )}
              {concernCount > 3 ? (
                <Text style={styles.extraNote}>
                  Plus {concernCount - 3} more additives of concern not counted in the score.
                </Text>
              ) : null}

              {swap ? (
                <>
                  <SectionTitle>Smart Swap</SectionTitle>
                  <Card style={styles.swapCard}>
                    <View style={styles.swapRow}>
                      <View style={styles.swapText}>
                        <Text style={styles.swapLabel}>A BETTER OPTION IN THE SAME CATEGORY</Text>
                        <Text style={styles.swapName}>{swap.product.name}</Text>
                        <Text style={styles.swapMeta}>
                          {swap.product.brands ? `${swap.product.brands} • ` : ''}
                          {swap.score} / 50 {BANDS[swap.band].label}
                        </Text>
                      </View>
                      <View style={styles.swapBoost}>
                        <Text style={styles.swapBoostText}>+{swap.boost} Score Boost</Text>
                      </View>
                    </View>
                    <TextButton
                      label="View this swap"
                      onPress={() =>
                        router.push({ pathname: '/result', params: { barcode: swap.product.barcode } })
                      }
                    />
                  </Card>
                </>
              ) : null}

              <View style={styles.nutriHeader}>
                <View>
                  <Text style={styles.nutriTitle}>Nutrition Facts</Text>
                  <Text style={styles.nutriSub}>Reference quantity: 100 g portion</Text>
                </View>
                {n?.energyKcal100 != null ? (
                  <View style={styles.kcalPill}>
                    <Text style={styles.kcalText}>{fmt(n.energyKcal100)} kcal</Text>
                  </View>
                ) : null}
              </View>
              <View style={styles.nutriGrid}>
                {nutriTiles.map((t) => (
                  <View key={t.label} style={styles.nutriTile}>
                    <View style={styles.nutriTileTop}>
                      <Text style={styles.nutriTileLabel}>{t.label}</Text>
                      <View style={[styles.nutriDot, { backgroundColor: t.dot }]} />
                    </View>
                    <Text style={styles.nutriTileValue}>{t.value}</Text>
                    {t.sub ? <Text style={styles.nutriTileSub}>{t.sub}</Text> : null}
                  </View>
                ))}
              </View>

              <SectionTitle>Declared Ingredients</SectionTitle>
              <Card>
                {product.allergens.length > 0 ? (
                  <View style={styles.allergenBox}>
                    <MaterialIcons name="warning" size={20} color={COLORS.amberDeep} />
                    <Text style={styles.allergenText}>
                      Allergen Advisory — Contains:{' '}
                      {product.allergens
                        .map((a) => a.charAt(0).toUpperCase() + a.slice(1))
                        .join(', ')}
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
                  {product.ingredientsText
                    ? boldIngredientParts(
                        product.ingredientsText,
                        allergenKeywords(product.allergens),
                      )
                    : 'Ingredients not listed for this product.'}
                </Text>
                {product.traces.length > 0 ? (
                  <Text style={styles.traces}>May contain traces of: {product.traces.join(', ')}</Text>
                ) : null}
                {missingFields.length > 0 ? (
                  <View style={styles.missingBox}>
                    <MaterialIcons name="info" size={18} color={COLORS.soft} />
                    <Text style={styles.missingText}>
                      Notes for missing data: {missingFields.join(', ')}{' '}
                      {missingFields.length > 1 ? 'were' : 'was'} not reported for this product.
                    </Text>
                  </View>
                ) : null}
              </Card>

              <View style={styles.actions}>
                <PrimaryButton
                  label="Scan Another Item"
                  icon="qr-code-scanner"
                  onPress={() => router.push('/scan')}
                />
                <SoftButton label="Share Score" icon="ios-share" onPress={onShare} />
              </View>
              <Text style={styles.disclaimer}>
                Guidance score from label data (Open Food Facts). Not medical advice.
              </Text>
            </>
          ) : null}
        </ScrollView>
      </SafeAreaView>

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
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  backButton: { padding: 8 },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.ink,
    fontFamily: FONTS.headline,
    marginLeft: 2,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: COLORS.maroon,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  avatarText: { color: '#fff', fontSize: 15, fontWeight: '800', fontFamily: FONTS.headline },
  savedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.green,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
  },
  savedBannerText: { flex: 1, color: '#fff', fontSize: 14, fontWeight: '700', fontFamily: FONTS.bodySemi },
  centerText: { marginTop: 80, textAlign: 'center', color: COLORS.soft, fontSize: 15, fontFamily: FONTS.body },
  centerWrap: { marginTop: 80, alignItems: 'center', paddingHorizontal: 16 },
  centerTitle: { fontSize: 20, fontWeight: '700', color: COLORS.ink, fontFamily: FONTS.headline, textAlign: 'center' },
  centerBody: { color: COLORS.soft, fontSize: 15, lineHeight: 22, marginTop: 10, textAlign: 'center', fontFamily: FONTS.body },
  buttonWrap: { marginTop: 24, width: '100%' },
  productRow: { flexDirection: 'row', gap: 14, marginTop: 12 },
  thumbWrap: { position: 'relative', width: 88, height: 88 },
  productImage: { width: 88, height: 88, borderRadius: 14, backgroundColor: COLORS.card },
  productImagePlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 14,
    backgroundColor: COLORS.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: 'rgba(23,19,33,0.85)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  qtyBadgeText: { color: '#fff', fontSize: 11, fontWeight: '800', fontFamily: FONTS.bodyBold },
  productText: { flex: 1 },
  eyebrow: { fontSize: 12, fontWeight: '700', color: COLORS.soft, letterSpacing: 0.5, fontFamily: FONTS.bodySemi },
  productName: { fontSize: 20, fontWeight: '700', color: COLORS.ink, fontFamily: FONTS.headline, marginTop: 4, lineHeight: 25 },
  eanRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  novaChip: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  novaChipText: { color: '#fff', fontSize: 12, fontWeight: '800', fontFamily: FONTS.bodyBold },
  ean: { color: COLORS.soft, fontSize: 12, fontWeight: '600', fontFamily: FONTS.bodySemi },
  gaugeCard: { marginTop: 16, paddingBottom: 20 },
  gaugeHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  gaugeTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  gaugeTitle: { fontSize: 17, fontWeight: '700', color: COLORS.ink, fontFamily: FONTS.headline },
  riskPill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  riskDot: { width: 8, height: 8, borderRadius: 4 },
  riskPillText: { fontSize: 11, fontWeight: '800', fontFamily: FONTS.bodyBold, letterSpacing: 0.5 },
  statRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  statTile: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderColor: COLORS.line,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    gap: 4,
  },
  statLabel: { fontSize: 11, color: COLORS.soft, textAlign: 'center', fontFamily: FONTS.bodySemi },
  statValue: { fontSize: 17, fontWeight: '800', fontFamily: FONTS.bodyBold, textAlign: 'center' },
  sectionIntro: { color: COLORS.inkSoft, fontSize: 13.5, lineHeight: 20, marginBottom: 12, fontFamily: FONTS.body },
  factorCard: { marginBottom: 10, padding: 14 },
  factorRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  factorIconTile: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.maroonSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  factorText: { flex: 1 },
  factorLabel: { fontSize: 15, fontWeight: '700', color: COLORS.ink, fontFamily: FONTS.bodySemi },
  factorDetail: { fontSize: 13.5, color: COLORS.inkSoft, lineHeight: 19, marginTop: 3, fontFamily: FONTS.body },
  factorRight: { alignItems: 'flex-end', gap: 4 },
  factorPtsText: { color: COLORS.maroon, fontSize: 14, fontWeight: '800', fontFamily: FONTS.bodyBold },
  factorTag: { fontSize: 11, color: COLORS.soft, fontFamily: FONTS.bodySemi },
  zeroText: { color: COLORS.inkSoft, fontSize: 14, lineHeight: 20, fontFamily: FONTS.body },
  extraNote: { color: COLORS.soft, fontSize: 13, lineHeight: 19, marginTop: 2, fontFamily: FONTS.body },
  swapCard: { marginTop: 4 },
  swapRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  swapText: { flex: 1 },
  swapLabel: { fontSize: 11, fontWeight: '800', color: COLORS.amberDeep, letterSpacing: 0.8, fontFamily: FONTS.bodyBold },
  swapName: { fontSize: 17, fontWeight: '700', color: COLORS.ink, fontFamily: FONTS.headline, marginTop: 6 },
  swapMeta: { fontSize: 13.5, color: COLORS.inkSoft, marginTop: 3, fontFamily: FONTS.bodySemi },
  swapBoost: { backgroundColor: COLORS.green, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  swapBoostText: { color: '#fff', fontSize: 12, fontWeight: '800', fontFamily: FONTS.bodyBold },
  nutriHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 26, marginBottom: 12 },
  nutriTitle: { fontSize: 20, fontWeight: '700', color: COLORS.ink, fontFamily: FONTS.headline },
  nutriSub: { fontSize: 13, color: COLORS.soft, marginTop: 4, fontFamily: FONTS.body },
  kcalPill: { backgroundColor: COLORS.line, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  kcalText: { color: COLORS.ink, fontSize: 13, fontWeight: '800', fontFamily: FONTS.bodyBold },
  nutriGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 },
  nutriTile: {
    width: '48%',
    backgroundColor: COLORS.card,
    borderColor: COLORS.line,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 4,
  },
  nutriTileTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  nutriTileLabel: { fontSize: 13, fontWeight: '600', color: COLORS.ink, fontFamily: FONTS.bodySemi },
  nutriDot: { width: 8, height: 8, borderRadius: 4 },
  nutriTileValue: { fontSize: 20, fontWeight: '800', color: COLORS.ink, fontFamily: FONTS.headline, marginTop: 6 },
  nutriTileSub: { fontSize: 12, color: COLORS.soft, fontFamily: FONTS.bodySemi },
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
  ingredientsBold: { fontWeight: '700', color: COLORS.ink, fontFamily: FONTS.bodyBold },
  traces: { fontSize: 13, color: COLORS.soft, marginTop: 10, lineHeight: 18, fontFamily: FONTS.body },
  missingBox: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: COLORS.bg,
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
  },
  missingText: { flex: 1, fontSize: 13, color: COLORS.inkSoft, lineHeight: 19, fontFamily: FONTS.body },
  actions: { marginTop: 24, gap: 12 },
  disclaimer: { color: COLORS.soft, fontSize: 12, marginTop: 20, textAlign: 'center', fontFamily: FONTS.body },
});
