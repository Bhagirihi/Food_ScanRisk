import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';

import { isSupabaseConfigured, supabase } from '../src/lib/supabase';
import { COLORS } from '../src/lib/theme';
import { Card, PrimaryButton, TextButton } from '../src/components/ui';
import { AuthShell } from '../src/components/AuthShell';
import { SetupNotice } from '../src/components/SetupNotice';

const EMAIL_RE = /^\S+@\S+\.\S+$/;

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError('');
    if (!EMAIL_RE.test(email.trim())) {
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
    <AuthShell title="Forgot password?" sub="Enter your email and we will send you a reset link.">
      {!isSupabaseConfigured ? <SetupNotice /> : null}

      <Card>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          placeholderTextColor={COLORS.placeholder}
          onSubmitEditing={submit}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={styles.buttonWrap}>
          <PrimaryButton
            label={busy ? 'Sending…' : 'Send reset link'}
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
  label: { fontSize: 14, fontWeight: '700', marginTop: 12 },
  input: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.line,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 16,
    marginTop: 6,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  error: { color: COLORS.danger, fontSize: 13, marginTop: 10 },
  buttonWrap: { marginTop: 18 },
  links: { marginTop: 8 },
});
