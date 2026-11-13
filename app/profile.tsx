// Profile & Settings — rebuilt to the Stitch "NutriScan Profile Settings"
// frame (13 Nov 2026): top bar with bell + avatar, identity card, pale
// stats card, collapsible Allergen Alerts row, preference rows with icon
// tiles and custom toggles, data & storage rows, About card. All numbers
// are real (history count, low-risk share, selected allergens, measured
// cache size); nothing here is demo data — no Pro badge, no fake sync line,
// no invented build number, no Privacy/Terms links (those docs don't exist).

import { useCallback, useState } from 'react';
import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Session } from '@supabase/supabase-js';

import BottomTabs from '../src/components/BottomTabs';
import { Card, TextButton, Toast } from '../src/components/ui';
import { getSession, signOut } from '../src/lib/supabase';
import { clearGuest, clearOnboarding, isGuest } from '../src/lib/session';
import { clearHistory, getHistory } from '../src/lib/history';
import { clearProductCache, getProductCacheSizeBytes } from '../src/lib/openfoodfacts';
import { getSelectedAllergens, setSelectedAllergens, ALLERGENS } from '../src/lib/allergens';
import {
  getTipsEnabled,
  getTorchDefault,
  setTipsEnabled,
  setTorchDefault,
} from '../src/lib/settings';
import { resetTips } from '../src/lib/tips';
import { COLORS, FONTS } from '../src/lib/theme';

const REPO_URL = 'https://github.com/Bhagirihi/Food_ScanRisk';
const APP_VERSION = 'v1.0.0';

type IconName = keyof typeof MaterialIcons.glyphMap;

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

