import { useCallback, useState } from 'react';
import { Image, Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Session } from '@supabase/supabase-js';

import BottomTabs from '../src/components/BottomTabs';
import { Card, PrimaryButton, SectionTitle, TextButton, Toast } from '../src/components/ui';
import { getSession, signOut } from '../src/lib/supabase';
import { clearGuest, clearOnboarding, isGuest } from '../src/lib/session';
import { clearHistory, getHistory } from '../src/lib/history';
import { clearProductCache } from '../src/lib/openfoodfacts';
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

export default function Profile() {
  const [session, setSession] = useState<Session | null>(null);
  const [guest, setGuestState] = useState(false);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [doneMsg, setDoneMsg] = useState('');
  const [toast, setToast] = useState('');
  const [scanCount, setScanCount] = useState(0);
  const [cleanPct, setCleanPct] = useState<number | null>(null);
  const [allergens, setAllergens] = useState<string[]>([]);
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
    ]).then(([s, g, history, selected, torch, tips]) => {
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
  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
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

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topBar}>
          <Image source={require('../assets/icon.png')} style={styles.logo} />
          <View>
            <Text style={styles.topBarTitle}>ScanRisk</Text>
            <Text style={styles.topBarSub}>PROFILE SETTINGS</Text>
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
              {guest ? <Text style={styles.email}>Guest mode — scans stay on this phone</Text> : null}
              {memberSince ? <Text style={styles.email}>Member since {memberSince}</Text> : null}
            </View>
          </View>
          {guest ? (
            <View style={styles.buttonWrap}>
              <PrimaryButton label="Sign in" onPress={() => router.push('/login')} />
            </View>
          ) : null}
        </Card>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{scanCount}</Text>
            <Text style={styles.statLabel}>Scans Logged</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{cleanPct != null ? `${cleanPct}%` : '—'}</Text>
            <Text style={styles.statLabel}>Clean Score</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{allergens.length}</Text>
            <Text style={styles.statLabel}>Allergens Tracked</Text>
          </View>
        </View>

        <SectionTitle sub="Get warned when a product contains one of these">
          Allergen alerts
        </SectionTitle>
        <Card>
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
        </Card>

        <SectionTitle>App preferences</SectionTitle>
        <Card>
          <SettingRow
            label="Replay onboarding"
            sub="See the intro screens again"
            confirming={confirming === 'onboarding'}
            onPress={() => runAction('onboarding', replayOnboarding, '')}
          />
          <ToggleRow
            label="Show Coach-Mark Tips Again"
            sub="Display helpful hints during scanning"
            value={tipsEnabled}
            onChange={onTipsToggle}
          />
          <ToggleRow
            label="Camera Torch Default"
            sub="Automatically turn the flashlight on when scanning"
            value={torchDefault}
            onChange={onTorchToggle}
          />
        </Card>

        <SectionTitle>Data &amp; storage</SectionTitle>
        <Card>
          <SettingRow
            label="Clear scan history"
            sub="Removes all past scans from this phone"
            danger
            confirming={confirming === 'history'}
            onPress={() =>
              runAction('history', async () => {
                await clearHistory();
                setScanCount(0);
                setCleanPct(null);
              }, 'Scan history cleared.')
            }
          />
          <SettingRow
            label="Clear cached products"
            sub="Removes saved product details"
            danger
            confirming={confirming === 'cache'}
            onPress={() => runAction('cache', clearProductCache, 'Cached product data cleared.')}
          />
        </Card>
        {doneMsg ? <Text style={styles.done}>{doneMsg}</Text> : null}

        <SectionTitle>About</SectionTitle>
        <Card>
          <Text style={styles.about}>Powered by Open Food Facts — open food data, ODbL licence.</Text>
          <Text style={styles.about}>Application Version 1.0.0</Text>
          <Pressable style={styles.linkRow} onPress={() => Linking.openURL(REPO_URL)}>
            <MaterialIcons name="code" size={20} color={COLORS.maroon} />
            <Text style={styles.linkText}>View source on GitHub</Text>
          </Pressable>
          <Text style={styles.about}>
            Guidance score from label data — not medical advice.
          </Text>
        </Card>

        <View style={styles.signOutWrap}>
          {session ? (
            <PrimaryButton label="Sign out" onPress={doSignOut} />
          ) : guest ? (
            <PrimaryButton label="Exit guest mode" onPress={exitGuest} />
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

function SettingRow({
  label,
  sub,
  danger,
  confirming,
  onPress,
}: {
  label: string;
  sub: string;
  danger?: boolean;
  confirming: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, danger && styles.rowLabelDanger]}>{label}</Text>
        <Text style={styles.rowSub}>{sub}</Text>
      </View>
      <Text style={styles.rowAction}>{confirming ? 'Tap again to confirm' : '›'}</Text>
    </Pressable>
  );
}

function ToggleRow({
  label,
  sub,
  value,
  onChange,
}: {
  label: string;
  sub: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowSub}>{sub}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: COLORS.line, true: COLORS.maroon }}
        thumbColor="#fff"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 20, paddingBottom: 24 },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  logo: { width: 40, height: 40, borderRadius: 10 },
  topBarTitle: { fontSize: 20, fontWeight: '700', color: COLORS.ink, fontFamily: FONTS.headline },
  topBarSub: { fontSize: 10.5, fontWeight: '800', color: COLORS.soft, letterSpacing: 1.4, fontFamily: FONTS.bodyBold },
  accountCard: { marginBottom: 4 },
  accountRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    alignItems: 'center',
    backgroundColor: COLORS.maroon,
    borderRadius: 999,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  avatarText: { color: '#fff', fontSize: 24, fontWeight: '800', fontFamily: FONTS.headline },
  accountText: { flex: 1, marginLeft: 14 },
  name: { fontSize: 19, fontWeight: '700', color: COLORS.ink, fontFamily: FONTS.headline },
  email: { color: COLORS.soft, fontSize: 13, marginTop: 2, fontFamily: FONTS.body },
  buttonWrap: { marginTop: 16 },
  statsRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  stat: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderColor: COLORS.line,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 2,
  },
  statValue: { color: COLORS.ink, fontSize: 20, fontWeight: '800', fontFamily: FONTS.headline },
  statLabel: { color: COLORS.soft, fontSize: 12, fontFamily: FONTS.bodySemi },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9 },
  checkLabel: { fontSize: 15, fontWeight: '600', color: COLORS.ink, fontFamily: FONTS.bodySemi },
  row: {
    alignItems: 'center',
    borderBottomColor: COLORS.line,
    borderBottomWidth: 1,
    flexDirection: 'row',
    paddingVertical: 12,
  },
  rowText: { flex: 1 },
  rowLabel: { fontSize: 15, fontWeight: '700', color: COLORS.ink, fontFamily: FONTS.bodySemi },
  rowLabelDanger: { color: COLORS.danger },
  rowSub: { color: COLORS.soft, fontSize: 12, marginTop: 2, fontFamily: FONTS.body },
  rowAction: { color: COLORS.soft, fontSize: 15, fontWeight: '700' },
  done: { color: COLORS.good, fontSize: 13, fontWeight: '700', marginTop: 10, textAlign: 'center', fontFamily: FONTS.bodySemi },
  about: { color: COLORS.inkSoft, fontSize: 14, lineHeight: 20, marginBottom: 8, fontFamily: FONTS.body },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  linkText: { color: COLORS.maroon, fontSize: 14, fontWeight: '700', fontFamily: FONTS.bodySemi },
  signOutWrap: { marginTop: 24 },
});
