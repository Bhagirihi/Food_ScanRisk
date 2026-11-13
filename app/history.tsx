import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { clearHistory, getHistory } from '../src/lib/history';
import type { ScanRecord } from '../src/lib/history';
import { BANDS } from '../src/lib/risk';
import { COLORS, SERIF } from '../src/lib/theme';
import { PrimaryButton } from '../src/components/ui';

export default function History() {
  const [records, setRecords] = useState<ScanRecord[]>([]);
  const [confirmClear, setConfirmClear] = useState(false);

  const load = useCallback(() => {
    getHistory().then(setRecords);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onClear = async () => {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    await clearHistory();
    setRecords([]);
    setConfirmClear(false);
  };

  if (records.length === 0) {
    return (
      <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.center}>
        <Text style={styles.title}>No scans yet</Text>
        <Text style={styles.body}>Products you scan will show up here with their risk score.</Text>
        <View style={styles.buttonWrap}>
          <PrimaryButton label="Scan a product" onPress={() => router.push('/scan')} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.container}>
      <FlatList
        data={records}
        keyExtractor={(r) => `${r.barcode}-${r.scannedAt}`}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() => router.push({ pathname: '/result', params: { barcode: item.barcode } })}
          >
            <View style={styles.rowText}>
              <Text style={styles.rowName} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.rowMeta}>
                {item.brand ? `${item.brand} · ` : ''}
                {new Date(item.scannedAt).toLocaleString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
            <View style={[styles.chip, { backgroundColor: BANDS[item.band].color }]}>
              <Text style={styles.chipText}>{item.score}</Text>
            </View>
          </Pressable>
        )}
      />
      <Pressable style={styles.clearButton} onPress={onClear}>
        <Text style={styles.clearButtonText}>
          {confirmClear ? 'Tap again to confirm clear' : 'Clear history'}
        </Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: 16 },
  center: { alignItems: 'center', flex: 1, justifyContent: 'center', padding: 24 },
  title: { fontSize: 20, fontWeight: '700', fontFamily: SERIF, textAlign: 'center' },
  body: { color: COLORS.soft, fontSize: 15, lineHeight: 21, marginTop: 8, textAlign: 'center' },
  buttonWrap: { marginTop: 20, width: '100%' },
  row: {
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderColor: COLORS.line,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 10,
    padding: 14,
  },
  rowText: { flex: 1, marginRight: 12 },
  rowName: { fontSize: 16, fontWeight: '700' },
  rowMeta: { color: COLORS.soft, fontSize: 13, marginTop: 3 },
  chip: {
    alignItems: 'center',
    borderRadius: 999,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  chipText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  clearButton: { alignItems: 'center', padding: 16 },
  clearButtonText: { color: COLORS.danger, fontSize: 15, fontWeight: '700' },
});