export default function Profile() {
  const [session, setSession] = useState<Session | null>(null);
  const [guest, setGuestState] = useState(false);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [doneMsg, setDoneMsg] = useState('');
  const [toast, setToast] = useState('');
  const [scanCount, setScanCount] = useState(0);
  const [cleanPct, setCleanPct] = useState<number | null>(null);
  const [allergens, setAllergens] = useState<string[]>([]);
  const [allergensExpanded, setAllergensExpanded] = useState(false);
  const [cacheSizeBytes, setCacheSizeBytes] = useState<number | null>(null);
  const [torchDefault, setTorchDefaultState] = useState(false);
  const [tipsEnabled, setTipsEnabledState] = useState(true);

  const load = useCallback(() => {
    Promise.all([
      getSession(),
      isGuest(),
      getHistory(),
      getSelectedAllergens(),
      getTorchDefault(),
      getTipsEnabled(),
      getProductCacheSizeBytes(),
    ]).then(([s, g, history, selected, torch, tips, cacheBytes]) => {
      setSession(s);
      setGuestState(g);
      setScanCount(history.length);
      setCleanPct(
        history.length > 0
          ? Math.round((history.filter((r) => r.band === 'low').length / history.length) * 100)
          : null,
      );
      setAllergens(selected);
      setTorchDefaultState(torch);
      setTipsEnabledState(tips);
      setCacheSizeBytes(cacheBytes);
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const user = session?.user;
  const meta = (user?.user_metadata ?? {}) as { full_name?: string };
  const displayName = meta.full_name || (user?.email ? user.email.split('@')[0] : 'Guest');
  // Only a real account creation date is shown — never invented.
  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
    : null;

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const runAction = async (id: string, fn: () => Promise<void>, msg: string) => {
    if (confirming !== id) {
      setConfirming(id);
      setDoneMsg('');
      return;
    }
    setConfirming(null);
    await fn();
    setDoneMsg(msg);
  };

  const replayOnboarding = async () => {
    await clearOnboarding();
    router.replace('/onboarding');
  };

  const doSignOut = async () => {
    await signOut();
    router.replace('/login');
  };

  const exitGuest = async () => {
    await clearGuest();
    router.replace('/login');
  };

  const toggleAllergen = async (id: string) => {
    const next = allergens.includes(id) ? allergens.filter((a) => a !== id) : [...allergens, id];
    setAllergens(next);
    await setSelectedAllergens(next);
  };

  const onTipsToggle = async (value: boolean) => {
    setTipsEnabledState(value);
    await setTipsEnabled(value);
    if (value) await resetTips();
    showToast('Settings updated');
  };

  const onTorchToggle = async (value: boolean) => {
    setTorchDefaultState(value);
    await setTorchDefault(value);
    showToast('Settings updated');
  };

  const selectedLabels = ALLERGENS.filter((a) => allergens.includes(a.id)).map((a) => a.label);
  const cacheSizeText = cacheSizeBytes != null && cacheSizeBytes > 0 ? formatBytes(cacheSizeBytes) : null;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topBar}>
          <View style={styles.topBarLeft}>
            <Image source={require('../assets/icon.png')} style={styles.logo} />
            <View>
              <Text style={styles.topBarTitle}>ScanRisk</Text>
              <Text style={styles.topBarSub}>PROFILE SETTINGS</Text>
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
            <View style={styles.topAvatar}>
              <Text style={styles.topAvatarText}>{displayName.charAt(0).toUpperCase()}</Text>
            </View>
          </View>
        </View>

        <Card style={styles.accountCard}>
          <View style={styles.accountRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{displayName.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={styles.accountText}>
              <Text style={styles.name}>{displayName}</Text>
              {user?.email ? <Text style={styles.email}>{user.email}</Text> : null}
              {guest ? (
                <Text style={styles.email}>Guest mode — scans stay on this phone</Text>
              ) : null}
              {memberSince ? (
                <View style={styles.memberRow}>
                  <MaterialIcons name="calendar-today" size={13} color={COLORS.soft} />
                  <Text style={styles.email}>Member since {memberSince}</Text>
                </View>
              ) : null}
            </View>
          </View>
        </Card>

        <View style={styles.statsCard}>
          <View style={styles.statCol}>
            <Text style={[styles.statValue, { color: COLORS.ink }]}>{scanCount}</Text>
            <Text style={styles.statLabel}>Scans Logged</Text>
          </View>
          <View style={[styles.statCol, styles.statDivider]}>
            <Text style={[styles.statValue, { color: COLORS.amberDeep }]}>
              {cleanPct != null ? `${cleanPct}%` : '—'}
            </Text>
            <Text style={styles.statLabel}>Clean Score</Text>
          </View>
          <View style={[styles.statCol, styles.statDivider]}>
            <Text style={[styles.statValue, { color: COLORS.green }]}>{allergens.length}</Text>
            <Text style={styles.statLabel}>Allergens Tracked</Text>
          </View>
        </View>

        <Card style={styles.rowCard}>
          <Pressable
            style={styles.row}
            onPress={() => setAllergensExpanded((e) => !e)}
            accessibilityRole="button"
            accessibilityState={{ expanded: allergensExpanded }}
          >
            <IconTile bg={COLORS.greenSoft} color={COLORS.green} icon="shield" />
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>Allergen Alerts</Text>
              <Text style={styles.rowSub} numberOfLines={2}>
                {allergens.length > 0
                  ? `${allergens.length} selected: ${selectedLabels.join(', ')}`
                  : 'None selected — tap to choose'}
              </Text>
            </View>
            <MaterialIcons
              name={allergensExpanded ? 'expand-less' : 'expand-more'}
              size={24}
              color={COLORS.soft}
            />
          </Pressable>
          {allergensExpanded ? (
            <View style={styles.expanded}>
              {ALLERGENS.map((a) => (
                <Pressable key={a.id} style={styles.checkRow} onPress={() => toggleAllergen(a.id)}>
                  <MaterialIcons
                    name={allergens.includes(a.id) ? 'check-box' : 'check-box-outline-blank'}
                    size={24}
                    color={allergens.includes(a.id) ? COLORS.maroon : COLORS.soft}
                  />
                  <Text style={styles.checkLabel}>{a.label}</Text>
                </Pressable>
              ))}
              <Text style={styles.expandedNote}>
                We warn you on the Result screen when a product contains one of these.
              </Text>
            </View>
          ) : null}
        </Card>

        <SectionHeader icon="tune">APP PREFERENCES &amp; EXPERIENCE</SectionHeader>
        <Card style={styles.rowCard}>
          <Pressable
            style={styles.row}
            onPress={() => runAction('onboarding', replayOnboarding, '')}
          >
            <IconTile bg={COLORS.paleBlue} color={COLORS.navy} icon="replay" />
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>Replay Onboarding Walkthrough</Text>
              <Text style={styles.rowSub}>
                Review barcode scanning gestures and camera alignment tips
              </Text>
            </View>
            {confirming === 'onboarding' ? (
              <Text style={styles.confirmText}>Tap again to confirm</Text>
            ) : (
              <MaterialIcons name="chevron-right" size={22} color={COLORS.soft} />
            )}
          </Pressable>
          <View style={[styles.row, styles.rowDivider]}>
            <IconTile bg={COLORS.paleBlue} color={COLORS.navy} icon="lightbulb-outline" />
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>Show Coach-Mark Tips Again</Text>
              <Text style={styles.rowSub}>
                Display helpful dietary insight bubbles during camera focus
              </Text>
            </View>
            <CustomToggle value={tipsEnabled} onChange={onTipsToggle} />
          </View>
          <View style={[styles.row, styles.rowDivider]}>
            <IconTile bg={COLORS.paleBlue} color={COLORS.navy} icon="flash-on" />
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>Camera Torch Default</Text>
              <Text style={styles.rowSub}>
                Automatically engage flashlight in low-light grocery aisles
              </Text>
            </View>
            <CustomToggle value={torchDefault} onChange={onTorchToggle} />
          </View>
        </Card>

        <SectionHeader icon="storage">DATA &amp; STORAGE MANAGEMENT</SectionHeader>
        <Card style={styles.rowCard}>
          <Pressable
            style={styles.row}
            onPress={() =>
              runAction('history', async () => {
                await clearHistory();
                setScanCount(0);
                setCleanPct(null);
              }, 'Scan history cleared.')
            }
          >
            <IconTile bg={COLORS.paleRed} color={COLORS.red} icon="delete-sweep" />
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>Clear Scan History</Text>
              <Text style={[styles.rowSub, styles.rowSubDanger]}>
                Removes local log of {scanCount} item{scanCount === 1 ? '' : 's'}
              </Text>
            </View>
            {confirming === 'history' ? (
              <Text style={styles.confirmText}>Tap again to confirm</Text>
            ) : (
              <MaterialIcons name="chevron-right" size={22} color={COLORS.soft} />
            )}
          </Pressable>
          <Pressable
            style={[styles.row, styles.rowDivider]}
            onPress={() =>
              runAction('cache', async () => {
                await clearProductCache();
                setCacheSizeBytes(0);
              }, 'Cached product data cleared.')
            }
          >
            <IconTile bg={COLORS.paleBlue} color={COLORS.navy} icon="cached" />
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>Clear Cached Products</Text>
              <Text style={styles.rowSub}>
                {cacheSizeText ? `Frees ${cacheSizeText} of offline database` : 'Removes saved product details'}
              </Text>
            </View>
            {confirming === 'cache' ? (
              <Text style={styles.confirmText}>Tap again to confirm</Text>
            ) : cacheSizeText ? (
              <View style={styles.sizePill}>
                <Text style={styles.sizePillText}>{cacheSizeText}</Text>
              </View>
            ) : null}
          </Pressable>
        </Card>
        {doneMsg ? <Text style={styles.done}>{doneMsg}</Text> : null}

        <SectionHeader icon="info-outline">ABOUT &amp; ATTRIBUTION</SectionHeader>
        <Card style={styles.rowCard}>
          <View style={styles.row}>
            <IconTile bg={COLORS.amberSoft} color={COLORS.amber} icon="restaurant" />
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>Powered by Open Food Facts</Text>
              <Text style={styles.rowSub}>Global open nutritional telemetry</Text>
            </View>
          </View>
          <View style={[styles.row, styles.rowDivider]}>
            <Text style={styles.versionLabel}>Application Version</Text>
            <View style={styles.sizePill}>
              <Text style={styles.sizePillText}>{APP_VERSION}</Text>
            </View>
          </View>
          <Pressable
            style={[styles.linkRow, styles.rowDivider]}
            onPress={() => Linking.openURL(REPO_URL)}
          >
            <Text style={styles.linkText}>Open Source</Text>
            <MaterialIcons name="open-in-new" size={18} color={COLORS.soft} />
          </Pressable>
        </Card>

        <View style={styles.signOutWrap}>
          {session ? (
            <Pressable style={styles.signOutButton} onPress={doSignOut}>
              <MaterialIcons name="logout" size={20} color={COLORS.ink} />
              <Text style={styles.signOutText}>Sign Out</Text>
            </Pressable>
          ) : guest ? (
            <Pressable style={styles.exitGuestLink} onPress={exitGuest}>
              <MaterialIcons name="switch-account" size={18} color={COLORS.soft} />
              <Text style={styles.exitGuestText}>Exit Guest Mode / Switch Account</Text>
            </Pressable>
          ) : (
            <TextButton label="Sign in" onPress={() => router.push('/login')} />
          )}
        </View>
      </ScrollView>
      <BottomTabs active="profile" />
      {toast ? <Toast message={toast} /> : null}
    </SafeAreaView>
  );
}

function SectionHeader({ icon, children }: { icon: IconName; children: string }) {
  return (
    <View style={styles.sectionHeader}>
      <MaterialIcons name={icon} size={18} color={COLORS.ink} />
      <Text style={styles.sectionHeaderText}>{children}</Text>
    </View>
  );
}

function IconTile({ bg, color, icon }: { bg: string; color: string; icon: IconName }) {
  return (
    <View style={[styles.iconTile, { backgroundColor: bg }]}>
      <MaterialIcons name={icon} size={22} color={color} />
    </View>
  );
}

/** Custom toggle — dark maroon track + white knob when ON, pale grey-blue
 * track when OFF. (Native Switch renders its own teal knob on some
 * platforms, so the design is built by hand.) */
function CustomToggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <Pressable
      onPress={() => onChange(!value)}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      style={[styles.toggle, value ? styles.toggleOn : styles.toggleOff]}
    >
      <View style={styles.knob} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 20, paddingBottom: 24 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  topBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: { width: 40, height: 40, borderRadius: 10 },
  topBarTitle: { fontSize: 20, fontWeight: '700', color: COLORS.ink, fontFamily: FONTS.headline },
  topBarSub: { fontSize: 10.5, fontWeight: '800', color: COLORS.soft, letterSpacing: 1.4, fontFamily: FONTS.bodyBold },
  topBarRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconButton: { padding: 6 },
  topAvatar: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: COLORS.maroon,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topAvatarText: { color: '#fff', fontSize: 17, fontWeight: '800', fontFamily: FONTS.headline },
  accountCard: { marginBottom: 12 },
  accountRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    alignItems: 'center',
    backgroundColor: COLORS.maroon,
    borderRadius: 999,
    height: 64,
    justifyContent: 'center',
    width: 64,
  },
  avatarText: { color: '#fff', fontSize: 26, fontWeight: '800', fontFamily: FONTS.headline },
  accountText: { flex: 1, marginLeft: 14 },
  name: { fontSize: 20, fontWeight: '700', color: COLORS.ink, fontFamily: FONTS.headline },
  email: { color: COLORS.soft, fontSize: 13, marginTop: 2, fontFamily: FONTS.body },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.softBlue,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  statCol: { flex: 1, alignItems: 'center', gap: 2 },
  statDivider: { borderLeftWidth: 1, borderLeftColor: '#D5E0F2' },
  statValue: { fontSize: 22, fontWeight: '800', fontFamily: FONTS.headline },
  statLabel: { color: COLORS.navy, fontSize: 12, fontFamily: FONTS.bodySemi },
  rowCard: { paddingVertical: 6, paddingHorizontal: 16 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 26,
    marginBottom: 10,
  },
  sectionHeaderText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: COLORS.navy,
    fontFamily: FONTS.bodyBold,
  },
  iconTile: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  rowDivider: { borderTopWidth: 1, borderTopColor: COLORS.line },
  rowText: { flex: 1 },
  rowLabel: { fontSize: 16, fontWeight: '700', color: COLORS.ink, fontFamily: FONTS.bodySemi },
  rowSub: { color: COLORS.soft, fontSize: 13, lineHeight: 18, marginTop: 2, fontFamily: FONTS.body },
  rowSubDanger: { color: COLORS.danger },
  confirmText: { color: COLORS.danger, fontSize: 13, fontWeight: '700', fontFamily: FONTS.bodySemi },
  expanded: { borderTopWidth: 1, borderTopColor: COLORS.line, paddingTop: 6, paddingBottom: 6 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9 },
  checkLabel: { fontSize: 15, fontWeight: '600', color: COLORS.ink, fontFamily: FONTS.bodySemi },
  expandedNote: { color: COLORS.soft, fontSize: 12, lineHeight: 17, marginTop: 6, fontFamily: FONTS.body },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 999,
    justifyContent: 'center',
  },
  toggleOn: { backgroundColor: COLORS.maroon, alignItems: 'flex-end', paddingRight: 3 },
  toggleOff: { backgroundColor: '#D8DEE9', alignItems: 'flex-start', paddingLeft: 3 },
  knob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
    elevation: 2,
  },
  sizePill: {
    backgroundColor: COLORS.paleBlue,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  sizePillText: { color: COLORS.navy, fontSize: 12, fontWeight: '700', fontFamily: FONTS.bodySemi },
  versionLabel: { flex: 1, fontSize: 15, color: COLORS.ink, fontFamily: FONTS.body },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  linkText: { color: COLORS.navy, fontSize: 15, fontWeight: '700', fontFamily: FONTS.bodySemi },
  done: { color: COLORS.good, fontSize: 13, fontWeight: '700', marginTop: 10, textAlign: 'center', fontFamily: FONTS.bodySemi },
  signOutWrap: { marginTop: 24 },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.card,
    borderColor: COLORS.line,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 15,
  },
  signOutText: { color: COLORS.ink, fontSize: 16, fontWeight: '700', fontFamily: FONTS.bodySemi },
  exitGuestLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  exitGuestText: { color: COLORS.soft, fontSize: 14, fontWeight: '600', fontFamily: FONTS.bodySemi },
});
