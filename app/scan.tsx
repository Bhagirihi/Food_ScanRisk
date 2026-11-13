// Scanner — Stitch "Food Risk Scanner App" frame spec (13 Nov 2026).
// Camera card (top, ~470 tall, rounded bottom corners) holds the top bar,
// gold brackets + scanline, hint pill, permissions pill and the manual-entry
// card; the Recent section sits below on pale slate. No bottom buttons and
// no bottom nav on this screen — the X close button is the exit. The
// permission sheet and the manual-entry sheet are bottom sheets.

import { useCallback, useEffect, useRef, useState } from 'react';
import { Image, Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { MaterialIcons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import Tour, { type Measurable } from '../src/components/Tour';
import { hasSeenTip, markTipSeen } from '../src/lib/tips';
import { getLastManualBarcode, getTipsEnabled, getTorchDefault, setLastManualBarcode } from '../src/lib/settings';
import { getHistory, type ScanRecord } from '../src/lib/history';
import { getCachedProduct } from '../src/lib/openfoodfacts';
import { BANDS, scoreProduct } from '../src/lib/risk';
import { COLORS, FONTS } from '../src/lib/theme';

const BARCODE_TYPES = ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128'] as const;

/** Grey decorative barcode fragment for the manual-entry card. */
const FRAGMENT_BARS = [2, 1, 3, 2, 1, 4, 2, 1, 3, 1, 2];

interface TodayItem {
  record: ScanRecord;
  topFactor?: string;
  imageUrl?: string;
}

export default function Scan() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [torch, setTorch] = useState(false);
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [hint, setHint] = useState('Align barcode inside frame');
  const [showTour, setShowTour] = useState(false);
  const [sheet, setSheet] = useState<'none' | 'manual' | 'permission'>('none');
  const [manualCode, setManualCode] = useState('');
  const [manualError, setManualError] = useState('');
  const [today, setToday] = useState<TodayItem[]>([]);
  const [lastManual, setLastManual] = useState<string | null>(null);
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
      getLastManualBarcode().then((v) => {
        if (alive) setLastManual(v);
      });
      Promise.all([hasSeenTip('scan'), getTipsEnabled()]).then(([seen, enabled]) => {
        if (alive && !seen && enabled) timer = setTimeout(() => setShowTour(true), 700);
      });
      (async () => {
        const all = await getHistory();
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const todays = all.filter((r) => r.scannedAt >= start.getTime()).slice(0, 2);
        const withFlags = await Promise.all(
          todays.map(async (r) => {
            const p = await getCachedProduct(r.barcode);
            let topFactor: string | undefined;
            if (p) {
              const res = scoreProduct(p);
              topFactor = res.factors.slice().sort((a, b) => b.points - a.points)[0]?.label;
            }
            return { record: r, topFactor, imageUrl: p?.imageUrl };
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
    void setLastManualBarcode(trimmed);
    setLastManual(trimmed);
    router.replace({ pathname: '/result', params: { barcode: trimmed } });
  };

  const manualSheet = (
    <View style={styles.sheet}>
      <View style={styles.sheetHeader}>
        <MaterialIcons name="qr-code-scanner" size={18} color={COLORS.maroon} />
        <Text style={styles.sheetTitle}>Enter Barcode</Text>
        <Pressable
          style={styles.sheetClose}
          onPress={() => setSheet('none')}
          accessibilityLabel="Close"
        >
          <MaterialIcons name="close" size={18} color={COLORS.soft} />
        </Pressable>
      </View>
      <Text style={styles.sheetBody}>
        Type the 8, 12, or 13-digit EAN/UPC numerical code located beneath the product barcode
        stripes.
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
      <Pressable style={styles.sheetButton} onPress={verifyManual} accessibilityLabel="Verify Product">
        <Text style={styles.sheetButtonText}>Verify Product</Text>
      </Pressable>
    </View>
  );

  // Permission sheet: the same sheet both when camera access is missing
  // (full-screen state) and when the permissions pill is tapped on the
  // scanner (overlay). Allow Camera is only offered when the system can
  // still ask — otherwise Open Settings is the way in.
  const permissionSheet = (showAllow: boolean) => (
    <View style={styles.permissionSheet}>
      <View style={styles.permissionHandle} />
      <View style={styles.permissionIconCircle}>
        <MaterialIcons name="photo-camera" size={28} color={COLORS.maroon} />
      </View>
      <Text style={styles.permissionTitle}>Camera Access Needed</Text>
      <Text style={styles.permissionBody}>
        To instantly analyze barcodes, ScanRisk needs camera authorization.
      </Text>
      <View style={styles.permissionInfo}>
        <MaterialIcons name="lock" size={20} color={COLORS.amberMid} />
        <Text style={styles.permissionInfoText}>
          Images are processed on-device in real time. No video feeds or product photos are
          stored on remote servers.
        </Text>
      </View>
      <View style={styles.permissionButtons}>
        {showAllow ? (
          <Pressable
            style={styles.permissionPrimary}
            onPress={requestPermission}
            accessibilityLabel="Allow Camera"
          >
            <Text style={styles.permissionPrimaryText}>Allow Camera</Text>
          </Pressable>
        ) : null}
        <Pressable
          style={styles.permissionSecondary}
          onPress={() => Linking.openSettings()}
          accessibilityLabel="Open Settings"
        >
          <Text style={styles.permissionSecondaryText}>Open Settings</Text>
        </Pressable>
      </View>
      <Pressable
        style={styles.permissionLink}
        onPress={() => setSheet('manual')}
        accessibilityLabel="Enter code manually instead"
      >
        <Text style={styles.permissionLinkText}>Enter code manually instead</Text>
      </Pressable>
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
        {permissionSheet(permission.canAskAgain)}
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
      <View style={styles.cameraCard}>
        <CameraView
          style={StyleSheet.absoluteFill}
          facing={facing}
          enableTorch={torch}
          barcodeScannerSettings={{ barcodeTypes: [...BARCODE_TYPES] }}
          onBarcodeScanned={handleScan}
        />
        <View style={styles.dim} pointerEvents="none" />
        <SafeAreaView style={styles.cardOverlay} pointerEvents="box-none">
          <View style={styles.topRow}>
            <Pressable
              style={styles.closeButton}
              onPress={() => router.back()}
              accessibilityLabel="Close scanner"
            >
              <MaterialIcons name="close" size={18} color="#fff" />
            </Pressable>
            <View style={styles.livePillWrap} pointerEvents="none">
              <View style={styles.livePill}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>LIVE FOCUS</Text>
              </View>
            </View>
            <View style={styles.topButtons}>
              <Pressable
                style={styles.roundButton}
                onPress={() => setTorch((t) => !t)}
                accessibilityLabel={torch ? 'Turn torch off' : 'Turn torch on'}
              >
                <MaterialIcons name={torch ? 'flash-on' : 'flash-off'} size={20} color="#fff" />
              </Pressable>
              <Pressable
                style={styles.roundButton}
                onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))}
                accessibilityLabel="Flip camera"
              >
                <MaterialIcons name="flip-camera-ios" size={20} color="#fff" />
              </Pressable>
            </View>
          </View>

          <View ref={(node) => { frameRef.current = node; }} style={styles.frame}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
            <View style={styles.scanline} />
            <MaterialIcons
              name="center-focus-strong"
              size={20}
              color="#fff"
              style={styles.focusIcon}
            />
          </View>

          <View style={styles.hintPill}>
            <MaterialIcons name="document-scanner" size={18} color="#F59E0B" />
            <Text style={styles.hintText}>{hint}</Text>
          </View>

          <Pressable
            style={styles.permPill}
            onPress={() => setSheet('permission')}
            accessibilityLabel="Camera permission"
          >
            <MaterialIcons name="shield" size={18} color="#fff" />
            <Text style={styles.permLabel}>Camera permission</Text>
            <Text style={styles.permAction}>PERMISSIONS</Text>
            <MaterialIcons name="tune" size={16} color="#fff" />
          </Pressable>

          <Pressable
            style={styles.manualCard}
            onPress={() => setSheet('manual')}
            accessibilityLabel="Enter barcode manually"
          >
            <MaterialIcons name="keyboard" size={20} color={COLORS.maroon} />
            <View style={styles.manualCardText}>
              <Text style={styles.manualCardTitle}>Enter barcode</Text>
              <Text style={styles.manualCardTitle}>manually:</Text>
            </View>
            <View style={styles.manualCardFragment}>
              <View style={styles.fragmentBars}>
                {FRAGMENT_BARS.map((w, i) => (
                  <View key={i} style={[styles.fragmentBar, { width: w }]} />
                ))}
              </View>
              {lastManual ? (
                <Text style={styles.manualCardPrefix}>{lastManual.slice(0, 7)}…</Text>
              ) : null}
            </View>
          </Pressable>
        </SafeAreaView>
      </View>

      <View style={styles.recentSection}>
        <View style={styles.recentHeader}>
          <Text style={styles.recentTitle}>Recent Ingredient Analyses</Text>
          <Text style={styles.recentToday}>Today</Text>
        </View>
        {today.length === 0 ? (
          <Text style={styles.recentEmpty}>No scans today yet.</Text>
        ) : (
          <View style={styles.recentCards}>
            {today.map((t) => {
              const band = BANDS[t.record.band];
              const alert = t.record.band === 'high' || t.record.band === 'very-high';
              return (
                <Pressable
                  key={`${t.record.barcode}-${t.record.scannedAt}`}
                  style={styles.recentCard}
                  onPress={() =>
                    router.push({ pathname: '/result', params: { barcode: t.record.barcode } })
                  }
                >
                  {t.imageUrl ? (
                    <Image source={{ uri: t.imageUrl }} style={styles.recentThumb} />
                  ) : (
                    <View style={[styles.recentThumb, styles.recentThumbPlaceholder]}>
                      <MaterialIcons name="image" size={22} color={COLORS.soft} />
                    </View>
                  )}
                  <View style={styles.recentCardText}>
                    <Text style={styles.recentCardName} numberOfLines={1}>
                      {t.record.name}
                    </Text>
                    <View style={styles.recentCardSub}>
                      <View style={[styles.recentCardDot, { backgroundColor: band.color }]} />
                      <Text
                        style={[
                          styles.recentCardSubText,
                          { color: alert ? COLORS.danger : COLORS.soft },
                        ]}
                        numberOfLines={1}
                      >
                        {t.topFactor ?? `${t.record.score}/50 ${band.label}`}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              );
            })}
            {today.length === 1 ? <View style={styles.recentCardSpacer} /> : null}
          </View>
        )}
      </View>

      {sheet === 'manual' ? <View style={styles.sheetOverlay}>{manualSheet}</View> : null}
      {sheet === 'permission' ? (
        <View style={styles.sheetOverlay}>{permissionSheet(false)}</View>
      ) : null}

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
  container: { flex: 1, backgroundColor: COLORS.paleSlate },
  centerDark: { flex: 1, backgroundColor: '#171321', alignItems: 'center', justifyContent: 'center' },
  centerDarkText: { color: '#fff', fontSize: 15 },
  // Camera card: full-bleed photo at the top, rounded bottom corners, the
  // overlay content defines its height (~470).
  cameraCard: {
    marginHorizontal: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
  },
  dim: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(23,19,33,0.42)' },
  cardOverlay: { gap: 12, paddingBottom: 6, paddingTop: 10 },
  topRow: {
    position: 'relative',
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  livePillWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 28,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 999,
    paddingHorizontal: 12,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.amber },
  liveText: { color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 1.5, fontFamily: FONTS.bodyBold },
  topButtons: { flexDirection: 'row', gap: 8 },
  roundButton: {
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  frame: { height: 174, width: 294, position: 'relative', alignSelf: 'center' },
  corner: { position: 'absolute', width: 28, height: 28, borderColor: COLORS.amber },
  cornerTL: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 3 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 3 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 3 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 3 },
  scanline: {
    position: 'absolute',
    left: 8,
    right: 8,
    top: '50%',
    marginTop: -1,
    height: 2,
    backgroundColor: '#F59E0B',
  },
  focusIcon: { position: 'absolute', left: '50%', top: '50%', marginLeft: -10, marginTop: -10 },
  hintPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 8,
    backgroundColor: 'rgba(74,18,26,0.88)',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  hintText: { color: '#fff', fontSize: 13.5, fontWeight: '600', fontFamily: FONTS.bodySemi },
  permPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 38,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 10,
    paddingHorizontal: 14,
  },
  permLabel: { flex: 1, color: '#fff', fontSize: 13, fontFamily: FONTS.body },
  permAction: { color: '#F59E0B', fontSize: 12, fontWeight: '800', fontFamily: FONTS.bodyBold },
  manualCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: 70,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  manualCardText: { flex: 1 },
  manualCardTitle: { color: COLORS.maroon, fontSize: 14, fontWeight: '700', fontFamily: FONTS.bodySemi },
  manualCardFragment: { alignItems: 'center', gap: 4 },
  fragmentBars: { flexDirection: 'row', alignItems: 'flex-end', gap: 1.5, height: 28 },
  fragmentBar: { height: 28, backgroundColor: '#94A3B8' },
  manualCardPrefix: { color: COLORS.soft, fontSize: 10, fontFamily: FONTS.body },
  // Recent section on the pale slate background.
  recentSection: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 24 },
  recentHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  recentTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A', fontFamily: FONTS.headline },
  recentToday: { fontSize: 13, color: COLORS.soft, fontFamily: FONTS.bodySemi },
  recentEmpty: { color: COLORS.soft, fontSize: 13, marginTop: 12, fontFamily: FONTS.body },
  recentCards: { flexDirection: 'row', gap: 12, marginTop: 12 },
  recentCard: {
    flex: 1,
    height: 70,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.card,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
  },
  recentCardSpacer: { flex: 1 },
  recentThumb: { width: 48, height: 48, borderRadius: 10, backgroundColor: COLORS.softBlue },
  recentThumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  recentCardText: { flex: 1 },
  recentCardName: { fontSize: 13.5, fontWeight: '700', color: '#0F172A', fontFamily: FONTS.bodySemi },
  recentCardSub: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  recentCardDot: { width: 7, height: 7, borderRadius: 4 },
  recentCardSubText: { flex: 1, fontSize: 12, fontFamily: FONTS.body },
  // Sheets.
  sheetOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    paddingBottom: 28,
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sheetTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: COLORS.ink, fontFamily: FONTS.headline },
  sheetClose: {
    width: 32,
    height: 32,
    borderRadius: 999,
    backgroundColor: COLORS.paleSlate,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetBody: { color: COLORS.inkSoft, fontSize: 14.5, lineHeight: 21, marginTop: 12, fontFamily: FONTS.body },
  sheetInput: {
    backgroundColor: COLORS.bg,
    borderColor: COLORS.line,
    borderRadius: 10,
    borderWidth: 1,
    fontSize: 15,
    height: 48,
    marginTop: 14,
    paddingHorizontal: 14,
    fontFamily: FONTS.body,
  },
  sheetError: { color: COLORS.danger, fontSize: 13, marginTop: 8 },
  sheetButton: {
    height: 50,
    borderRadius: 10,
    backgroundColor: COLORS.maroon,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  sheetButtonText: { color: '#fff', fontSize: 15, fontWeight: '700', fontFamily: FONTS.bodySemi },
  // Permission sheet.
  permissionRoot: { flex: 1, backgroundColor: '#171321', justifyContent: 'flex-end' },
  permissionSheet: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
  },
  permissionHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
  },
  permissionIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 999,
    backgroundColor: COLORS.softBlue,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: 16,
  },
  permissionTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: COLORS.ink,
    fontFamily: FONTS.headline,
    marginTop: 12,
    textAlign: 'center',
  },
  permissionBody: {
    color: COLORS.inkSoft,
    fontSize: 15,
    lineHeight: 24,
    marginTop: 8,
    textAlign: 'center',
    fontFamily: FONTS.body,
  },
  permissionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.paleSlate,
    borderRadius: 12,
    marginTop: 16,
    padding: 14,
  },
  permissionInfoText: { flex: 1, color: '#334155', fontSize: 14, lineHeight: 20, fontFamily: FONTS.body },
  permissionButtons: { gap: 12, marginTop: 16 },
  permissionPrimary: {
    height: 56,
    borderRadius: 10,
    backgroundColor: COLORS.maroon,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionPrimaryText: { color: '#fff', fontSize: 15.5, fontWeight: '700', fontFamily: FONTS.bodySemi },
  permissionSecondary: {
    height: 56,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionSecondaryText: { color: COLORS.amberBrown, fontSize: 15.5, fontWeight: '700', fontFamily: FONTS.bodySemi },
  permissionLink: { alignItems: 'center', marginTop: 20 },
  permissionLinkText: { color: '#475569', fontSize: 14, fontFamily: FONTS.bodySemi },
});
