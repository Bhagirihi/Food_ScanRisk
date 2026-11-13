import { useCallback, useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import Tour, { type Measurable } from '../src/components/Tour';
import { hasSeenTip, markTipSeen } from '../src/lib/tips';
import { COLORS, SERIF } from '../src/lib/theme';
import { PrimaryButton, TextButton } from '../src/components/ui';

const BARCODE_TYPES = ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128'] as const;

export default function Scan() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [torch, setTorch] = useState(false);
  const [hint, setHint] = useState('Point the camera at a product barcode');
  const [showTour, setShowTour] = useState(false);
  const containerRef = useRef<Measurable | null>(null);
  const frameRef = useRef<Measurable | null>(null);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      let timer: ReturnType<typeof setTimeout> | undefined;
      hasSeenTip('scan').then((seen) => {
        if (alive && !seen) timer = setTimeout(() => setShowTour(true), 700);
      });
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

  if (!permission) {
    return (
      <View style={styles.center}>
        <Text>Loading camera…</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.title}>Camera access needed</Text>
        <Text style={styles.body}>
          ScanRisk uses the camera only to read product barcodes. Nothing is recorded.
        </Text>
        <View style={styles.buttonWrap}>
          {permission.canAskAgain ? (
            <PrimaryButton label="Allow camera" onPress={requestPermission} />
          ) : (
            <PrimaryButton label="Open Settings" onPress={() => Linking.openSettings()} />
          )}
        </View>
        <TextButton label="Go back" onPress={() => router.back()} />
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
        facing="back"
        enableTorch={torch}
        barcodeScannerSettings={{ barcodeTypes: [...BARCODE_TYPES] }}
        onBarcodeScanned={handleScan}
      />
      <SafeAreaView style={styles.overlay} pointerEvents="box-none">
        <Text style={styles.hint}>{hint}</Text>
        <View ref={(node) => { frameRef.current = node; }} style={styles.frame}>
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />
        </View>
        <View style={styles.bottomRow}>
          <Pressable style={styles.overlayButton} onPress={() => setTorch((t) => !t)}>
            <Text style={styles.overlayButtonText}>{torch ? 'Torch off' : 'Torch on'}</Text>
          </Pressable>
          <Pressable style={styles.overlayButton} onPress={() => router.back()}>
            <Text style={styles.overlayButtonText}>Cancel</Text>
          </Pressable>
        </View>
      </SafeAreaView>
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
  container: { flex: 1 },
  center: { alignItems: 'center', flex: 1, justifyContent: 'center', padding: 24 },
  title: { fontSize: 20, fontWeight: '700', fontFamily: SERIF, textAlign: 'center' },
  body: { color: COLORS.soft, fontSize: 15, lineHeight: 21, marginTop: 8, textAlign: 'center' },
  buttonWrap: { marginTop: 20, width: '100%' },
  overlay: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'space-between',
    paddingBottom: 40,
    paddingTop: 24,
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
  },
  frame: { height: 180, position: 'relative', width: 280 },
  corner: { position: 'absolute', width: 30, height: 30, borderColor: COLORS.goldBright },
  cornerTL: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 14 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 14 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 14 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 14 },
  bottomRow: { flexDirection: 'row', gap: 12 },
  overlayButton: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  overlayButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
