import { useCallback, useRef, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import Tour, { type Measurable } from '../src/components/Tour';
import BottomTabs from '../src/components/BottomTabs';
import { Card, Toast } from '../src/components/ui';
import { hasSeenTip, markTipSeen } from '../src/lib/tips';
import { getProTipDismissed, getTipsEnabled, setProTipDismissed } from '../src/lib/settings';
import { getHistory, type ScanRecord } from '../src/lib/history';
import { BANDS, bandForScore, type RiskBand } from '../src/lib/risk';
import { getSession } from '../src/lib/supabase';
import { isGuest } from '../src/lib/session';
import {
  markNotificationPromptAsked,
  refreshWeeklySummary,
  requestNotificationPermission,
  setWeeklySummaryEnabled,
  wasNotificationPromptAsked,
} from '../src/lib/weeklySummary';
import { COLORS, FONTS, GRADIENTS } from '../src/lib/theme';

const EXAMPLE_BARCODE = '3017624010701';
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

const HOW_IT_WORKS = [
  { label: 'Nutri-Score', pts: 'up to +12' },
  { label: 'Processing level (NOVA)', pts: 'up to +10' },
  { label: 'Sugar', pts: 'up to +6' },
  { label: 'Salt', pts: 'up to +5' },
  { label: 'Saturated fat', pts: 'up to +5' },
  { label: 'Trans fat', pts: '+5' },
  { label: 'Additives of concern', pts: 'up to +6' },
] as const;

/** "2h ago" / "yesterday" / "3 days ago" — the Recent Scans date line. */
function relativeScanTime(scannedAt: number): string {
  const secs = Math.max(0, Math.floor((Date.now() - scannedAt) / 1000));
  if (secs < 60) return 'just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'yesterday';
  return `${days} days ago`;
}

/** Left icon tile per band: pale blue tile + leaf for low/moderate, pale red + warning for high. */
const RECENT_TILE: Record<RiskBand, { bg: string; icon: keyof typeof MaterialIcons.glyphMap; color: string }> = {
  low: { bg: COLORS.paleBlue, icon: 'eco', color: COLORS.green },
  moderate: { bg: COLORS.paleBlue, icon: 'eco', color: COLORS.amberMid },
  high: { bg: COLORS.paleRed, icon: 'warning', color: COLORS.danger },
  'very-high': { bg: COLORS.paleRed, icon: 'warning', color: COLORS.danger },
};

/** Score pill per band: dot + "8/50 LOW" — abbreviated label, same colour throughout. */
const RECENT_PILL: Record<RiskBand, { bg: string; color: string; label: string }> = {
  low: { bg: COLORS.paleGreen, color: COLORS.green, label: 'LOW' },
  moderate: { bg: COLORS.paleAmber, color: COLORS.amberBrown, label: 'MOD' },
  high: { bg: COLORS.paleRed, color: COLORS.danger, label: 'HIGH' },
  'very-high': { bg: COLORS.paleRed, color: COLORS.danger, label: 'V. HIGH' },
};

/** Short band label for the Health Snapshot middle stat ("Moderate", not "Moderate risk"). */
const SNAP_LABEL: Record<RiskBand, string> = {
  low: 'Low-Risk',
  moderate: 'Moderate',
  high: 'High-Risk',
  'very-high': 'Very High',
};

export default function Home() {
  const [records, setRecords] = useState<ScanRecord[]>([]);
  const [snapshotNow, setSnapshotNow] = useState(0);
  const [displayName, setDisplayName] = useState('Guest');
  const [proTipVisible, setProTipVisible] = useState(false);
  const [notifCardVisible, setNotifCardVisible] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const [toast, setToast] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const containerRef = useRef<Measurable | null>(null);
  const scanRef = useRef<Measurable | null>(null);
  const recentRef = useRef<Measurable | null>(null);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      let timer: ReturnType<typeof setTimeout> | undefined;
      let toastTimer: ReturnType<typeof setTimeout> | undefined;
      getHistory().then((r) => {
        if (alive) {
          setRecords(r);
          setSnapshotNow(Date.now());
        }
      });
      Promise.all([getSession(), isGuest(), getProTipDismissed()]).then(([s, guest, dismissed]) => {
        if (!alive) return;
        const meta = (s?.user?.user_metadata ?? {}) as { full_name?: string };
        setDisplayName(guest ? 'Guest' : meta.full_name || s?.user?.email?.split('@')[0] || 'Guest');
        setProTipVisible(!dismissed);
      });
      Promise.all([hasSeenTip('home'), getTipsEnabled()]).then(([seen, enabled]) => {
        if (alive && !seen && enabled) timer = setTimeout(() => setShowTour(true), 700);
      });
      // One-shot notification ask: show the explainer card only until it has
      // been answered once. Recompute the weekly summary on every entry so
      // its numbers never go stale.
      wasNotificationPromptAsked().then((asked) => {
        if (alive && !asked) setNotifCardVisible(true);
      });
      void refreshWeeklySummary();
      return () => {
        alive = false;
        if (timer) clearTimeout(timer);
        if (toastTimer) clearTimeout(toastTimer);
      };
    }, []),
  );

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

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

  const dismissProTip = async () => {
    setProTipVisible(false);
    await setProTipDismissed();
  };

  // Notification explainer card: Allow triggers the system sheet once.
  // A denial is recorded and never re-asked here — Profile has the toggle.
  const allowNotifications = async () => {
    setNotifCardVisible(false);
    await markNotificationPromptAsked();
    const granted = await requestNotificationPermission();
    if (granted) {
      await setWeeklySummaryEnabled(true);
      await refreshWeeklySummary();
      showToast('Weekly summary on — Sundays at 9:00');
    } else {
      showToast('Notifications are off — you can turn them on in Profile');
    }
  };

  const dismissNotifCard = async () => {
    setNotifCardVisible(false);
    await markNotificationPromptAsked();
  };

  const recent30 = records.filter((r) => snapshotNow - r.scannedAt < THIRTY_DAYS_MS);
  const total30 = recent30.length;
  const avg30 = total30 > 0 ? Math.round(recent30.reduce((s, r) => s + r.score, 0) / total30) : 0;
  const low30 = recent30.filter((r) => r.band === 'low').length;
  const lowPct30 = total30 > 0 ? Math.round((low30 / total30) * 100) : 0;
  const recent = records.slice(0, 3);

  return (
    <View ref={(node) => { containerRef.current = node; }} style={styles.root}>
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.topBar}>
            <View style={styles.topBarLeft}>
              <Image source={require('../assets/icon.png')} style={styles.logo} />
              <View>
                <Text style={styles.topBarTitle}>ScanRisk</Text>
                <Text style={styles.topBarSub}>HOME DASHBOARD</Text>
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

          <Text style={styles.eyebrow}>NUTRITIONAL INTELLIGENCE</Text>
          <Text style={styles.greeting}>Welcome back, {displayName}</Text>

          {proTipVisible ? (
            <Card style={styles.tipCard}>
              <View style={styles.tipRow}>
                <MaterialIcons name="lightbulb-outline" size={22} color={COLORS.navy} />
                <Text style={styles.tipTitle}>Pro Tip for Quick Scanning</Text>
                <Pressable onPress={dismissProTip} accessibilityLabel="Dismiss tip">
                  <MaterialIcons name="close" size={20} color={COLORS.soft} />
                </Pressable>
              </View>
              <Text style={styles.tipBody}>
                Hold steady 4–6 inches from the barcode in good light for fast recognition.
              </Text>
            </Card>
          ) : null}

          {notifCardVisible ? (
            <Card style={styles.notifCard}>
              <View style={styles.tipRow}>
                <MaterialIcons name="notifications" size={22} color={COLORS.maroon} />
                <Text style={styles.tipTitle}>Weekly scan summary</Text>
                <Pressable onPress={dismissNotifCard} accessibilityLabel="Not now">
                  <MaterialIcons name="close" size={20} color={COLORS.soft} />
                </Pressable>
              </View>
              <Text style={styles.tipBody}>
                Get a short summary every Sunday at 9:00 — scans this week, average
                score, low-risk count. It is built on your phone from your own scans.
              </Text>
              <View style={styles.notifActions}>
                <Pressable style={styles.notifAllow} onPress={allowNotifications}>
                  <Text style={styles.notifAllowText}>Allow</Text>
                </Pressable>
                <Pressable style={styles.notifLater} onPress={dismissNotifCard}>
                  <Text style={styles.notifLaterText}>Not now</Text>
                </Pressable>
              </View>
            </Card>
          ) : null}

          <Pressable
            ref={(node) => { scanRef.current = node; }}
            onPress={onScanPress}
            style={styles.scanCardWrap}
          >
            <LinearGradient
              colors={GRADIENTS.hero}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.scanCard}
            >
              <View style={styles.viewfinder}>
                <View style={[styles.corner, styles.cornerTL]} />
                <View style={[styles.corner, styles.cornerTR]} />
                <View style={[styles.corner, styles.cornerBL]} />
                <View style={[styles.corner, styles.cornerBR]} />
                <View style={styles.scanIconWrap}>
                  <MaterialIcons name="qr-code-scanner" size={46} color={COLORS.amber} />
                  <View style={styles.scanline} />
                </View>
              </View>
              <View style={styles.scanCardTitleRow}>
                <Text style={styles.scanCardTitle}>Scan Barcode</Text>
                <MaterialIcons name="arrow-forward" size={24} color="#fff" />
              </View>
              <Text style={styles.scanCardSub}>Tap to activate camera &amp; analyze</Text>
              <View style={styles.scanPills}>
                <Pressable
                  style={styles.manualPill}
                  onPress={() => router.push({ pathname: '/scan', params: { manual: '1' } })}
                >
                  <MaterialIcons name="keyboard" size={18} color="#fff" />
                  <Text style={styles.manualPillText}>Manual Entry</Text>
                </Pressable>
                <Pressable
                  style={styles.demoPill}
                  onPress={() =>
                    router.push({ pathname: '/result', params: { barcode: EXAMPLE_BARCODE } })
                  }
                >
                  <MaterialIcons name="qr-code-scanner" size={18} color={COLORS.maroon} />
                  <Text style={styles.demoPillText}>Try Nutella</Text>
                </Pressable>
              </View>
            </LinearGradient>
          </Pressable>

          {total30 > 0 ? (
            <>
              <View style={styles.snapHeader}>
                <Text style={styles.snapTitle}>Health Snapshot</Text>
                <Text style={styles.snapSub}>Last 30 Days</Text>
              </View>
              <View style={styles.statsRow}>
                <View style={styles.stat}>
                  <MaterialIcons name="qr-code-scanner" size={22} color={COLORS.maroon} />
                  <Text style={styles.statValue}>{total30}</Text>
                  <Text style={styles.statLabel}>Total Scans</Text>
                </View>
                <View style={styles.stat}>
                  <MaterialIcons name="speed" size={22} color={COLORS.amber} />
                  <Text style={styles.statValue}>
                    {avg30}
                    <Text style={styles.statUnit}> /50</Text>
                  </Text>
                  <Text style={[styles.statLabel, { color: BANDS[bandForScore(avg30)].color }]}>
                    {SNAP_LABEL[bandForScore(avg30)]}
                  </Text>
                </View>
                <View style={styles.stat}>
                  <MaterialIcons name="verified" size={22} color={COLORS.green} />
                  <Text style={styles.statValue}>
                    {low30}
                    <Text style={[styles.statUnit, { color: COLORS.green }]}> {lowPct30}%</Text>
                  </Text>
                  <Text style={styles.statLabel}>Low-Risk</Text>
                </View>
              </View>
            </>
          ) : null}

          {recent.length > 0 ? (
            <View ref={(node) => { recentRef.current = node; }} style={styles.recentWrap}>
              <View style={styles.recentHeader}>
                <View style={styles.recentTitleWrap}>
                  <MaterialIcons name="history" size={18} color={COLORS.navy} />
                  <Text style={styles.recentTitle}>Recent Scans</Text>
                </View>
                <Pressable style={styles.viewAllLink} onPress={() => router.push('/history')}>
                  <Text style={styles.viewAllLinkText}>View all {records.length}</Text>
                  <MaterialIcons name="chevron-right" size={16} color={COLORS.navy} />
                </Pressable>
              </View>
              {recent.map((r) => {
                const tile = RECENT_TILE[r.band];
                const pill = RECENT_PILL[r.band];
                return (
                  <Pressable
                    key={`${r.barcode}-${r.scannedAt}`}
                    style={styles.recentRow}
                    onPress={() => router.push({ pathname: '/result', params: { barcode: r.barcode } })}
                  >
                    <View style={[styles.recentTile, { backgroundColor: tile.bg }]}>
                      <MaterialIcons name={tile.icon} size={22} color={tile.color} />
                    </View>
                    <View style={styles.recentText}>
                      <Text style={styles.recentName} numberOfLines={1}>
                        {r.name}
                      </Text>
                      <Text style={styles.recentDate}>Scanned {relativeScanTime(r.scannedAt)}</Text>
                    </View>
                    <View style={[styles.scorePill, { backgroundColor: pill.bg }]}>
                      <View style={[styles.scoreDot, { backgroundColor: pill.color }]} />
                      <Text style={[styles.scorePillText, { color: pill.color }]}>
                        {r.score}/50 {pill.label}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
              <Pressable style={styles.viewAllButton} onPress={() => router.push('/history')}>
                <Text style={styles.viewAllButtonText}>
                  View all {records.length} scans in History
                </Text>
                <MaterialIcons name="arrow-forward" size={18} color={COLORS.navy} />
              </Pressable>
            </View>
          ) : null}

          <Card style={styles.howCard}>
            <Pressable style={styles.howHeader} onPress={() => setExpanded((e) => !e)}>
              <MaterialIcons name="science" size={22} color={COLORS.maroon} style={styles.howIcon} />
              <View style={styles.howTitleWrap}>
                <Text style={styles.howTitle}>How Risk Scores Work</Text>
                <Text style={styles.howSub}>How we score 0–50 from the label</Text>
              </View>
              <MaterialIcons
                name={expanded ? 'expand-less' : 'expand-more'}
                size={24}
                color={COLORS.soft}
              />
            </Pressable>
            {expanded ? (
              <View style={styles.howBody}>
                <Text style={styles.howText}>
                  Every product is scored 0–50 from its label. Points come from Nutri-Score,
                  processing level (NOVA), sugar, salt, saturated fat, trans fat, and additives
                  of concern.
                </Text>
                {HOW_IT_WORKS.map((f) => (
                  <View key={f.label} style={styles.howRow}>
                    <Text style={styles.howRowLabel}>{f.label}</Text>
                    <Text style={styles.howRowPts}>{f.pts}</Text>
                  </View>
                ))}
                <View style={styles.bandRow}>
                  {(['low', 'moderate', 'high', 'very-high'] as const).map((b) => (
                    <View key={b} style={styles.bandItem}>
                      <View style={[styles.bandDot, { backgroundColor: BANDS[b].color }]} />
                      <Text style={styles.bandText}>
                        {BANDS[b].range} {BANDS[b].label}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
          </Card>

          <Text style={styles.disclaimer}>
            Guidance score from label data (Open Food Facts). Not medical advice.
          </Text>
        </ScrollView>
        <BottomTabs active="home" />
      </SafeAreaView>

      {toast ? <Toast message={toast} /> : null}

      {showTour ? (
        <Tour
          steps={[
            {
              key: 'scan',
              title: 'Scan a product',
              body: 'Point your camera at any product barcode. The risk score appears in seconds.',
            },
            {
              key: 'recent',
              title: 'Your recent scans',
              body: 'Everything you scan is saved here, so you can compare products any time.',
            },
          ]}
          targets={{ scan: scanRef, recent: recentRef }}
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
  content: { padding: 20, paddingBottom: 24 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
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
  greeting: { fontSize: 26, fontWeight: '700', color: COLORS.ink, fontFamily: FONTS.headline, marginTop: 4 },
  eyebrow: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.maroon,
    letterSpacing: 2,
    fontFamily: FONTS.bodyBold,
    marginTop: 20,
  },
  tipCard: { marginTop: 16, backgroundColor: COLORS.softBlue, borderColor: '#D8E4F8' },
  notifCard: { marginTop: 16, backgroundColor: COLORS.amberSoft, borderColor: '#F3DFC0' },
  notifActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  notifAllow: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.maroon,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifAllowText: { color: '#fff', fontSize: 15, fontWeight: '700', fontFamily: FONTS.bodySemi },
  notifLater: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    borderColor: COLORS.line,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifLaterText: { color: COLORS.ink, fontSize: 15, fontWeight: '700', fontFamily: FONTS.bodySemi },
  tipRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tipTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: COLORS.ink, fontFamily: FONTS.bodySemi },
  tipBody: { fontSize: 14, color: COLORS.inkSoft, lineHeight: 20, marginTop: 8, fontFamily: FONTS.body },
  scanCardWrap: { marginTop: 20 },
  scanCard: {
    borderRadius: 24,
    paddingVertical: 24,
    paddingHorizontal: 20,
    shadowColor: COLORS.maroon,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  viewfinder: {
    width: 200,
    height: 130,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  corner: { position: 'absolute', width: 30, height: 30, borderColor: COLORS.amber },
  cornerTL: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 4 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 4 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 4 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 4 },
  scanIconWrap: { alignItems: 'center', justifyContent: 'center' },
  scanline: {
    position: 'absolute',
    left: -14,
    right: -14,
    height: 2,
    backgroundColor: '#F59E0B',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 10,
    elevation: 4,
  },
  scanCardTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16 },
  scanCardTitle: { color: '#fff', fontSize: 22, fontWeight: '700', fontFamily: FONTS.headline },
  scanCardSub: { color: '#E8CF9F', fontSize: 13, marginTop: 4, textAlign: 'center', fontFamily: FONTS.body },
  scanPills: { flexDirection: 'row', gap: 10, marginTop: 20 },
  manualPill: {
    flex: 1,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 999,
    paddingHorizontal: 10,
  },
  manualPillText: { color: '#fff', fontSize: 13.5, fontWeight: '700', textAlign: 'center', fontFamily: FONTS.bodySemi },
  demoPill: {
    flex: 1,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.amber,
    borderRadius: 999,
    paddingHorizontal: 10,
  },
  demoPillText: { color: COLORS.maroon, fontSize: 13.5, fontWeight: '700', textAlign: 'center', fontFamily: FONTS.bodySemi },
  snapHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 26, marginBottom: 12 },
  snapTitle: { fontSize: 20, fontWeight: '700', color: COLORS.ink, fontFamily: FONTS.headline },
  snapSub: { fontSize: 12, color: COLORS.soft, fontFamily: FONTS.bodySemi },
  statsRow: { flexDirection: 'row', gap: 10 },
  stat: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderColor: COLORS.line,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 4,
  },
  statValue: { color: COLORS.ink, fontSize: 20, fontWeight: '800', fontFamily: FONTS.headline },
  statUnit: { fontSize: 13, fontWeight: '700', color: COLORS.soft, fontFamily: FONTS.bodySemi },
  statLabel: { color: COLORS.soft, fontSize: 12, fontFamily: FONTS.bodySemi },
  recentWrap: { marginTop: 24 },
  recentHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  recentTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  recentTitle: { fontSize: 16, fontWeight: '700', color: COLORS.navy, fontFamily: FONTS.headline },
  viewAllLink: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  viewAllLinkText: { fontSize: 12, fontWeight: '700', color: COLORS.navy, fontFamily: FONTS.bodyBold },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.card,
    borderColor: '#E2E8F0',
    borderRadius: 15,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#171321',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  recentTile: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  recentText: { flex: 1 },
  recentName: { fontSize: 15, fontWeight: '600', color: '#0F172A', fontFamily: FONTS.bodySemi },
  recentDate: { fontSize: 12, color: COLORS.soft, marginTop: 2, fontFamily: FONTS.body },
  scorePill: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 24, borderRadius: 999, paddingHorizontal: 9 },
  scoreDot: { width: 6, height: 6, borderRadius: 3 },
  scorePillText: { fontSize: 11.5, fontWeight: '800', fontFamily: FONTS.bodyBold },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.softBlue,
    borderRadius: 13,
    height: 44,
  },
  viewAllButtonText: { fontSize: 13.5, fontWeight: '600', color: COLORS.navy, fontFamily: FONTS.bodySemi },
  howCard: { marginTop: 12 },
  howHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  howIcon: { marginTop: 2 },
  howTitleWrap: { flex: 1 },
  howTitle: { fontSize: 16, fontWeight: '700', color: COLORS.ink, fontFamily: FONTS.headline },
  howSub: { fontSize: 12, color: COLORS.soft, marginTop: 2, fontFamily: FONTS.body },
  howBody: { marginTop: 14 },
  howText: { color: COLORS.inkSoft, fontSize: 14, lineHeight: 20, fontFamily: FONTS.body },
  howRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
  },
  howRowLabel: { fontSize: 14, color: COLORS.ink, fontFamily: FONTS.bodySemi },
  howRowPts: { fontSize: 14, fontWeight: '800', color: COLORS.maroon, fontFamily: FONTS.bodyBold },
  bandRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 14 },
  bandItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  bandDot: { width: 10, height: 10, borderRadius: 5 },
  bandText: { fontSize: 12, color: COLORS.inkSoft, fontFamily: FONTS.bodySemi },
  disclaimer: { color: COLORS.soft, fontSize: 12, marginTop: 20, textAlign: 'center', fontFamily: FONTS.body },
});
