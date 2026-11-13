import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Session } from '@supabase/supabase-js';

import { getSession, signOut } from '../src/lib/supabase';
import { clearGuest, clearOnboarding, isGuest } from '../src/lib/session';
import { clearHistory } from '../src/lib/history';
import { clearProductCache } from '../src/lib/openfoodfacts';
import { resetTips } from '../src/lib/tips';
import { COLORS, SERIF } from '../src/lib/theme';
import { Card, PrimaryButton, SectionTitle, TextButton } from '../src/components/ui';

export default function Profile() {
  const [session, setSession] = useState<Session | null>(null);
  const [guest, setGuestState] = useState(false);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [doneMsg, setDoneMsg] = useState('');

  const load = useCallback(() => {
    Promise.all([getSession(), isGuest()]).then(([s, g]) => {
      setSession(s);
      setGuestState(g);
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

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safe}>
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card>
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

      <SectionTitle>Settings</SectionTitle>
      <Card>
        <SettingRow
          label="Replay onboarding"
          sub="See the intro screens again"
          confirming={confirming === 'onboarding'}
          onPress={() => runAction('onboarding', replayOnboarding, '')}
        />
        <SettingRow
          label="Show tips again"
          sub="Bring back the coach-mark hints"
          confirming={confirming === 'tips'}
          onPress={() => runAction('tips', resetTips, 'Tips will show again on your next visit.')}
        />
        <SettingRow
          label="Clear scan history"
          sub="Removes all past scans from this phone"
          danger
          confirming={confirming === 'history'}
          onPress={() => runAction('history', clearHistory, 'Scan history cleared.')}
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
        <Text style={styles.about}>
          ScanRisk 1.0.0 — scan a barcode, see a 0–50 risk score with every point explained.
        </Text>
        <Text style={styles.about}>
          Product data: Open Food Facts (open data, ODbL). Guidance score from label data — not
          medical advice.
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

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  accountRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    alignItems: 'center',
    backgroundColor: COLORS.maroon,
    borderRadius: 999,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  avatarText: { color: '#FFF7E8', fontSize: 24, fontWeight: '800', fontFamily: SERIF },
  accountText: { flex: 1, marginLeft: 14 },
  name: { fontSize: 19, fontWeight: '700', fontFamily: SERIF },
  email: { color: COLORS.soft, fontSize: 13, marginTop: 2 },
  buttonWrap: { marginTop: 16 },
  row: {
    alignItems: 'center',
    borderBottomColor: COLORS.line,
    borderBottomWidth: 1,
    flexDirection: 'row',
    paddingVertical: 12,
  },
  rowText: { flex: 1 },
  rowLabel: { fontSize: 15, fontWeight: '700' },
  rowLabelDanger: { color: COLORS.danger },
  rowSub: { color: COLORS.soft, fontSize: 12, marginTop: 2 },
  rowAction: { color: COLORS.soft, fontSize: 15, fontWeight: '700' },
  done: { color: COLORS.good, fontSize: 13, fontWeight: '700', marginTop: 10, textAlign: 'center' },
  about: { color: COLORS.inkSoft, fontSize: 14, lineHeight: 20, marginBottom: 8 },
  signOutWrap: { marginTop: 24 },
});
