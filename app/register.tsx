import { useState } from 'react';
import { Image, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
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
      ? { label: 'OPTIMAL', color: COLORS.green, pillBg: COLORS.paleGreen }
      : passed === 2
        ? { label: 'Good', color: COLORS.amberDeep, pillBg: COLORS.paleAmber }
        : passed === 1
          ? { label: 'Fair', color: COLORS.amberDeep, pillBg: COLORS.paleAmber }
          : { label: 'Weak', color: COLORS.danger, pillBg: COLORS.dangerBg };
  // 4 segments: all four fill only when every check passes.
  const filledSegments = passed === 3 ? 4 : passed;
  const segmentColor = passed === 3 ? COLORS.green : passed > 0 ? COLORS.amber : COLORS.line;

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
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Image source={require('../assets/icon.png')} style={styles.logo} />
          <Text style={styles.brand}>ScanRisk</Text>
        </View>

        {!isSupabaseConfigured ? <SetupNotice compact /> : null}

        <Card style={styles.titleCard}>
          <Text style={styles.title}>Create Your ScanRisk Account</Text>
          <Text style={styles.sub}>
            Start making informed, healthy grocery choices today with real-time nutritional
            intelligence.
          </Text>
        </Card>

        <View style={[styles.fieldLabelRow, styles.firstField]}>
          <Text style={styles.fieldLabel}>Full Name</Text>
          <Text style={styles.fieldHint}>Required</Text>
        </View>
        <View style={styles.field}>
          <MaterialIcons name="person-outline" size={20} color={COLORS.soft} />
          <TextInput
            style={styles.fieldInput}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Sarah Jenkins"
            autoCapitalize="words"
            placeholderTextColor={COLORS.placeholder}
          />
        </View>

        <View style={styles.fieldLabelRow}>
          <Text style={styles.fieldLabel}>Email Address</Text>
          <Text style={styles.fieldHint}>Institutional / Personal</Text>
        </View>
        <View style={styles.field}>
          <MaterialIcons name="alternate-email" size={20} color={COLORS.soft} />
          <TextInput
            style={styles.fieldInput}
            value={email}
            onChangeText={setEmail}
            placeholder="sarah@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            placeholderTextColor={COLORS.placeholder}
          />
        </View>

        <View style={styles.fieldLabelRow}>
          <Text style={styles.fieldLabel}>Password</Text>
          <View style={[styles.strengthPill, { backgroundColor: strength.pillBg }]}>
            <Text style={[styles.strengthPillText, { color: strength.color }]}>
              {strength.label}
            </Text>
          </View>
        </View>
        <View style={styles.field}>
          <MaterialIcons name="lock-outline" size={20} color={COLORS.soft} />
          <TextInput
            style={styles.fieldInput}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
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

        <View style={styles.strengthWrap}>
          <View style={styles.strengthBars}>
            {[0, 1, 2, 3].map((i) => (
              <View
                key={i}
                style={[
                  styles.strengthBar,
                  { backgroundColor: i < filledSegments ? segmentColor : COLORS.line },
                ]}
              />
            ))}
          </View>
          <View style={styles.checksRow}>
            {STRENGTH_CHECKS.map((c) => {
              const ok = c.test(password);
              return (
                <View
                  key={c.id}
                  style={[styles.checkPill, { backgroundColor: ok ? COLORS.paleGreen : '#F1F5F9' }]}
                >
                  <MaterialIcons
                    name={ok ? 'check-circle' : 'radio-button-unchecked'}
                    size={16}
                    color={ok ? COLORS.green : COLORS.soft}
                  />
                  <Text style={[styles.checkText, { color: ok ? COLORS.green : COLORS.inkSoft }]}>
                    {c.label}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

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
            icon="lock"
            onPress={submit}
            disabled={busy}
          />
        </View>

        <View style={styles.signinRow}>
          <Text style={styles.signinText}>Already an active subscriber? </Text>
          <Pressable onPress={() => router.replace('/login')}>
            <Text style={styles.signinLink}>Sign In</Text>
          </Pressable>
        </View>
        <TextButton label="Continue as guest" onPress={guest} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: { width: 44, height: 44, borderRadius: 12 },
  brand: { fontSize: 24, fontWeight: '700', color: COLORS.ink, fontFamily: FONTS.headline },
  titleCard: { marginTop: 20 },
  title: { fontSize: 30, fontWeight: '700', color: COLORS.ink, fontFamily: FONTS.headline, lineHeight: 36 },
  sub: { fontSize: 16, color: COLORS.inkSoft, marginTop: 10, lineHeight: 24, fontFamily: FONTS.body },
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 8,
  },
  firstField: { marginTop: 24 },
  fieldLabel: { fontSize: 15, fontWeight: '700', color: COLORS.ink, fontFamily: FONTS.bodySemi },
  fieldHint: { fontSize: 13, color: COLORS.soft, fontFamily: FONTS.body },
  strengthPill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  strengthPillText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5, fontFamily: FONTS.bodyBold },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.card,
    borderColor: COLORS.line,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    shadowColor: '#171321',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  fieldInput: { flex: 1, fontSize: 16, color: COLORS.ink, fontFamily: FONTS.body },
  strengthWrap: { marginTop: 14 },
  strengthBars: { flexDirection: 'row', gap: 6 },
  strengthBar: { flex: 1, height: 6, borderRadius: 999 },
  checksRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  checkPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  checkText: { fontSize: 12.5, fontWeight: '600', fontFamily: FONTS.bodySemi },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: COLORS.softBlue,
    borderRadius: 14,
    marginTop: 20,
    padding: 14,
  },
  termsText: { flex: 1, fontSize: 14, color: COLORS.inkSoft, lineHeight: 20, fontFamily: FONTS.body },
  error: { color: COLORS.danger, fontSize: 13, marginTop: 12, fontFamily: FONTS.body },
  buttonWrap: { marginTop: 20 },
  signinRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  signinText: { fontSize: 14, color: COLORS.inkSoft, fontFamily: FONTS.body },
  signinLink: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.ink,
    textDecorationLine: 'underline',
    fontFamily: FONTS.bodySemi,
  },
});
