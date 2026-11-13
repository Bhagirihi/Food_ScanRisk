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

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

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
    <AuthShell title="Create an account" sub="One account for your scans, on any phone.">
      {!isSupabaseConfigured ? <SetupNotice /> : null}

      <Card>
        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Your name"
          autoCapitalize="words"
          placeholderTextColor={COLORS.placeholder}
        />
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
          placeholder="At least 6 characters"
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          placeholderTextColor={COLORS.placeholder}
          onSubmitEditing={submit}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={styles.buttonWrap}>
          <PrimaryButton
            label={busy ? 'Creating…' : 'Create account'}
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
