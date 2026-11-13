import { useCallback, useEffect, useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import BottomTabs from '../src/components/BottomTabs';
import { PrimaryButton, Toast } from '../src/components/ui';
import { clearHistory, getHistory, removeRecord, type ScanRecord } from '../src/lib/history';
import { getCachedProduct } from '../src/lib/openfoodfacts';
import { scoreProduct } from '../src/lib/risk';
import { BANDS, COLORS, FONTS } from '../src/lib/theme';

type Filter = 'all' | 'low' | 'moderate' | 'high';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'low', label: 'Low Risk' },
  { id: 'moderate', label: 'Moderate' },
  { id: 'high', label: 'High Risk' },
];

const csvCell = (s: string) => `"${s.replace(/"/g, '""')}"`;

function HistoryRow({
  record,
  onExport,
  onDelete,
}: {
  record: ScanRecord;
  onExport: () => void;
  onDelete: () => void;
}) {
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    getCachedProduct(record.barcode).then((p) => {
      if (!alive || !p) return;
      const res = scoreProduct(p);
      const top = res.factors.slice().sort((a, b) => b.points - a.points)[0];
      if (top) setNote(top.label);
    });
    return () => {
      alive = false;
    };
  }, [record.barcode]);

  return (
    <View style={styles.row}>
      <Pressable
        style={styles.rowMain}
        onPress={() => router.push({ pathname: '/result', params: { barcode: record.barcode } })}
      >
        <Text style={styles.rowBrand}>
          {(record.brand ?? 'Unknown brand').toUpperCase()} ·{' '}
          {new Date(record.scannedAt).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
          })}
        </Text>
        <Text style={styles.rowName} numberOfLines={1}>
          {record.name}
        </Text>
        <Text style={styles.rowNote} numberOfLines={1}>
          {note ?? BANDS[record.band].label}
        </Text>
      </Pressable>
      <View style={styles.rowSide}>
        <View style={[styles.chip, { backgroundColor: BANDS[record.band].color }]}>
          <Text style={styles.chipText}>{record.score}</Text>
        </View>
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

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      getHistory().then((r) => {
        if (alive) setRecords(r);
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
    if ((filter === 'high' && r.band !== 'high' && r.band !== 'very-high')) return false;
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
        <Image source={require('../assets/icon.png')} style={styles.logo} />
        <View>
          <Text style={styles.topBarTitle}>ScanRisk</Text>
          <Text style={styles.topBarSub}>HISTORY LOG</Text>
        </View>
        <Text style={styles.countText}>{records.length} items</Text>
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

      <View style={styles.pills}>
        {FILTERS.map((f) => (
          <Pressable
            key={f.id}
            style={[styles.pill, filter === f.id && styles.pillActive]}
            onPress={() => setFilter(f.id)}
          >
            <Text style={[styles.pillText, filter === f.id && styles.pillTextActive]}>
              {f.label} {counts[f.id]}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.hint}>TAP A ROW TO VIEW THE FULL ANALYSIS</Text>

      <FlatList
        data={visible}
        keyExtractor={(r) => `${r.barcode}-${r.scannedAt}`}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <HistoryRow
            record={item}
            onExport={() => exportRecord(item)}
            onDelete={() => deleteRecord(item)}
          />
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Nothing matches — try a different search or filter.</Text>
        }
      />

      <Pressable style={styles.clearButton} onPress={onClear}>
        <MaterialIcons name="delete-sweep" size={20} color={COLORS.danger} />
        <Text style={styles.clearButtonText}>
          {confirmClear ? 'Tap again to confirm clear' : 'Clear history'}
        </Text>
      </Pressable>

      <BottomTabs active="history" />
      {toast ? <Toast message={toast} /> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingTop: 8 },
  logo: { width: 40, height: 40, borderRadius: 10 },
  topBarTitle: { fontSize: 20, fontWeight: '700', color: COLORS.ink, fontFamily: FONTS.headline },
  topBarSub: { fontSize: 10.5, fontWeight: '800', color: COLORS.soft, letterSpacing: 1.4, fontFamily: FONTS.bodyBold },
  countText: { marginLeft: 'auto', fontSize: 13, fontWeight: '700', color: COLORS.soft, fontFamily: FONTS.bodySemi },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.card,
    borderColor: COLORS.line,
    borderRadius: 999,
    borderWidth: 1,
    marginHorizontal: 20,
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 15, fontFamily: FONTS.body, color: COLORS.ink },
  pills: { flexDirection: 'row', gap: 8, marginHorizontal: 20, marginTop: 12, flexWrap: 'wrap' },
  pill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.line,
    backgroundColor: COLORS.card,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  pillActive: { backgroundColor: COLORS.maroon, borderColor: COLORS.maroon },
  pillText: { fontSize: 13, fontWeight: '700', color: COLORS.ink, fontFamily: FONTS.bodySemi },
  pillTextActive: { color: '#fff' },
  hint: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.soft,
    letterSpacing: 1.2,
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
    fontFamily: FONTS.bodyBold,
  },
  list: { paddingHorizontal: 20, paddingBottom: 12 },
  row: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderColor: COLORS.line,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
    padding: 14,
    gap: 10,
  },
  rowMain: { flex: 1 },
  rowBrand: { fontSize: 11, fontWeight: '800', color: COLORS.soft, letterSpacing: 0.8, fontFamily: FONTS.bodyBold },
  rowName: { fontSize: 16, fontWeight: '700', color: COLORS.ink, fontFamily: FONTS.bodySemi, marginTop: 3 },
  rowNote: { color: COLORS.soft, fontSize: 13, marginTop: 3, fontFamily: FONTS.body },
  rowSide: { alignItems: 'center', gap: 10 },
  chip: { alignItems: 'center', borderRadius: 999, height: 40, justifyContent: 'center', width: 40 },
  chipText: { color: '#fff', fontSize: 15, fontWeight: '800', fontFamily: FONTS.bodyBold },
  rowActions: { flexDirection: 'row', gap: 14 },
  emptyText: { color: COLORS.soft, fontSize: 14, textAlign: 'center', marginTop: 32, fontFamily: FONTS.body },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    marginHorizontal: 20,
  },
  clearButtonText: { color: COLORS.danger, fontSize: 15, fontWeight: '700', fontFamily: FONTS.bodySemi },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 20, fontWeight: '700', color: COLORS.ink, fontFamily: FONTS.headline, textAlign: 'center' },
  body: { color: COLORS.soft, fontSize: 15, lineHeight: 21, marginTop: 8, textAlign: 'center', fontFamily: FONTS.body },
  buttonWrap: { marginTop: 20, width: '100%' },
});
