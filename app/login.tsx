import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

import { isSupabaseConfigured, supabase } from '../src/lib/supabase';
import { setGuest } from '../src/lib/session';
import { COLORS, FONTS } from '../src/lib/theme';
import { Card, PrimaryButton, TextButton } from '../src/components/ui';
import { AuthShell } from '../src/components/AuthShell';
import { SetupNotice } from '../src/components/SetupNotice';

const EMAIL_RE = /^\S+@\S+\.\S+$/;

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError('');
    if (!EMAIL_RE.test(email.trim())) {
      setError('Enter a valid email address.');
      return;
    }
    if (!password) {
      setError('Enter your password.');
      return;
    }
    if (!isSupabaseConfigured || !supabase) {
      setError('Sign-in is not connected yet — use guest mode below for now.');
      return;
    }
    setBusy(true);
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (authError) {
        setError(
          authError.message === 'Invalid login credentials'
            ? 'Wrong email or password. Try again.'
            : authError.message,
        );
        return;
      }
      router.replace('/');
    } finally {
      setBusy(false);
    }
  };

  const guest = async () => {
    await setGuest();
    router.replace('/');
  };

  return (
    <AuthShell title="Welcome Back" sub="Sign in to access your saved food scans, allergen alerts, and risk logs.">
      {!isSupabaseConfigured ? <SetupNotice compact /> : null}

      <Card>
        <Text style={styles.label}>Email Address</Text>
        <View style={styles.field}>
          <MaterialIcons name="mail-outline" size={20} color={COLORS.soft} />
          <TextInput
            style={styles.fieldInput}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            placeholderTextColor={COLORS.placeholder}
          />
        </View>
        <View style={styles.passwordLabelRow}>
          <Text style={styles.label}>Password</Text>
          <Pressable onPress={() => router.push('/forgot-password')}>
            <Text style={styles.forgotLink}>Forgot password?</Text>
          </Pressable>
        </View>
        <View style={styles.passwordRow}>
          <MaterialIcons name="lock-outline" size={20} color={COLORS.soft} />
          <TextInput
            style={styles.passwordInput}
            value={password}
            onChangeText={setPassword}
            placeholder="Your password"
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
            placeholderTextColor={COLORS.placeholder}
            onSubmitEditing={submit}
          />
          <Pressable
            onPress={() => setShowPassword((v) => !v)}
            accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
          >
            <MaterialIcons name={showPassword ? 'visibility' : 'visibility-off'} size={22} color={COLORS.soft} />
          </Pressable>
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={styles.buttonWrap}>
          <PrimaryButton
            label={busy ? 'Signing in…' : 'Sign In'}
            icon="arrow-forward"
            onPress={submit}
            disabled={busy}
          />
        </View>
      </Card>

      <Pressable style={styles.guestRow} onPress={guest} accessibilityLabel="Continue as guest">
        <View style={styles.guestIconTile}>
          <MaterialIcons name="qr-code-scanner" size={22} color={COLORS.maroon} />
        </View>
        <View style={styles.guestText}>
          <Text style={styles.guestTitle}>Continue as Guest</Text>
          <Text style={styles.guestSub}>Instant barcode analysis • No account required</Text>
        </View>
        <View style={styles.instantBadge}>
          <Text style={styles.instantBadgeText}>INSTANT SCAN</Text>
        </View>
        <MaterialIcons name="chevron-right" size={20} color={COLORS.soft} />
      </Pressable>

      <View style={styles.trustRow}>
        <View style={styles.trustItem}>
          <MaterialIcons name="verified-user" size={18} color={COLORS.green} />
          <Text style={styles.trustText}>On-device scan</Text>
        </View>
        <View style={styles.trustItem}>
          <MaterialIcons name="health-and-safety" size={18} color={COLORS.green} />
          <Text style={styles.trustText}>Allergen alerts</Text>
        </View>
        <View style={styles.trustItem}>
          <MaterialIcons name="lock" size={18} color={COLORS.green} />
          <Text style={styles.trustText}>Private by design</Text>
        </View>
      </View>

      <View style={styles.links}>
        <TextButton label="Don't have an account? Create one" onPress={() => router.push('/register')} />
      </View>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 14, fontWeight: '700', marginTop: 12, fontFamily: FONTS.bodySemi, color: COLORS.ink },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.white,
    borderColor: COLORS.line,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 6,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  fieldInput: { flex: 1, fontSize: 16, fontFamily: FONTS.body },
  passwordLabelRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  forgotLink: { fontSize: 13, fontWeight: '700', color: COLORS.maroon, fontFamily: FONTS.bodySemi },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.white,
    borderColor: COLORS.line,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 6,
    paddingHorizontal: 12,
  },
  passwordInput: { flex: 1, fontSize: 16, paddingVertical: 12, fontFamily: FONTS.body },
  error: { color: COLORS.danger, fontSize: 13, marginTop: 10, fontFamily: FONTS.body },
  buttonWrap: { marginTop: 18 },
  guestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: COLORS.card,
    borderColor: COLORS.line,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 12,
    padding: 14,
  },
  guestIconTile: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: COLORS.maroonSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestText: { flex: 1 },
  guestTitle: { fontSize: 14, fontWeight: '700', color: COLORS.ink, fontFamily: FONTS.bodySemi },
  guestSub: { fontSize: 12, color: COLORS.soft, marginTop: 2, lineHeight: 16, fontFamily: FONTS.body },
  instantBadge: { backgroundColor: COLORS.amber, borderRadius: 999, paddingHorizontal: 5, paddingVertical: 4 },
  instantBadgeText: { fontSize: 9.5, fontWeight: '800', color: '#fff', letterSpacing: 0.5, fontFamily: FONTS.bodyBold },
  trustRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 20 },
  trustItem: { alignItems: 'center', gap: 4 },
  trustText: { fontSize: 11.5, color: COLORS.soft, fontFamily: FONTS.bodySemi },
  links: { marginTop: 8 },
});
