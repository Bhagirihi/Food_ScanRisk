import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';

import { isSupabaseConfigured, supabase } from '../src/lib/supabase';
import { setGuest } from '../src/lib/session';
import { COLORS } from '../src/lib/theme';
import { Card, PrimaryButton, TextButton } from '../src/components/ui';
import { AuthShell } from '../src/components/AuthShell';
import { SetupNotice } from '../src/components/SetupNotice';

const EMAIL_RE = /^\S+@\S+\.\S+$/;

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
    <AuthShell title="Welcome back" sub="Log in to keep your scans in sync.">
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
        />
        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="Your password"
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          placeholderTextColor={COLORS.placeholder}
          onSubmitEditing={submit}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={styles.buttonWrap}>
          <PrimaryButton label={busy ? 'Logging in…' : 'Log in'} onPress={submit} disabled={busy} />
        </View>
        <TextButton label="Forgot password?" onPress={() => router.push('/forgot-password')} />
      </Card>

      <View style={styles.links}>
        <TextButton label="Create an account" onPress={() => router.push('/register')} />
        <TextButton label="Continue as guest" onPress={guest} />
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
