import { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import AdBanner from '../src/components/AdBanner';
import BottomTabs from '../src/components/BottomTabs';
import NativeAdCard from '../src/components/NativeAdCard';
import { PrimaryButton, Toast } from '../src/components/ui';
import { clearHistory, getHistory, removeRecord, type ScanRecord } from '../src/lib/history';
import { getCachedProduct, type OffProduct } from '../src/lib/openfoodfacts';
import { scoreProduct, type RiskFactor } from '../src/lib/risk';
import { BANDS, COLORS, FONTS } from '../src/lib/theme';
import { getSession } from '../src/lib/supabase';
import { isGuest } from '../src/lib/session';

type Filter = 'all' | 'low' | 'moderate' | 'high';

const FILTERS: { id: Filter; label: string; dot: string | null }[] = [
  { id: 'all', label: 'All', dot: null },
  { id: 'low', label: 'Low Risk', dot: BANDS.low.color },
  { id: 'moderate', label: 'Moderate', dot: BANDS.moderate.color },
  { id: 'high', label: 'High Risk', dot: BANDS.high.color },
];

/** Score pill per band: dot + "42 HIGH" — abbreviated label, white on dark. */
const HISTORY_PILL: Record<string, { label: string; color: string }> = {
  low: { label: 'LOW', color: BANDS.low.color },
  moderate: { label: 'MOD', color: BANDS.moderate.color },
  high: { label: 'HIGH', color: BANDS.high.color },
  'very-high': { label: 'V. HIGH', color: BANDS['very-high'].color },
};

const fmt = (v: number): string => (Number.isInteger(v) ? String(v) : v.toFixed(1));

/** "Today 14:22" / "Yesterday" / "2 days ago" — the History date line. */
function relativeHistoryDate(scannedAt: number): string {
  const d = new Date(scannedAt);
  const now = new Date();
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const dayDiff = Math.round((startOf(now) - startOf(d)) / 86400000);
  if (dayDiff <= 0) {
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `Today ${hh}:${mm}`;
  }
  if (dayDiff === 1) return 'Yesterday';
  return `${dayDiff} days ago`;
}

/** "sugar, palm oil (13%)" -> ["Sugar", "Palm Oil"] — title-cased, percentages stripped. */
function firstIngredients(ingredientsText?: string): string[] {
  if (!ingredientsText) return [];
  return ingredientsText
    .split(',')
    .map((s) => s.replace(/\([^)]*\)/g, '').replace(/_/g, '').trim())
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()));
}

/** Most notable nutrient, as a short note: "56g Added Sugar" / "16g Protein". */
function topNutrientNote(p: OffProduct): string | undefined {
  const n = p.nutriments;
  if (n.sugars100 != null && n.sugars100 > 12.5) return `${fmt(n.sugars100)}g Added Sugar`;
  if (n.proteins100 != null && n.proteins100 >= 10) return `${fmt(n.proteins100)}g Protein`;
  if (n.saturatedFat100 != null && n.saturatedFat100 > 5)
    return `${fmt(n.saturatedFat100)}g Sat. Fat`;
  if (n.salt100 != null && n.salt100 > 1.5) return `${fmt(n.salt100)}g Salt`;
  if (n.sugars100 != null) return `${fmt(n.sugars100)}g Sugar`;
  return undefined;
}

/** Note line: first ingredients, filled with the top nutrient when needed. */
function rowNote(p: OffProduct | null, bandLabel: string): string {
  if (!p) return bandLabel;
  const ings = firstIngredients(p.ingredientsText);
  const nutrient = topNutrientNote(p);
  const parts = [...ings];
  if (parts.length < 2 && nutrient) parts.push(nutrient);
  return parts.length > 0 ? parts.join(' • ') : bandLabel;
}

const WARNING_TAGS: { match: (f: RiskFactor) => boolean; tag: string }[] = [
  { match: (f) => f.id === 'sugar', tag: 'HIGH SUGAR' },
  { match: (f) => f.id === 'satfat', tag: 'SATURATED FAT' },
  { match: (f) => f.id === 'transfat', tag: 'TRANS FAT' },
  { match: (f) => f.id === 'salt', tag: 'HIGH SALT' },
  { match: (f) => f.id === 'nova' && f.points >= 10, tag: 'ULTRA-PROCESSED' },
  { match: (f) => f.id === 'nova' && f.points >= 5, tag: 'PROCESSED FOOD' },
  { match: (f) => f.id.startsWith('additive-'), tag: 'ADDITIVE OF CONCERN' },
];

