import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

import { isSupabaseConfigured, supabase } from '../src/lib/supabase';
import { COLORS, FONTS } from '../src/lib/theme';
import { Card, PrimaryButton, TextButton } from '../src/components/ui';
import { AuthShell } from '../src/components/AuthShell';
import { SetupNotice } from '../src/components/SetupNotice';

const EMAIL_RE = /^\S+@\S+\.\S+$/;

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const valid = EMAIL_RE.test(email.trim());

  const submit = async () => {
    setError('');
    if (!valid) {
      setError('Enter a valid email address.');
      return;
    }
    if (!isSupabaseConfigured || !supabase) {
      setError('Password reset is not connected yet — Supabase needs to be set up first.');
      return;
    }
    setBusy(true);
    try {
      const { error: authError } = await supabase.auth.resetPasswordForEmail(email.trim());
      if (authError) {
        setError(authError.message);
        return;
      }
      setSent(true);
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <AuthShell
        title="Reset link sent"
        sub="Check your inbox for the link to choose a new password. It can take a few minutes to arrive."
      >
        <PrimaryButton label="Back to log in" onPress={() => router.replace('/login')} />
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Reset Password" sub="Enter the email associated with your ScanRisk account and we will send a secure link to reset your password.">
      {!isSupabaseConfigured ? <SetupNotice compact /> : null}

      <Card>
        <Text style={styles.label}>Registered Account Email</Text>
        <View style={styles.emailRow}>
          <MaterialIcons name="mail-outline" size={20} color={COLORS.soft} />
          <TextInput
            style={styles.emailInput}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            placeholderTextColor={COLORS.placeholder}
            onSubmitEditing={submit}
          />
          {valid ? (
            <MaterialIcons name="check-circle" size={22} color={COLORS.green} />
          ) : null}
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={styles.buttonWrap}>
          <PrimaryButton
            label={busy ? 'Sending…' : 'Send Reset Link'}
            icon="arrow-forward"
            onPress={submit}
            disabled={busy}
          />
        </View>
      </Card>

      <View style={styles.links}>
        <TextButton label="Back to log in" onPress={() => router.replace('/login')} />
      </View>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 14, fontWeight: '700', marginTop: 12, fontFamily: FONTS.bodySemi, color: COLORS.ink },
  emailRow: {
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
  emailInput: { flex: 1, fontSize: 16, paddingVertical: 12, fontFamily: FONTS.body },
  error: { color: COLORS.danger, fontSize: 13, marginTop: 10, fontFamily: FONTS.body },
  buttonWrap: { marginTop: 18 },
  links: { marginTop: 8 },
});
