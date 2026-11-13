import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { FontAwesome, MaterialIcons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';

import { isSupabaseConfigured, supabase } from '../src/lib/supabase';
import { setGuest } from '../src/lib/session';
import { COLORS, FONTS } from '../src/lib/theme';
import { Card, OutlinedButton, PrimaryButton, TextButton } from '../src/components/ui';
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

  // Apple / Google sign-in via Supabase OAuth. Needs the Supabase project
  // configured AND 'scanrisk://auth' added as a redirect URL in the
  // Supabase dashboard; otherwise the buttons show the notice below.
  const oauth = async (provider: 'apple' | 'google') => {
    setError('');
    if (!isSupabaseConfigured || !supabase) {
      setError('Apple/Google sign-in is not connected yet — use guest mode for now.');
      return;
    }
    setBusy(true);
    try {
      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: 'scanrisk://auth', skipBrowserRedirect: true },
      });
      if (oauthError || !data?.url) {
        setError(oauthError?.message ?? 'Could not start sign-in.');
        return;
      }
      const res = await WebBrowser.openAuthSessionAsync(data.url, 'scanrisk://auth');
      if (res.type !== 'success' || !res.url) return; // User closed the browser.
      const code = new URL(res.url).searchParams.get('code');
      if (!code) {
        setError('Sign-in did not return a code. Try again.');
        return;
      }
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      if (exchangeError) {
        setError(exchangeError.message);
        return;
      }
      router.replace('/');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign-in failed.');
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
      {!isSupabaseConfigured ? <SetupNotice /> : null}

      <Card>
        <Text style={styles.label}>Email Address</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          placeholderTextColor={COLORS.placeholder}
        />
        <Text style={styles.label}>Password</Text>
        <View style={styles.passwordRow}>
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
        <TextButton label="Forgot password?" onPress={() => router.push('/forgot-password')} />
      </Card>

      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>OR CONTINUE WITH</Text>
        <View style={styles.dividerLine} />
      </View>

      <View style={styles.socialRow}>
        <Pressable style={styles.socialButton} onPress={() => oauth('apple')} disabled={busy}>
          <FontAwesome name="apple" size={22} color={COLORS.ink} />
          <Text style={styles.socialText}>Apple</Text>
        </Pressable>
        <Pressable style={styles.socialButton} onPress={() => oauth('google')} disabled={busy}>
          <FontAwesome name="google" size={20} color={COLORS.ink} />
          <Text style={styles.socialText}>Google</Text>
        </Pressable>
      </View>

      <OutlinedButton
        label="Continue as Guest"
        icon="qr-code-scanner"
        onPress={guest}
        style={styles.guestButton}
      />

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
  input: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.line,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 16,
    marginTop: 6,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontFamily: FONTS.body,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 18 },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.line },
  dividerText: { fontSize: 11, fontWeight: '800', color: COLORS.soft, letterSpacing: 1.2, fontFamily: FONTS.bodyBold },
  socialRow: { flexDirection: 'row', gap: 12 },
  socialButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.card,
    borderColor: COLORS.line,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 13,
  },
  socialText: { fontSize: 15, fontWeight: '700', color: COLORS.ink, fontFamily: FONTS.bodySemi },
  guestButton: { marginTop: 12 },
  trustRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 20 },
  trustItem: { alignItems: 'center', gap: 4 },
  trustText: { fontSize: 11.5, color: COLORS.soft, fontFamily: FONTS.bodySemi },
  links: { marginTop: 8 },
});
