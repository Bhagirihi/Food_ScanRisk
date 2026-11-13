// Shown on auth screens when no Supabase project is configured yet.
// `compact` is a small dismissible one-line note (Register only) — the full
// box stays on Login / Forgot Password.

import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

export function SetupNotice({ compact }: { compact?: boolean }) {
  const [dismissed, setDismissed] = useState(false);
  if (compact) {
    if (dismissed) return null;
    return (
      <View style={styles.compactBox}>
        <MaterialIcons name="info-outline" size={16} color="#8A6D1B" />
        <Text style={styles.compactText} numberOfLines={2}>
          Sign-in is not connected yet — guest mode works.
        </Text>
        <Pressable onPress={() => setDismissed(true)} accessibilityLabel="Dismiss">
          <MaterialIcons name="close" size={16} color="#8A6D1B" />
        </Pressable>
      </View>
    );
  }
  return (
    <View style={styles.box}>
      <Text style={styles.title}>Sign-in is not connected yet</Text>
      <Text style={styles.body}>
        Add your Supabase project URL and anon key (EXPO_PUBLIC_SUPABASE_URL /
        EXPO_PUBLIC_SUPABASE_ANON_KEY) and restart the app — or continue as a guest for now.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: '#FFF8E6',
    borderColor: '#F0D9A0',
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    padding: 12,
  },
  title: { fontSize: 14, fontWeight: '700' },
  body: { fontSize: 13, lineHeight: 18, marginTop: 4 },
  compactBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF8E6',
    borderColor: '#F0D9A0',
    borderRadius: 999,
    borderWidth: 1,
    marginBottom: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  compactText: { flex: 1, fontSize: 12, lineHeight: 16, color: '#5C4A12' },
});
