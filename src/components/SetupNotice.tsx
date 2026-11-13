// Shown on auth screens when no Supabase project is configured yet.

import { StyleSheet, Text, View } from 'react-native';

export function SetupNotice() {
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
});