/**
 * Coloured warning line from the product's real top factors:
 * "HIGH SUGAR & SATURATED FAT WARNING" (red), "CLEAN INGREDIENTS" (green
 * when no concern factors at all). Nothing is invented — the tags come
 * straight from the same factors the score is built from.
 */
function warningFor(
  p: OffProduct | null,
  band: string,
): { text: string; color: string } | null {
  if (!p) return null;
  const factors = scoreProduct(p).factors;
  const tags: string[] = [];
  for (const w of WARNING_TAGS) {
    if (tags.length >= 2) break;
    if (factors.some(w.match)) tags.push(w.tag);
  }
  if (tags.length === 0) return { text: 'CLEAN INGREDIENTS', color: COLORS.green };
  const suffix = band === 'low' ? '' : ' WARNING';
  const color =
    band === 'low' ? COLORS.green : band === 'moderate' ? COLORS.amberMid : COLORS.danger;
  return { text: `${tags.join(' & ')}${suffix}`, color };
}

function HistoryRow({
  record,
  onExport,
  onDelete,
}: {
  record: ScanRecord;
  onExport: () => void;
  onDelete: () => void;
}) {
  const [product, setProduct] = useState<OffProduct | null>(null);

  useEffect(() => {
    let alive = true;
    getCachedProduct(record.barcode).then((p) => {
      if (alive) setProduct(p);
    });
    return () => {
      alive = false;
    };
  }, [record.barcode]);

  const pill = HISTORY_PILL[record.band];
  const warning = warningFor(product, record.band);

  return (
    <View style={styles.row}>
      <Pressable
        style={styles.rowMain}
        onPress={() => router.push({ pathname: '/result', params: { barcode: record.barcode } })}
      >
        <View style={styles.rowTop}>
          {product?.imageUrl ? (
            <Image source={{ uri: product.imageUrl }} style={styles.thumb} />
          ) : (
            <View style={[styles.thumb, styles.thumbPlaceholder]}>
              <MaterialIcons name="image" size={22} color={COLORS.soft} />
            </View>
          )}
          <View style={styles.rowText}>
            <Text style={styles.rowBrand} numberOfLines={1}>
              {(record.brand ?? 'Unknown brand').toUpperCase()} •{' '}
              {relativeHistoryDate(record.scannedAt)}
            </Text>
            <Text style={styles.rowName} numberOfLines={1}>
              {record.name}
            </Text>
            <Text style={styles.rowNote} numberOfLines={1}>
              {rowNote(product, BANDS[record.band].label)}
            </Text>
          </View>
          <View style={styles.rowSide}>
            <View style={styles.scorePill}>
              <View style={[styles.scoreDot, { backgroundColor: pill.color }]} />
              <Text style={styles.scorePillText}>
                {record.score} {pill.label}
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={22} color={COLORS.soft} />
          </View>
        </View>
      </Pressable>
      <View style={styles.rowBottom}>
        {warning ? (
          <Text style={[styles.warning, { color: warning.color }]} numberOfLines={1}>
            {warning.text}
          </Text>
        ) : (
          <View style={styles.warningSpacer} />
        )}
        <View style={styles.rowActions}>
          <Pressable onPress={onExport} accessibilityLabel="Export scan as CSV">
            <MaterialIcons name="ios-share" size={20} color={COLORS.soft} />
          </Pressable>
          <Pressable onPress={onDelete} accessibilityLabel="Delete scan">
            <MaterialIcons name="delete" size={20} color={COLORS.soft} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export default function History() {
  const [records, setRecords] = useState<ScanRecord[]>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [confirmClear, setConfirmClear] = useState(false);
  const [toast, setToast] = useState('');
  const [displayName, setDisplayName] = useState('Guest');

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      getHistory().then((r) => {
        if (alive) setRecords(r);
      });
      Promise.all([getSession(), isGuest()]).then(([s, guest]) => {
        if (!alive) return;
        const meta = (s?.user?.user_metadata ?? {}) as { full_name?: string };
        setDisplayName(guest ? 'Guest' : meta.full_name || s?.user?.email?.split('@')[0] || 'Guest');
      });
      return () => {
        alive = false;
      };
    }, []),
  );

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const counts: Record<Filter, number> = {
    all: records.length,
    low: records.filter((r) => r.band === 'low').length,
    moderate: records.filter((r) => r.band === 'moderate').length,
    high: records.filter((r) => r.band === 'high' || r.band === 'very-high').length,
  };

  const visible = records.filter((r) => {
    if (filter === 'low' && r.band !== 'low') return false;
    if (filter === 'moderate' && r.band !== 'moderate') return false;
    if (filter === 'high' && r.band !== 'high' && r.band !== 'very-high') return false;
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      return r.name.toLowerCase().includes(q) || (r.brand ?? '').toLowerCase().includes(q);
    }
    return true;
  });

  const exportRecord = async (r: ScanRecord) => {
    try {
      const csv =
        'barcode,name,brand,score,band,scanned_at\n' +
        [
          r.barcode,
          csvCell(r.name),
          csvCell(r.brand ?? ''),
          String(r.score),
          r.band,
          new Date(r.scannedAt).toISOString(),
        ].join(',') +
        '\n';
      const file = new File(Paths.cache, `scanrisk-${r.barcode}.csv`);
      await file.write(csv);
      if (!(await Sharing.isAvailableAsync())) {
        showToast('Sharing is not available on this device');
        return;
      }
      await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', dialogTitle: 'Export scan' });
      showToast('Nutritional log exported to CSV');
    } catch {
      showToast('Export failed');
    }
  };

  const deleteRecord = async (r: ScanRecord) => {
    await removeRecord(r.barcode);
    setRecords((prev) => prev.filter((x) => x.barcode !== r.barcode));
  };

  const onClear = async () => {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    setConfirmClear(false);
    await clearHistory();
    setRecords([]);
  };

  if (records.length === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.title}>No scans yet</Text>
          <Text style={styles.body}>Products you scan will show up here with their risk score.</Text>
          <View style={styles.buttonWrap}>
            <PrimaryButton label="Scan a product" onPress={() => router.push('/scan')} />
          </View>
        </View>
        <BottomTabs active="history" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <Image source={require('../assets/icon.png')} style={styles.logo} />
          <View>
            <Text style={styles.topBarTitle}>ScanRisk</Text>
            <Text style={styles.topBarSub}>HISTORY LOG</Text>
          </View>
        </View>
        <View style={styles.topBarRight}>
          <Pressable
            style={styles.iconButton}
            onPress={() => showToast('No notifications yet')}
            accessibilityLabel="Notifications"
          >
            <MaterialIcons name="notifications" size={24} color={COLORS.ink} />
          </Pressable>
          <Pressable
            style={styles.avatar}
            onPress={() => router.push('/profile')}
            accessibilityLabel="Profile"
          >
            <Text style={styles.avatarText}>{displayName.charAt(0).toUpperCase()}</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.countRow}>
        <View style={styles.countLeft}>
          <View style={styles.greenDot} />
          <Text style={styles.countText}>{records.length} Scanned Items</Text>
        </View>
        <Pressable style={styles.clearPill} onPress={onClear}>
          <MaterialIcons
            name="delete-sweep"
            size={18}
            color={confirmClear ? COLORS.danger : COLORS.navy}
          />
          <Text style={[styles.clearPillText, confirmClear && { color: COLORS.danger }]}>
            {confirmClear ? 'TAP TO CONFIRM' : 'CLEAR HISTORY'}
          </Text>
        </Pressable>
      </View>

      <View style={styles.searchBox}>
        <MaterialIcons name="search" size={20} color={COLORS.soft} />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder={`Search ${records.length} scanned items…`}
          placeholderTextColor={COLORS.placeholder}
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.pillsScroll}
        contentContainerStyle={styles.pills}
      >
        {FILTERS.map((f) => {
          const active = filter === f.id;
          return (
            <Pressable
              key={f.id}
              style={[styles.pill, active && styles.pillActive]}
              onPress={() => setFilter(f.id)}
            >
              {f.dot && !active ? (
                <View style={[styles.pillDot, { backgroundColor: f.dot }]} />
              ) : null}
              <Text style={[styles.pillText, active && styles.pillTextActive]}>{f.label}</Text>
              <View style={[styles.pillCount, active && styles.pillCountActive]}>
                <Text style={[styles.pillCountText, active && styles.pillCountTextActive]}>
                  {counts[f.id]}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.hintRow}>
        <View style={styles.hintLeft}>
          <MaterialIcons name="touch-app" size={16} color={COLORS.soft} />
          <Text style={styles.hint}>TAP ROW TO VIEW FULL ANALYSIS</Text>
        </View>
        <View style={styles.hintRight}>
          <MaterialIcons name="swap-horiz" size={16} color={COLORS.soft} />
          <Text style={styles.hint}>Export · Delete</Text>
        </View>
      </View>

      <FlatList
        data={visible}
        keyExtractor={(r) => `${r.barcode}-${r.scannedAt}`}
        contentContainerStyle={styles.list}
        renderItem={({ item, index }) => (
          <View>
            <HistoryRow
              record={item}
              onExport={() => exportRecord(item)}
              onDelete={() => deleteRecord(item)}
            />
            {/* Native ad in the feed, after every 5th row. Renders nothing
                in Expo Go or when no ad fills — the feed is untouched. */}
            {index % 5 === 4 ? <NativeAdCard /> : null}
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Nothing matches — try a different search or filter.</Text>
        }
      />

      <AdBanner />
      <BottomTabs active="history" />
      {toast ? <Toast message={toast} /> : null}
    </SafeAreaView>
  );
}

const csvCell = (s: string) => `"${s.replace(/"/g, '""')}"`;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  topBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: { width: 40, height: 40, borderRadius: 10 },
  topBarTitle: { fontSize: 20, fontWeight: '700', color: COLORS.ink, fontFamily: FONTS.headline },
  topBarSub: { fontSize: 10.5, fontWeight: '800', color: COLORS.soft, letterSpacing: 1.4, fontFamily: FONTS.bodyBold },
  topBarRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconButton: { padding: 6 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: COLORS.maroon,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 17, fontWeight: '800', fontFamily: FONTS.headline },
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginTop: 14,
  },
  countLeft: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  greenDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.green },
  countText: { fontSize: 13, fontWeight: '700', color: COLORS.ink, fontFamily: FONTS.bodySemi },
  clearPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.softBlue,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  clearPillText: { fontSize: 11.5, fontWeight: '800', letterSpacing: 0.8, color: COLORS.navy, fontFamily: FONTS.bodyBold },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.card,
    borderColor: COLORS.line,
    borderRadius: 999,
    borderWidth: 1,
    marginHorizontal: 20,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 15, fontFamily: FONTS.body, color: COLORS.ink },
  pillsScroll: { flexGrow: 0, flexShrink: 0 },
  pills: { gap: 8, paddingHorizontal: 20, paddingVertical: 12 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.line,
    backgroundColor: COLORS.card,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  pillActive: { backgroundColor: COLORS.maroon, borderColor: COLORS.maroon },
  pillDot: { width: 8, height: 8, borderRadius: 4 },
  pillText: { fontSize: 13, fontWeight: '700', color: COLORS.ink, fontFamily: FONTS.bodySemi },
  pillTextActive: { color: '#fff' },
  pillCount: {
    backgroundColor: COLORS.softBlue,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  pillCountActive: { backgroundColor: 'rgba(255,255,255,0.22)' },
  pillCountText: { fontSize: 11.5, fontWeight: '800', color: COLORS.ink, fontFamily: FONTS.bodyBold },
  pillCountTextActive: { color: '#fff' },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginBottom: 8,
  },
  hintLeft: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  hintRight: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  hint: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.soft,
    letterSpacing: 1,
    fontFamily: FONTS.bodyBold,
  },
  list: { paddingHorizontal: 20, paddingBottom: 12 },
  row: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.line,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
    padding: 12,
  },
  rowMain: { flex: 1 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  thumb: { width: 56, height: 56, borderRadius: 12, backgroundColor: COLORS.softBlue },
  thumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1 },
  rowBrand: { fontSize: 11, fontWeight: '800', color: COLORS.soft, letterSpacing: 0.6, fontFamily: FONTS.bodyBold },
  rowName: { fontSize: 16, fontWeight: '700', color: COLORS.ink, fontFamily: FONTS.bodySemi, marginTop: 3 },
  rowNote: { color: COLORS.soft, fontSize: 13, marginTop: 3, fontFamily: FONTS.body },
  rowSide: { alignItems: 'center', gap: 8 },
  scorePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.maroonDeep,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  scoreDot: { width: 7, height: 7, borderRadius: 4 },
  scorePillText: { color: '#fff', fontSize: 11.5, fontWeight: '800', fontFamily: FONTS.bodyBold },
  rowBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 10,
  },
  warning: { flex: 1, fontSize: 11, fontWeight: '800', letterSpacing: 0.6, fontFamily: FONTS.bodyBold },
  warningSpacer: { flex: 1 },
  rowActions: { flexDirection: 'row', gap: 14 },
  emptyText: { color: COLORS.soft, fontSize: 14, textAlign: 'center', marginTop: 32, fontFamily: FONTS.body },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 20, fontWeight: '700', color: COLORS.ink, fontFamily: FONTS.headline, textAlign: 'center' },
  body: { color: COLORS.soft, fontSize: 15, lineHeight: 21, marginTop: 8, textAlign: 'center', fontFamily: FONTS.body },
  buttonWrap: { marginTop: 20, width: '100%' },
});
