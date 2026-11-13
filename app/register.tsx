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

const STRENGTH_CHECKS = [
  { id: 'length', label: '8+ chars', test: (p: string) => p.length >= 8 },
  { id: 'number', label: 'Numbers', test: (p: string) => /\d/.test(p) },
  { id: 'symbol', label: 'Symbols (!@#$)', test: (p: string) => /[!@#$%^&*(),.?":{}|<>_\-+=\\[\]/`'~;]/.test(p) },
] as const;

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [terms, setTerms] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const passed = STRENGTH_CHECKS.filter((c) => c.test(password)).length;
  const strength =
    passed === 3
      ? { label: 'OPTIMAL', color: COLORS.green }
      : passed === 2
        ? { label: 'Good', color: COLORS.amber }
        : passed === 1
          ? { label: 'Fair', color: COLORS.amber }
          : { label: 'Weak', color: COLORS.danger };

  const submit = async () => {
    setError('');
    if (!name.trim()) {
      setError('Enter your name.');
      return;
    }
    if (!EMAIL_RE.test(email.trim())) {
      setError('Enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (!terms) {
      setError('Please accept the Terms of Service to continue.');
      return;
    }
    if (!isSupabaseConfigured || !supabase) {
      setError('Sign-up is not connected yet — use guest mode for now.');
      return;
    }
    setBusy(true);
    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { full_name: name.trim() } },
      });
      if (authError) {
        setError(
          authError.message === 'User already registered'
            ? 'An account with this email already exists. Try logging in.'
            : authError.message,
        );
        return;
      }
      if (data.session) {
        router.replace('/');
      } else {
        setSent(true);
      }
    } finally {
      setBusy(false);
    }
  };

  const guest = async () => {
    await setGuest();
    router.replace('/');
  };

  if (sent) {
    return (
      <AuthShell
        title="Check your inbox"
        sub={`We sent a confirmation link to ${email.trim()}. Tap it, then log in here.`}
      >
        <PrimaryButton label="Back to log in" onPress={() => router.replace('/login')} />
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Create an account" sub="Start making informed, healthy grocery choices today.">
      {!isSupabaseConfigured ? <SetupNotice /> : null}

      <Card>
        <Text style={styles.label}>Full Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Your name"
          autoCapitalize="words"
          placeholderTextColor={COLORS.placeholder}
        />
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
            placeholder="At least 6 characters"
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

        {password.length > 0 ? (
          <View style={styles.strengthWrap}>
            <View style={styles.strengthBars}>
              {[0, 1, 2].map((i) => (
                <View
                  key={i}
                  style={[
                    styles.strengthBar,
                    { backgroundColor: i < passed ? strength.color : COLORS.line },
                  ]}
                />
              ))}
            </View>
            <Text style={[styles.strengthLabel, { color: strength.color }]}>{strength.label}</Text>
            <View style={styles.checksRow}>
              {STRENGTH_CHECKS.map((c) => (
                <View key={c.id} style={styles.checkItem}>
                  <MaterialIcons
                    name={c.test(password) ? 'check-circle' : 'radio-button-unchecked'}
                    size={16}
                    color={c.test(password) ? COLORS.green : COLORS.soft}
                  />
                  <Text style={styles.checkText}>{c.label}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        <Pressable style={styles.termsRow} onPress={() => setTerms((t) => !t)}>
          <MaterialIcons
            name={terms ? 'check-box' : 'check-box-outline-blank'}
            size={24}
            color={terms ? COLORS.maroon : COLORS.soft}
          />
          <Text style={styles.termsText}>
            I agree to the Terms of Service and Privacy Policy.
          </Text>
        </Pressable>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={styles.buttonWrap}>
          <PrimaryButton
            label={busy ? 'Creating…' : 'Create Account'}
            icon="lock-person"
            onPress={submit}
            disabled={busy}
          />
        </View>
      </Card>

      <View style={styles.links}>
        <TextButton label="Already have an account? Log in" onPress={() => router.replace('/login')} />
        <TextButton label="Continue as guest" onPress={guest} />
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
  strengthWrap: { marginTop: 12 },
  strengthBars: { flexDirection: 'row', gap: 6 },
  strengthBar: { flex: 1, height: 6, borderRadius: 999 },
  strengthLabel: { fontSize: 12, fontWeight: '800', letterSpacing: 1, marginTop: 6, fontFamily: FONTS.bodyBold },
  checksRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 },
  checkItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  checkText: { fontSize: 12.5, color: COLORS.inkSoft, fontFamily: FONTS.bodySemi },
  termsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 16 },
  termsText: { flex: 1, fontSize: 13.5, color: COLORS.inkSoft, lineHeight: 19, fontFamily: FONTS.body },
  error: { color: COLORS.danger, fontSize: 13, marginTop: 10, fontFamily: FONTS.body },
  buttonWrap: { marginTop: 18 },
  links: { marginTop: 8 },
});
