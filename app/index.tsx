import { useCallback, useRef, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useCameraPermissions } from 'expo-camera';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import Tour, { type Measurable } from '../src/components/Tour';
import { Card, SectionTitle, TextButton } from '../src/components/ui';
import { hasSeenTip, markTipSeen } from '../src/lib/tips';
import { getHistory, type ScanRecord } from '../src/lib/history';
import { BANDS } from '../src/lib/risk';
import { COLORS, GRADIENTS, SERIF } from '../src/lib/theme';

const EXAMPLE_BARCODE = '3017624010701';

export default function Home() {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [records, setRecords] = useState<ScanRecord[]>([]);
  const [showTour, setShowTour] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const containerRef = useRef<Measurable | null>(null);
  const scanRef = useRef<Measurable | null>(null);
  const manualRef = useRef<Measurable | null>(null);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      let timer: ReturnType<typeof setTimeout> | undefined;
      getHistory().then((r) => {
        if (alive) setRecords(r);
      });
      hasSeenTip('home').then((seen) => {
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
    void markTipSeen('home');
  };

  // Ask for the camera the moment the user taps Scan — no extra screen first.
  const onScanPress = async () => {
    if (!permission?.granted) {
      await requestPermission();
    }
    router.push('/scan');
  };

  const lookup = () => {
    const trimmed = code.trim();
    if (!/^\d{8,14}$/.test(trimmed)) {
      setError('Enter a barcode with 8 to 14 digits.');
      return;
    }
    setError('');
    router.push({ pathname: '/result', params: { barcode: trimmed } });
  };

  const total = records.length;
  const avg = total > 0 ? Math.round(records.reduce((s, r) => s + r.score, 0) / total) : 0;
  const lowCount = records.filter((r) => r.band === 'low').length;
  const recent = records.slice(0, 3);

  return (
    <View ref={(node) => { containerRef.current = node; }} style={styles.root}>
      <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safe}>
        <ScrollView contentContainerStyle={styles.content}>
          <LinearGradient
            colors={GRADIENTS.hero}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <Image source={require('../assets/icon.png')} style={styles.logo} />
            <View style={styles.heroText}>
              <Text style={styles.heroTitle}>ScanRisk</Text>
              <Text style={styles.heroTag}>Know what is inside, before you buy it.</Text>
            </View>
          </LinearGradient>

          <Pressable
            ref={(node) => { scanRef.current = node; }}
            onPress={onScanPress}
            style={styles.scanPress}
          >
            <LinearGradient
              colors={GRADIENTS.cta}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.scanButton}
            >
              <Text style={styles.scanButtonText}>Scan a product</Text>
            </LinearGradient>
          </Pressable>

          <TextButton
            label="No product handy? Try Nutella →"
            onPress={() => router.push({ pathname: '/result', params: { barcode: EXAMPLE_BARCODE } })}
          />

          {total > 0 ? (
            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{total}</Text>
                <Text style={styles.statLabel}>Scans</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{avg}</Text>
                <Text style={styles.statLabel}>Avg score</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{lowCount}</Text>
                <Text style={styles.statLabel}>Low risk</Text>
              </View>
            </View>
          ) : null}

          <View ref={(node) => { manualRef.current = node; }}>
            <Card style={styles.manualCard}>
              <Text style={styles.cardTitle}>Or type the barcode</Text>
              <TextInput
                style={styles.input}
                value={code}
                onChangeText={setCode}
                placeholder="e.g. 3017624010701"
                keyboardType="number-pad"
                maxLength={14}
                placeholderTextColor={COLORS.placeholder}
                onSubmitEditing={lookup}
              />
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <Pressable style={styles.lookupButton} onPress={lookup}>
                <Text style={styles.lookupButtonText}>Look up</Text>
              </Pressable>
            </Card>
          </View>

          {recent.length > 0 ? (
            <>
              <SectionTitle>Recent scans</SectionTitle>
              {recent.map((r) => (
                <Pressable
                  key={`${r.barcode}-${r.scannedAt}`}
                  style={styles.row}
                  onPress={() => router.push({ pathname: '/result', params: { barcode: r.barcode } })}
                >
                  <View style={styles.rowText}>
                    <Text style={styles.rowName} numberOfLines={1}>
                      {r.name}
                    </Text>
                    <Text style={styles.rowMeta}>
                      {r.brand ? `${r.brand} · ` : ''}
                      {new Date(r.scannedAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </Text>
                  </View>
                  <View style={[styles.chip, { backgroundColor: BANDS[r.band].color }]}>
                    <Text style={styles.chipText}>{r.score}</Text>
                  </View>
                </Pressable>
              ))}
              <TextButton label="See all history →" onPress={() => router.push('/history')} />
            </>
          ) : (
            <TextButton label="Scan history →" onPress={() => router.push('/history')} />
          )}

          <Card style={styles.howCard}>
            <Text style={styles.howTitle}>How the risk score works</Text>
            <Text style={styles.howText}>
              0–50, from the label itself: Nutri-Score, processing level, sugar, salt, fat and
              additives. Every point is explained on the result screen.
            </Text>
          </Card>

          <Text style={styles.disclaimer}>
            Guidance score from label data (Open Food Facts). Not medical advice.
          </Text>
        </ScrollView>
      </SafeAreaView>

      {showTour ? (
        <Tour
          steps={[
            {
              key: 'scan',
              title: 'Scan a product',
              body: 'Point your camera at any product barcode. The risk score appears in seconds.',
            },
            {
              key: 'manual',
              title: 'No camera? Type it',
              body: 'Type the 8–14 digit barcode instead — same result, same explanation.',
            },
          ]}
          targets={{ scan: scanRef, manual: manualRef }}
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
  content: { padding: 20, paddingBottom: 40 },
  hero: {
    alignItems: 'center',
    borderRadius: 22,
    flexDirection: 'row',
    gap: 14,
    padding: 18,
  },
  logo: { width: 64, height: 64, borderRadius: 16 },
  heroText: { flex: 1 },
  heroTitle: { color: '#FFF7E8', fontSize: 30, fontWeight: '700', fontFamily: SERIF },
  heroTag: { color: '#F5D98B', fontSize: 14, lineHeight: 19, marginTop: 2 },
  scanPress: { marginTop: 16 },
  scanButton: {
    alignItems: 'center',
    borderRadius: 16,
    paddingVertical: 18,
    shadowColor: COLORS.orangeDeep,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 8,
  },
  scanButtonText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  stat: {
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderColor: COLORS.line,
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    padding: 12,
  },
  statValue: { color: COLORS.maroon, fontSize: 24, fontWeight: '700', fontFamily: SERIF },
  statLabel: { color: COLORS.soft, fontSize: 12, marginTop: 2 },
  manualCard: { marginTop: 16 },
  cardTitle: { fontSize: 16, fontWeight: '700', fontFamily: SERIF },
  input: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.line,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 17,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  error: { color: COLORS.danger, fontSize: 13, marginTop: 6 },
  lookupButton: {
    alignItems: 'center',
    backgroundColor: COLORS.gold,
    borderRadius: 12,
    marginTop: 12,
    paddingVertical: 12,
  },
  lookupButtonText: { color: COLORS.maroonDeep, fontSize: 16, fontWeight: '700' },
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
  howCard: { marginTop: 12 },
  howTitle: { fontSize: 16, fontWeight: '700', fontFamily: SERIF },
  howText: { color: COLORS.inkSoft, fontSize: 14, lineHeight: 20, marginTop: 6 },
  disclaimer: { color: COLORS.soft, fontSize: 12, marginTop: 20, textAlign: 'center' },
});
