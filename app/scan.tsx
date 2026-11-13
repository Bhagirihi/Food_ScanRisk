import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { MaterialIcons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import Tour, { type Measurable } from '../src/components/Tour';
import { hasSeenTip, markTipSeen } from '../src/lib/tips';
import { getTipsEnabled, getTorchDefault } from '../src/lib/settings';
import { getHistory, type ScanRecord } from '../src/lib/history';
import { getCachedProduct } from '../src/lib/openfoodfacts';
import { BANDS, scoreProduct } from '../src/lib/risk';
import { COLORS, FONTS } from '../src/lib/theme';
import { PrimaryButton, TextButton } from '../src/components/ui';

const BARCODE_TYPES = ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128'] as const;

interface TodayItem {
  record: ScanRecord;
  topFactor?: string;
}

export default function Scan() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [torch, setTorch] = useState(false);
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [hint, setHint] = useState('Align barcode inside frame');
  const [showTour, setShowTour] = useState(false);
  const [sheet, setSheet] = useState<'none' | 'manual'>('none');
  const [manualCode, setManualCode] = useState('');
  const [manualError, setManualError] = useState('');
  const [today, setToday] = useState<TodayItem[]>([]);
  const containerRef = useRef<Measurable | null>(null);
  const frameRef = useRef<Measurable | null>(null);
  const manualOpened = useRef(false);
  const params = useLocalSearchParams<{ manual?: string }>();

  // Open the manual-entry sheet when arriving from Home's Manual button.
  useEffect(() => {
    if (params.manual === '1' && !manualOpened.current) {
      manualOpened.current = true;
      setSheet('manual');
    }
  }, [params.manual]);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      let timer: ReturnType<typeof setTimeout> | undefined;
      getTorchDefault().then((d) => {
        if (alive) setTorch(d);
      });
      Promise.all([hasSeenTip('scan'), getTipsEnabled()]).then(([seen, enabled]) => {
        if (alive && !seen && enabled) timer = setTimeout(() => setShowTour(true), 700);
      });
      (async () => {
        const all = await getHistory();
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const todays = all.filter((r) => r.scannedAt >= start.getTime()).slice(0, 3);
        const withFlags = await Promise.all(
          todays.map(async (r) => {
            const p = await getCachedProduct(r.barcode);
            let topFactor: string | undefined;
            if (p) {
              const res = scoreProduct(p);
              topFactor = res.factors.slice().sort((a, b) => b.points - a.points)[0]?.label;
            }
            return { record: r, topFactor };
          }),
        );
        if (alive) setToday(withFlags);
      })();
      return () => {
        alive = false;
        if (timer) clearTimeout(timer);
      };
    }, []),
  );

  const closeTour = () => {
    setShowTour(false);
    void markTipSeen('scan');
  };

  const verifyManual = () => {
    const trimmed = manualCode.trim();
    if (!/^\d{8,14}$/.test(trimmed)) {
      setManualError('Enter a barcode with 8 to 14 digits.');
      return;
    }
    setManualError('');
    setSheet('none');
    router.replace({ pathname: '/result', params: { barcode: trimmed } });
  };

  const manualSheet = (
    <View style={styles.sheet}>
      <View style={styles.sheetHeader}>
        <Text style={styles.sheetTitle}>Enter Barcode</Text>
        <Pressable onPress={() => setSheet('none')} accessibilityLabel="Close">
          <MaterialIcons name="close" size={22} color={COLORS.soft} />
        </Pressable>
      </View>
      <Text style={styles.sheetBody}>
        Type the 8, 12, or 13-digit EAN/UPC code located beneath the product barcode stripes.
      </Text>
      <TextInput
        style={styles.sheetInput}
        value={manualCode}
        onChangeText={setManualCode}
        placeholder="e.g. 737628064502"
        keyboardType="number-pad"
        maxLength={14}
        placeholderTextColor={COLORS.placeholder}
        onSubmitEditing={verifyManual}
      />
      {manualError ? <Text style={styles.sheetError}>{manualError}</Text> : null}
      <PrimaryButton label="Verify Product" onPress={verifyManual} />
    </View>
  );

  if (!permission) {
    return (
      <View style={styles.centerDark}>
        <Text style={styles.centerDarkText}>Loading camera…</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.permissionRoot}>
        <View style={styles.permissionSheet}>
          <MaterialIcons name="photo-camera" size={36} color={COLORS.maroon} />
          <Text style={styles.permissionTitle}>Camera Access Needed</Text>
          <Text style={styles.permissionBody}>
            To instantly analyze barcodes, detect additives, and audit nutrition values, ScanRisk
            needs the camera. Images are processed on-device in real time — no video or product
            photos are stored anywhere.
          </Text>
          <View style={styles.permissionButtons}>
            {permission.canAskAgain ? (
              <PrimaryButton label="Allow Camera" onPress={requestPermission} />
            ) : (
              <PrimaryButton label="Open Settings" onPress={() => Linking.openSettings()} />
            )}
          </View>
          <TextButton label="Enter code manually instead" onPress={() => setSheet('manual')} />
          <TextButton label="Go back" onPress={() => router.back()} />
        </View>
        {sheet === 'manual' ? <View style={styles.sheetOverlay}>{manualSheet}</View> : null}
      </SafeAreaView>
    );
  }

  const handleScan = ({ data }: { data: string }) => {
    if (scanned) return;
    if (!/^\d{8,14}$/.test(data)) {
      setHint('That is not a product barcode — try a barcode made of numbers.');
      return;
    }
    setScanned(true);
    router.replace({ pathname: '/result', params: { barcode: data } });
  };

  return (
    <View ref={(node) => { containerRef.current = node; }} style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing={facing}
        enableTorch={torch}
        barcodeScannerSettings={{ barcodeTypes: [...BARCODE_TYPES] }}
        onBarcodeScanned={handleScan}
      />
      <SafeAreaView style={styles.overlay} pointerEvents="box-none">
        <View style={styles.topRow}>
          <View style={styles.livePill}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE FOCUS</Text>
          </View>
          <View style={styles.topButtons}>
            <Pressable
              style={styles.roundButton}
              onPress={() => setTorch((t) => !t)}
              accessibilityLabel={torch ? 'Turn torch off' : 'Turn torch on'}
            >
              <MaterialIcons name={torch ? 'flash-on' : 'flash-off'} size={22} color="#fff" />
            </Pressable>
            <Pressable
              style={styles.roundButton}
              onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))}
              accessibilityLabel="Flip camera"
            >
              <MaterialIcons name="flip-camera-ios" size={22} color="#fff" />
            </Pressable>
          </View>
        </View>

        <Text style={styles.hint}>{hint}</Text>

        <View ref={(node) => { frameRef.current = node; }} style={styles.frame}>
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />
        </View>

        <View style={styles.todayCard}>
          <Text style={styles.todayTitle}>Recent Ingredient Analyses — Today</Text>
          {today.length === 0 ? (
            <Text style={styles.todayEmpty}>No scans today yet.</Text>
          ) : (
            today.map((t) => (
              <View key={`${t.record.barcode}-${t.record.scannedAt}`} style={styles.todayRow}>
                <View
                  style={[styles.todayDot, { backgroundColor: BANDS[t.record.band].color }]}
                />
                <Text style={styles.todayName} numberOfLines={1}>
                  {t.record.name}
                </Text>
                <Text style={styles.todayFlag} numberOfLines={1}>
                  {t.topFactor ?? `${t.record.score}/50 ${BANDS[t.record.band].label}`}
                </Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.bottomRow}>
          <Pressable style={styles.overlayButton} onPress={() => setSheet('manual')}>
            <MaterialIcons name="keyboard" size={18} color="#fff" />
            <Text style={styles.overlayButtonText}>Enter barcode manually</Text>
          </Pressable>
          <Pressable style={styles.overlayButton} onPress={() => router.back()}>
            <Text style={styles.overlayButtonText}>Cancel</Text>
          </Pressable>
        </View>
      </SafeAreaView>

      {sheet === 'manual' ? <View style={styles.sheetOverlay}>{manualSheet}</View> : null}

      {showTour ? (
        <Tour
          steps={[
            {
              key: 'frame',
              title: 'Line it up',
              body: 'Fit the barcode inside the gold frame. It scans automatically — no button to press.',
            },
          ]}
          targets={{ frame: frameRef }}
          containerRef={containerRef}
          onDone={closeTour}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  centerDark: { flex: 1, backgroundColor: '#171321', alignItems: 'center', justifyContent: 'center' },
  centerDarkText: { color: '#fff', fontSize: 15 },
  permissionRoot: { flex: 1, backgroundColor: '#171321', justifyContent: 'flex-end' },
  permissionSheet: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.ink,
    fontFamily: FONTS.headline,
    marginTop: 12,
    textAlign: 'center',
  },
  permissionBody: {
    color: COLORS.inkSoft,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 10,
    textAlign: 'center',
    fontFamily: FONTS.body,
  },
  permissionButtons: { marginTop: 20, width: '100%' },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
    paddingBottom: 28,
    paddingTop: 12,
    paddingHorizontal: 20,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.amber },
  liveText: { color: '#fff', fontSize: 12, fontWeight: '800', letterSpacing: 1.2, fontFamily: FONTS.bodyBold },
  topButtons: { flexDirection: 'row', gap: 10 },
  roundButton: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 8,
    color: '#fff',
    fontSize: 15,
    overflow: 'hidden',
    paddingHorizontal: 14,
    paddingVertical: 10,
    textAlign: 'center',
    alignSelf: 'center',
    fontFamily: FONTS.body,
  },
  frame: { height: 180, width: 280, position: 'relative', alignSelf: 'center' },
  corner: { position: 'absolute', width: 30, height: 30, borderColor: '#E3C565' },
  cornerTL: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 14 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 14 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 14 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 14 },
  todayCard: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 16,
    padding: 14,
  },
  todayTitle: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.6,
    fontFamily: FONTS.bodyBold,
  },
  todayEmpty: { color: '#D8D3E0', fontSize: 13, marginTop: 6, fontFamily: FONTS.body },
  todayRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  todayDot: { width: 8, height: 8, borderRadius: 4 },
  todayName: { flex: 1, color: '#fff', fontSize: 13.5, fontWeight: '600', fontFamily: FONTS.bodySemi },
  todayFlag: { color: '#F5D98B', fontSize: 12, fontFamily: FONTS.body },
  bottomRow: { flexDirection: 'row', gap: 12, justifyContent: 'center' },
  overlayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  overlayButtonText: { color: '#fff', fontSize: 14, fontWeight: '700', fontFamily: FONTS.bodySemi },
  sheetOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 32,
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sheetTitle: { fontSize: 20, fontWeight: '700', color: COLORS.ink, fontFamily: FONTS.headline },
  sheetBody: { color: COLORS.inkSoft, fontSize: 14, lineHeight: 21, marginTop: 10, fontFamily: FONTS.body },
  sheetInput: {
    backgroundColor: COLORS.bg,
    borderColor: COLORS.line,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 17,
    marginTop: 14,
    marginBottom: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontFamily: FONTS.body,
  },
  sheetError: { color: COLORS.danger, fontSize: 13, marginTop: -6, marginBottom: 10 },
});
